import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Varnostno preverjanje
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let trends: string[] = []
  let usedModel = 'unknown'
  
  try {
    // --- 1. PREVERJANJE ŠTEVILA DANAŠNJIH KLICEV ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('trending_ai')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', today.toISOString());

    const dailyCount = count || 0;

    // --- 2. ZAJEM NOVIC ---
    const { data: allNews, error } = await supabase
      .from('news')
      .select('title, publishedat, source')
      .neq('category', 'oglas')
      .neq('category', 'promo')
      .order('publishedat', { ascending: false })
      .limit(200)

    if (error) throw error
    if (!allNews || allNews.length === 0) {
        return res.status(200).json({ success: false, message: 'Baza je prazna.' })
    }

    const headlines = allNews.map(n => `- ${n.source}: ${n.title}`).join('\n')

    // --- 3. PRIPRAVA PROMPTA ---
    const prompt = `
        Kot izkušen urednik slovenskega novičarskega portala analiziraj spodnji seznam naslovov zadnjih novic.
        Tvoja naloga je ustvariti dinamičen in raznolik seznam trendov (#TemeDneva), ki so trenutno najbolj aktualni.

        VHODNI PODATKI:
        ${headlines}

        STRATEGIJA IZBORA:
        1. RELEVANTNOST: Izpostavi teme, o katerih piše več različnih virov (npr. RTV, 24ur, Delo, Siol).
        2. BREZ PODVAJANJA: Ne ustvarjaj vsebinsko podobnih tagov.
        3. SVEŽINA: Če opaziš izreden dogodek (npr. zmaga, nesreča, pomembna odločitev), naj bo ta na vrhu.

        PRAVILA OBLIKOVANJA (STROGO):
        - Vrni IZKLJUČNO JSON array stringov: ["#Tag1", "#Tag2", ...]
        - Vsak tag se mora začeti z lojtro (#).
        - Uporabljaj slovenski jezik in presledke (NE CamelCase).
        - Dolžina: 1 do 3 besede na tag.
        - Besede naj bodo v osnovni obliki (imenovalnik).

        CILJ: Vrni med 6 in 12 najbolj relevantnih tagov za premikajoči se trak.
    `
    
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
        
        const jsonStart = responseText.indexOf('[');
        const jsonEnd = responseText.lastIndexOf(']') + 1;
        const cleanJson = responseText.substring(jsonStart, jsonEnd);
        
        return JSON.parse(cleanJson)
    }

    // --- 4. GENERIRANJE Z LOGIKO PREKLOPA ---
    // Logika: 
    // - Če je < 15 klicev: poskusi Lite -> fallback na Flash
    // - Če je >= 15 klicev: poskusi direktno Flash -> fallback na (nič/error) ali stari Flash
    
    if (dailyCount < 15) {
        // SCENARIJ A: Varčujemo (Lite first)
        try {
            console.log("Poskušam gemini-1.5-flash-lite...");
            trends = await tryGenerate("gemini-1.5-flash-lite");
            usedModel = "gemini-1.5-flash-lite";
        } catch (err1: any) {
            console.warn(`⚠️ Lite verzija ni uspela (${err1.message}), preklapljam na Flash...`);
            try {
                trends = await tryGenerate("gemini-1.5-flash");
                usedModel = "gemini-1.5-flash";
            } catch (err2) {
                 throw new Error("Vsi modeli so odpovedali (Lite in Flash).");
            }
        }
    } else {
        // SCENARIJ B: Smo čez limit za Lite, gremo direktno na Flash
        console.log("Limit 15 dosežen, uporabljam direktno Flash...");
        try {
            trends = await tryGenerate("gemini-1.5-flash");
            usedModel = "gemini-1.5-flash";
        } catch (err1) {
             throw new Error("Flash model je odpovedal.");
        }
    }

    // --- 5. SHRANJEVANJE ---
    if (Array.isArray(trends) && trends.length > 0) {
        trends = trends
            .map(t => {
                let tag = t.trim();
                if (!tag.startsWith('#')) tag = `#${tag}`;
                return tag; 
            })
            .filter(t => t.length > 3)
            .slice(0, 12);

        const { error: insertError } = await supabase
          .from('trending_ai')
          .insert({ 
             words: trends, 
             updated_at: new Date().toISOString() 
          })
        
        if (insertError) throw insertError
        
        return res.status(200).json({ 
            success: true, 
            used_model: usedModel, 
            count: trends.length,
            daily_count: dailyCount,
            trends 
        })
    } 

    return res.status(200).json({ success: false, message: 'AI je vrnil prazen rezultat.' })

  } catch (error: any) {
    console.error('Critical Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
