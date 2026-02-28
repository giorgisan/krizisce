/* pages/api/cron/update-trends.ts */
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType } from '@google/generative-ai'

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Popravljen log
  console.log("--- START update-trends (Structured JSON) ---");

  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let trends: string[] = []
  let summaryText = ''
  let usedModel = 'unknown'
  
  try {
    // 1. FETCH NEWS
    const { data: allNews, error } = await supabase
      .from('news')
      .select('title, contentsnippet, source')
      .neq('category', 'oglas')
      .neq('category', 'promo')
      .order('publishedat', { ascending: false })
      .limit(80)

    if (error) throw error
    if (!allNews || allNews.length === 0) {
        return res.status(200).json({ success: false, message: 'Baza je prazna.' })
    }

    // 2. PREPARE CONTENT
    const headlines = allNews.map(n => `- ${n.source}: ${n.title} ${n.contentsnippet ? `(${n.contentsnippet.substring(0, 100)}...)` : ''}`).join('\n');

    // 3. PROMPT (Očiščen navodil za formatiranje, ker imamo zdaj Shemo)
    const prompt = `
        Kot izkušen urednik slovenske medijske krajine, analiziraj spodnji seznam naslovov in podnaslovov POMEMBNIH novic (vsaka tema je pokrita z najmanj 2 viroma).
        
        Tvoja naloga je dvojna in mora biti opravljena z novinarsko natančnostjo:
        1. Ustvariti seznam trendov (#TemeDneva) za iskanje.
        2. Napisati kratek in jedrnat "executive summary" dogajanja.

        VHODNI PODATKI:
        ${headlines}

        --- 1. DEL: TRENDI (TAGI) ---
        CILJ: Ustvari 6-10 najbolj vročih in konkretnih tagov.
        STRATEGIJA:
        - Išči preseke: Teme, ki jih pokriva VEČ različnih medijev (več virov).
        - Bodi specifičen: #Pogačar (ne #Kolesarstvo), #Požar na Krasu (ne #Gasilci).
        - Uporabljaj samo samostalnike v imenovalniku (osnovna oblika).
        - Uporabljaj slovenski jezik in presledke (NE CamelCase).
        STROGO PREPOVEDANO PRI TAGIH:
        - Generične besede (#Novice, #Slovenija, #Svet, #Kronika).
        - Dolžina tagov (max 3 besede).
        - Izmišljene besede, ki jih ni v naslovih.

        --- 2. DEL: AI BRIEF (POVZETEK) ---
        CILJ: Napiši "Elevator Pitch" trenutnega dogajanja. Bralec ima 15 sekund.
        PRAVILA PISANJA:
        - DOLŽINA: Maksimalno 400 znakov. Nekaj kratkih stavkov.
        - STRUKTURA: Prvi stavek = Glavna tema dneva (udarno). Drugi stavek = Druga najpomembnejša tema ali zanimivost.
        - SLOG: Objektiven, telegrafski, brez mašil ("V današnjem dnevu...", "Poročajo, da..."). Samo bistvo.
        - VSEBINA: Fokusiraj se na dogodek, ne na medij. Ne omenjaj "RTV", "24ur" itd.
    `;
    
    // STROGA SHEMA (Ni več ročnega iskanja oklepajev '{')
    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        trends: {
          type: SchemaType.ARRAY,
          description: "Seznam 6-10 najbolj vročih trendov (tagov).",
          items: { type: SchemaType.STRING }
        },
        summary: {
          type: SchemaType.STRING,
          description: "Kratek in jedrnat summary dogajanja."
        }
      },
      required: ["trends", "summary"]
    };

    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.3,
    };

    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    const tryGenerate = async (modelName: string) => {
        const model = genAI.getGenerativeModel({ model: modelName, safetySettings, generationConfig });
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    }

    // --- LOGIKA PRIORITET (Usklajeno s tvojim API ključem) ---
    try {
        usedModel = "gemini-2.5-pro"; 
        console.log(`Poskušam ${usedModel}...`);
        const result = await tryGenerate(usedModel);
        trends = result.trends || [];
        summaryText = result.summary || '';
    } catch (err1: any) {
        console.warn(`⚠️ ${usedModel} failed. Trying gemini-2.5-flash...`);
        try {
            usedModel = "gemini-2.5-flash";
            const result = await tryGenerate(usedModel);
            trends = result.trends || [];
            summaryText = result.summary || '';
        } catch (err2: any) {
            console.error("❌ Both AI models failed in update-trends.");
            return res.status(500).json({ error: 'AI generation failed', details: err2.message });
        }
    }

    // 5. SAVE TO DATABASE
    if (Array.isArray(trends) && trends.length > 0) {
        const cleanTrends = trends
            .map((t: string) => {
                let tag = t.trim();
                if (!tag.startsWith('#')) tag = `#${tag}`;
                return tag; 
            })
            .filter(t => t.length > 3)
            .slice(0, 12);

        const { error: insertError } = await supabase
          .from('trending_ai')
          .upsert({ 
              id: 1,
              words: cleanTrends, 
              summary: summaryText || null, 
              updated_at: new Date().toISOString() 
          }, { onConflict: 'id' }); 
        
        if (insertError) throw insertError
        return res.status(200).json({ success: true, used_model: usedModel, trends: cleanTrends, summary: summaryText })
    }

    return res.status(200).json({ success: false, message: 'AI je vrnil prazen rezultat.' })

  } catch (error: any) {
    console.error('Critical Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
