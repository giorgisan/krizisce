import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Preverjanje avtorizacije (odkomentiraj v produkciji)
  if (req.query.key !== process.env.CRON_SECRET) {
      // return res.status(401).json({ error: 'Unauthorized' });
  }

  let trends: string[] = []
  let usedModel = 'unknown'
  
  try {
    // 1. ZAJEM NOVIC: Povečamo limit na 100, da lažje najdemo prekrivanja med mediji
    const { data: allNews, error } = await supabase
      .from('news')
      .select('title, publishedat, source') // Rabimo tudi 'source' za analizo!
      .neq('category', 'oglas')
      .neq('category', 'promo')
      .order('publishedat', { ascending: false })
      .limit(100)

    if (error) throw error
    if (!allNews || allNews.length === 0) {
        return res.status(200).json({ success: false, message: 'Baza je prazna.' })
    }

    // 2. FILTRIRANJE (Zadnjih 24 ur)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
    let recentNews = allNews.filter(n => new Date(n.publishedat) > cutoffTime)

    // Fallback: če je premalo novic, vzemi zadnjih 20
    if (recentNews.length < 10) {
        recentNews = allNews.slice(0, 20);
    }

    // 3. PRIPRAVA VSEBINE (Vključimo vir, da AI vidi, kdo poroča)
    // Format: "N1: Naslov novice"
    const headlines = recentNews.map(n => `- ${n.source}: ${n.title}`).join('\n')

    // 4. PAMETNEJŠI PROMPT
    const prompt = `
        Analiziraj seznam naslovov in izlušči 5 do 8 VROČIH TEM.
        Seznam novic:
        ${headlines}

        NAVODILA ZA IZBOR (KRITERIJI):
        1. TEMA MORA BITI "VROČA": O njej morata poročati VSAJ 2 RAZLIČNA MEDIJA (viri).
        2. OSREDOTOČI SE NA DOGODKE ZADNJIH UR.

        NAVODILA ZA OBLIKOVANJE (STROGO):
        1. Vrni SAMO JSON array stringov.
        2. Vsak element se začne z lojtro (#).
        3. SKLANJATEV: Vse besede pretvori v OSNOVNO OBLIKO (Imenovalnik ednine).
           - NE: #Beletrine, #Ljubljani
           - DA: #Beletrina, #Ljubljana
        4. OPTIMIZACIJA ZA ISKANJE (KLJUČNO):
           - Tagi naj bodo KRATKI (max 2 besedi).
           - Ne vključuj glagolov ("tožijo", "obsodili", "umrl").
           - Uporabi samo ključni samostalnik, ki ga bodo ljudje iskali.
           - Primer: Namesto "#Avtobusna postaja tožba" vrni raje samo "#Avtobusna postaja". 
             (Ker iskalnik morda ne bo našel besede "tožba" v vseh naslovih).
           - Primer: Namesto "#50 let zapora" vrni "#Umor v šoli" ali "#Sodba".
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

    // 5. GENERIRANJE
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

    // 6. SHRANJEVANJE
    if (Array.isArray(trends) && trends.length > 0) {
        // Dodatno čiščenje v kodi
        trends = trends
            .map(t => t.startsWith('#') ? t : `#${t}`)
            .filter(t => t.length > 2)
            .slice(0, 8); // Max 8 tagov

        const { error } = await supabase
          .from('trending_ai')
          .upsert({ id: 1, words: trends, updated_at: new Date().toISOString() })
        
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
