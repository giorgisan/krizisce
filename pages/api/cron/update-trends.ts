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
        Analiziraj te naslove in izlušči do 6 trenutno najbolj vročih tem.
        Naslovi:
        ${headlines}

        KRITERIJI ZA IZBOR:
        1. TEMA JE "VROČA", ČE O NJEJ PIŠETA VSAJ 2 RAZLIČNA MEDIJA (preveri vire).
        2. FOKUS: Dogodki zadnjih ur.
        
        NAVODILA ZA OBLIKOVANJE (STROGO UPOŠTEVAJ):
        1. Vrni SAMO JSON array stringov.
        2. Vsak element se začne z lojtro (#).
        3. NE ZDRUŽUJ BESED (CamelCase prepovedan). Uporabi presledke (#Luka Dončić).
        4. IZVOR BESED (Bistveno):
            - Teme črpaj IZKLJUČNO iz vsebine naslovov. Ne izmišljuj si tem.
        5. OBLIKA in SKLANJATEV (Normalizacija):
            - Vse besede OBVEZNO pretvori v OSNOVNO OBLIKO (Imenovalnik ednine).
            - Primer: Če naslov pravi "Požar v Beletrini", mora biti tag "#Beletrina".
            - Primer: "Sodba Janši" -> "#Janša" ali "#Sodba".
        6. PRIORITETA:
            - Imena oseb, Kratice, Podjetja, Kraji.
        7. DOLŽINA:
            - Tagi naj bodo KRATKI (max 2 besedi). To je ključno za iskanje.
            - Namesto "#Ruski napad na Ukrajino" vrni "#Ukrajina".
        8. PREPOVEDANO:
            - Brez glagolov ("tožijo", "zmagal", "umrl").
            - Brez splošnih pridevnikov ("velika", "znana"), razen če so del imena.
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
