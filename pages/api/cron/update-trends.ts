/* pages/api/cron/update-trends.ts */
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

// Set max duration to 60 seconds to prevent timeouts
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // DEBUG LOG
  console.log("--- START update-trends (Version: Gemini 2.0 Flash Primary) ---");

  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const hour = (new Date().getUTCHours() + 1) % 24;
  if (hour >= 23 || hour < 5) {
    console.log("Nightly pause active.");
    return res.status(200).json({ success: true, message: 'Nočni premor.' });
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

    // 3. IMPROVED PROMPT
    const prompt = `
        Kot izkušen in strog urednik slovenskega novičarskega portala analiziraj spodnji seznam naslovov zadnjih novic.
        Tvoja naloga je dvojna in mora biti opravljena z novinarsko natančnostjo:
        1. Ustvariti seznam trendov (#TemeDneva) za iskanje.
        2. Napisati izjemno kratek in jedrnat "executive summary" dogajanja.

        VHODNI PODATKI:
        ${headlines}

        --- 1. DEL: TRENDI (TAGI) ---
        CILJ: Ustvari 6-10 najbolj vročih in konkretnih tagov.
        
        STRATEGIJA:
        - Išči preseke: Teme, ki jih pokriva VEČ različnih medijev hkrati.
        - Bodi specifičen: #Pogačar (ne #Kolesarstvo), #Požar na Krasu (ne #Gasilci).
        - Uporabljaj samo samostalnike v imenovalniku (osnovna oblika).
        - Uporabljaj slovenski jezik in presledke (NE CamelCase).
        
        STROGO PREPOVEDANO PRI TAGIH:
        - Generične besede (#Novice, #Slovenija, #Svet, #Kronika).
        - Dolžina tagov (max 3 besede).
        - Izmišljene besede, ki jih ni v naslovih.

        --- 2. DEL: AI BRIEF (POVZETEK) ---
        CILJ: Napiši "Elevator Pitch" trenutnega dogajanja. Bralec ima le 10 sekund.
        
        PRAVILA PISANJA:
        - DOLŽINA: Maksimalno 400 znakov. To so približno 2-3 kratki stavki.
        - STRUKTURA: Prvi stavek = Glavna tema dneva (udarno). Drugi stavek = Druga najpomembnejša tema ali zanimivost. Tretji stavek po potrebi.
        - SLOG: Objektiven, telegrafski, brez mašil ("V današnjem dnevu...", "Poročajo, da..."). Samo bistvo.
        - VSEBINA: Fokusiraj se na dogodek, ne na medij. Ne omenjaj "RTV", "24ur" itd.

        --- FORMAT IZHODA (JSON) ---
        Vrni IZKLJUČNO validen JSON objekt (brez markdowna \`\`\`json in brez dodatnega teksta):
        {
          "trends": ["#Tag1", "#Tag2", ...],
          "summary": "Kratek tekst povzetka."
        }
    `;
    
    // Generator function
    const tryGenerate = async (modelName: string) => {
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        })
        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        
        // JSON Parsing
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd === -1) {
             // Fallback: Check for array if object not found
             const arrStart = responseText.indexOf('[');
             const arrEnd = responseText.lastIndexOf(']') + 1;
             if (arrStart !== -1 && arrEnd !== -1) {
                 const arrJson = responseText.substring(arrStart, arrEnd);
                 return { trends: JSON.parse(arrJson), summary: '' };
             }
             throw new Error("JSON structure not found");
        }

        const cleanJson = responseText.substring(jsonStart, jsonEnd);
        return JSON.parse(cleanJson);
    }

    // 4. MODEL SELECTION LOGIC
    try {
        console.log("Poskušam models/gemini-2.0-flash...");
        usedModel = "models/gemini-2.0-flash"; 
        const result = await tryGenerate(usedModel);
        trends = result.trends || [];
        summaryText = result.summary || '';
    } catch (err1: any) {
        console.warn(`⚠️ Gemini 2.0 Flash failed (${err1.message}), trying 2.0 Flash Lite...`);
        try {
            usedModel = "models/gemini-2.0-flash-lite";
            const result = await tryGenerate(usedModel);
            trends = result.trends || [];
            summaryText = result.summary || '';
        } catch (err2: any) {
            console.warn(`⚠️ Gemini 2.0 Flash Lite failed, trying gemini-flash-latest...`);
            try {
                usedModel = "gemini-flash-latest";
                const result = await tryGenerate(usedModel);
                trends = result.trends || [];
                summaryText = result.summary || '';
            } catch (err3: any) {
                return res.status(500).json({ error: 'AI generation failed', details: err3.message });
            }
        }
    }

    // 5. SAVE TO DATABASE
    if (Array.isArray(trends) && trends.length > 0) {
        // Clean trends
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
          .insert({ 
              words: cleanTrends, 
              summary: summaryText || null, 
              updated_at: new Date().toISOString() 
          });
        
        if (insertError) throw insertError
        
        return res.status(200).json({ success: true, used_model: usedModel, trends: cleanTrends, summary: summaryText })
    }

    return res.status(200).json({ success: false, message: 'AI je vrnil prazen rezultat.' })

  } catch (error: any) {
    console.error('Critical Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
