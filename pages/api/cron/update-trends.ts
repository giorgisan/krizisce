import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Preverjanje avtorizacije
  if (req.query.key !== process.env.CRON_SECRET) {
      // return res.status(401).json({ error: 'Unauthorized' });
  }

  let trends: string[] = []
  
  try {
    // 1. ZAJEM NOVIC
    const { data: allNews, error } = await supabase
      .from('news')
      .select('title, publishedat, category')
      .neq('category', 'oglas')
      .neq('category', 'promo')
      .order('publishedat', { ascending: false })
      .limit(60)

    if (error) throw error
    if (!allNews || allNews.length === 0) {
        return res.status(200).json({ success: false, message: 'Baza je prazna.' })
    }

    // 2. FILTRIRANJE
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
    let recentNews = allNews.filter(n => new Date(n.publishedat) > cutoffTime)

    if (recentNews.length < 5) {
        recentNews = allNews.slice(0, 15);
    }

    // 3. PRIPRAVA VSEBINE
    const headlines = recentNews.map(n => `- ${n.title}`).join('\n')

    // TVOJ ORIGINALNI PROMPT
        const prompt = `
            Analiziraj te naslove in izlušči 3 do 6 trenutno najbolj vročih tem.
            Naslovi:
            ${headlines}

            NAVODILA (STROGO UPOŠTEVAJ):
            1. Vrni SAMO JSON array stringov.
            2. Vsak element se začne z lojtro (#).
            3. NE ZDRUŽUJ BESED (CamelCase prepovedan). Uporabi presledke (#Luka Dončić).
            4. IZJEMNO POMEMBNO - DOBESEDNOST:
                - Uporabljaj IZKLJUČNO besede, ki se pojavijo v naslovu.
                - Če v naslovu piše "ustvarjalec", NE smeš napisati "razvijalec".
            5. PRIORITETA:
                - Imena oseb (Luka Dončić, Trump, Vince Zampella).
                - Kratice (THC, ZDA, NPU).
                - Imena podjetij/produktov (Call of Duty, Lekarna).
            6. Ne dodajaj splošnih pridevnikov (npr. "prepovedana", "velika", "znana"), razen če so del lastnega imena.
            7. Max 3 besede na tag.
            8. SKLANJATEV (ODLOČILNO):
                - Vse besede pretvori v OSNOVNO OBLIKO (Imenovalnik ednine).
                - Primer: Namesto "Beletrine" (rodilnik) vrni "#Beletrina".
                - Primer: Namesto "Epsteinovi dosjeji" vrni "#Epstein" ali "#Epstein dosje".
                - Primer: Namesto "Ljubljanski" vrni "#Ljubljana".
        `

    // Pomožna funkcija za klic modela
    const tryGenerate = async (modelName: string) => {
        console.log(`Poskušam z modelom: ${modelName}...`);
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            safetySettings: [ // Izklopimo varovala za novice črne kronike
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

    // 4. GENERIRANJE (Z REZERVNIM PLANOM)
    try {
        // POSKUS 1: Tvoj primarni model iz seznama
        trends = await tryGenerate("gemini-2.5-flash");
    } catch (err1: any) {
        console.warn(`⚠️ gemini-2.5-flash odpovedal (${err1.message}). Preklapljam na Lite...`);
        try {
            // POSKUS 2: Rezervni model iz tvojega seznama
            trends = await tryGenerate("gemini-2.5-flash-lite");
        } catch (err2: any) {
            console.error("❌ Vsi modeli odpovedali. Ne posodabljam trendov.");
            // Tukaj se ustavimo. Brez 'smeti' fallbacka.
            return res.status(500).json({ error: 'AI generation failed', details: err2.message });
        }
    }

    // 5. SHRANJEVANJE
    if (Array.isArray(trends) && trends.length > 0) {
        trends = trends.map(t => t.startsWith('#') ? t : `#${t}`).filter(t => t.length > 2);

        const { error } = await supabase
          .from('trending_ai')
          .upsert({ id: 1, words: trends, updated_at: new Date().toISOString() })
        
        if (error) throw error
        
        return res.status(200).json({ success: true, count: trends.length, trends })
    } 

    return res.status(200).json({ success: false, message: 'AI je vrnil prazen rezultat.' })

  } catch (error: any) {
    console.error('Critical Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
