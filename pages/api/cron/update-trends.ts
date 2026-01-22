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
      // return res.status(401).json({ error: 'Unauthorized' });
  }

  let trends: string[] = []
  let usedModel = 'unknown'
  
  try {
    // 1. ZAJEM NOVIC (100 zadnjih)
    const { data: allNews, error } = await supabase
      .from('news')
      .select('title, publishedat, source')
      .neq('category', 'oglas')
      .neq('category', 'promo')
      .order('publishedat', { ascending: false })
      .limit(100)

    if (error) throw error
    if (!allNews || allNews.length === 0) {
        return res.status(200).json({ success: false, message: 'Baza je prazna.' })
    }

    // 2. FILTRIRANJE (24 ur)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
    let recentNews = allNews.filter(n => new Date(n.publishedat) > cutoffTime)

    // Fallback: če je premalo novic
    if (recentNews.length < 10) {
        recentNews = allNews.slice(0, 20);
    }

    // 3. PRIPRAVA VSEBINE
    const headlines = recentNews.map(n => `- ${n.source}: ${n.title}`).join('\n')

    // 4. PROMPT
    const prompt = `
        Analiziraj spodnji seznam naslovov in povzetkov ter izlušči seznam "Trending" tagov.
        
        PODATKI:
        ${headlines}

        KRITERIJI ZA IZBOR:
        1. TEMA MORA BITI "VROČA": O njej morata pisati vsaj 2 RAZLIČNA vira.
        2. ČE NI VSAJ 2 RAZLIČNIH VIROV, TE TEME NE IZPIŠI.
        
        NAVODILA ZA OBLIKOVANJE (STROGO!!):
        1. Vrni SAMO JSON array stringov.
        2. Vsak element se začne z lojtro (#).
        3. PRESLEDKI (NAJPOMEMBNEJE): 
            - Če je tag sestavljen iz več besed, MED NJIMI PUSTI PRESLEDEK.
            - NE ZDRUŽUJ BESED.
            - NE: "#LukaDončić", "#JavnoZdravstvo", "#RusijaUkrajina"
            - DA: "#Luka Dončić", "#Javno zdravstvo", "#Rusija Ukrajina"
        4. IZVOR BESED: 
            - Uporabi BESEDE, KI SO DEJANSKO V NASLOVIH.
            - Besede postavi v osnovno obliko (imenovalnik).
        5. DOLŽINA: 
            - Tag naj ima NAJVEČ 3 besede.
        
        CILJ: Vrni do 7 kratkih, jedrnatih tagov s presledki.
    `
    
    // Funkcija za klic AI modela
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
        const cleanJson = responseText.replace(/```json|```/g, '').trim()
        return JSON.parse(cleanJson)
    }

    // 5. GENERIRANJE (Optimizirano za kvote)
    try {
        // PRVA IZBIRA: gemini-2.5-flash-lite
        // Zakaj? Ker imaš pri tem modelu še prosto kvoto, medtem ko je navaden flash poln.
        console.log("Poskušam gemini-2.5-flash-lite...");
        trends = await tryGenerate("gemini-2.5-flash-lite");
        usedModel = "gemini-2.5-flash-lite";
    } catch (err1: any) {
        console.warn(`⚠️ Lite verzija ni uspela, preklapljam na navaden Flash...`, err1.message);
        try {
            // FALLBACK: gemini-2.5-flash
            // Uporabimo samo, če Lite ne dela, saj je ta kvota verjetno polna.
            trends = await tryGenerate("gemini-2.5-flash");
            usedModel = "gemini-2.5-flash";
        } catch (err2: any) {
            console.error("❌ Vsi modeli odpovedali. Preveri Google Cloud Quotas.");
            return res.status(500).json({ error: 'AI generation failed', details: err2.message });
        }
    }

    // 6. SHRANJEVANJE (ZGODOVINA)
    if (Array.isArray(trends) && trends.length > 0) {
        trends = trends
            .map(t => {
                // Zagotovimo lojtro in format
                let tag = t.startsWith('#') ? t : `#${t}`;
                return tag; 
            })
            .filter(t => t.length > 2)
            .slice(0, 8);

        const { error } = await supabase
          .from('trending_ai')
          .insert({ 
             words: trends, 
             updated_at: new Date().toISOString() 
          })
        
        if (error) throw error
        
        return res.status(200).json({ 
            success: true, 
            used_model: usedModel, 
            count: trends.length, 
            trends 
        })
    } 

    return res.status(200).json({ success: false, message: 'AI je vrnil prazen rezultat.' })

  } catch (error: any) {
    console.error('Critical Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
