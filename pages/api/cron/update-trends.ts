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

    // 4. POPRAVLJEN PROMPT (Optimiziran za ujemanje s keywords v bazi)
    const prompt = `
        Analiziraj spodnji seznam naslovov in povzetkov ter izlušči seznam "Trending" tagov.
        
        PODATKI:
        ${headlines}

        KRITERIJI ZA IZBOR:
        1. TEMA MORA BITI "VROČA": O njej morata pisati vsaj 2 RAZLIČNA vira.
        2. ČE NI VSAJ 2 RAZLIČNIH VIROV, TE TEME NE IZPIŠI.
        
        NAVODILA ZA OBLIKOVANJE (STROGO!!):
        1. Vrni SAMO JSON array stringov (npr. ["#Tag1", "#Tag2"]).
        2. Vsak element se začne z lojtro (#).
        3. IZVOR BESED (NAJPOMEMBNEJE): 
           - Uporabi BESEDE, KI SO DEJANSKO V NASLOVIH (da jih iskalnik najde).
           - NE izmišljuj si sinonimov, ki jih ni v tekstu (npr. če piše "Dars", ne piši "#Avtoceste", ampak "#Dars").
           - Besede postavi v osnovno obliko (imenovalnik), da so lepe za branje (npr. iz "Požaru" naredi "#Požar").
        4. DOLŽINA: 
           - Tag naj ima NAJVEČ 3 besede.
           - NE: "#Društvo Srebrna nit opozarja"
           - DA: "#Srebrna nit"
        5. PREPOVEDANO:
           - Brez glagolov (opozarja, meni, pravi).
           - Brez ločil v tagu.
           - Brez angleških izrazov, če je tekst slovenski.
        
        CILJ: Vrni do 6 kratkih, jedrnatih tagov, ki so lepi za prikaz, a vsebujejo ključne besede iz teksta.
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
        const cleanJson = responseText.replace(/```json|```/g, '').trim()
        return JSON.parse(cleanJson)
    }

    // 5. GENERIRANJE (Fallback logika)
    try {
        trends = await tryGenerate("gemini-2.5-flash");
        usedModel = "gemini-2.5-flash";
    } catch (err1: any) {
        console.warn(`⚠️ Flash odpovedal, preklapljam na Lite...`);
        try {
            trends = await tryGenerate("gemini-2.5-flash-lite");
            usedModel = "gemini-2.5-flash-lite";
        } catch (err2: any) {
            console.error("❌ Vsi modeli odpovedali.");
            return res.status(500).json({ error: 'AI generation failed', details: err2.message });
        }
    }

    // 6. SHRANJEVANJE (ZGODOVINA)
    if (Array.isArray(trends) && trends.length > 0) {
        trends = trends
            .map(t => t.startsWith('#') ? t : `#${t}`)
            .filter(t => t.length > 2)
            .slice(0, 8);

        // SPREMEMBA: Uporabimo .insert() brez ID-ja -> baza ustvari novega
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
