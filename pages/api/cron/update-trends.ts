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

    // 4. OPTIMIZIRAN PROMPT
    const prompt = `
        Kot urednik novičarskega portala analiziraj spodnji seznam naslovov in izlušči seznam trenutno najbolj vročih tem (#Trending).
        
        VHODNI PODATKI (Naslovi zadnjih 100 novic):
        ${headlines}

        PRAVILA ZA IZBOR (KRITERIJI):
        1. RELEVANTNOST: Tema mora biti omenjena v vsaj 3 RAZLIČNIH virih (npr. Delo, RTV in 24ur pišeta o isti stvari).
        2. UNIKATNOST: Ne podvajaj tem (npr. ne izpiši hkrati "#Volitve" in "#Rezultati volitev").
        3. ČE NI VSAJ 3 VIROV, TEME NE IZPIŠI.

        PRAVILA ZA OBLIKOVANJE (STROGO!!):
        1. IZHOD: Vrni SAMO čisti JSON array stringov. Brez markdowna, brez "json" oznak.
        2. FORMAT: Vsak tag se začne z lojtro (#).
        3. PRESLEDKI SO OBVEZNI:
           - PREPOVEDANO: Združevanje besed (CamelCase).
           - PREPOVEDANO: "#LukaDončić", "#VladaRS", "#VojnaVUkrajini"
           - PRAVILNO: "#Luka Dončić", "#Vlada RS", "#Vojna v Ukrajini"
        4. JEZIK IN OBLIKA:
           - Uporabi slovenski jezik.
           - Besede naj bodo v osnovni obliki (imenovalnik), razen če kontekst zahteva drugače.
           - Ne uporabljaj narekovajev znotraj taga.
           - Uporabljal le izraze, ki se pojavijo v novici (naslov, opis)
        5. DOLŽINA:
           - Idealno: 2 besedi na tag.
           - Največ: 3 besede (samo za zelo specifične dogodke).
        
        CILJ: Vrni točno 5 do 7 najbolj relevantnih tagov.
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

    // 5. GENERIRANJE (Spremenjen vrstni red: Lite -> Flash)
    try {
        // PRVI POSKUS: Lite (varčnejši z kvoto)
        console.log("Poskušam gemini-2.5-flash-lite...");
        trends = await tryGenerate("gemini-2.5-flash-lite");
        usedModel = "gemini-2.5-flash-lite";
    } catch (err1: any) {
        console.warn(`⚠️ Lite verzija ni uspela, preklapljam na navaden Flash...`, err1.message);
        try {
            // DRUGI POSKUS: Flash (močnejši, a bolj omejen)
            trends = await tryGenerate("gemini-2.5-flash");
            usedModel = "gemini-2.5-flash";
        } catch (err2: any) {
            console.error("❌ Vsi modeli odpovedali.");
            return res.status(500).json({ error: 'AI generation failed', details: err2.message });
        }
    }

    // 6. SHRANJEVANJE (ZGODOVINA)
    if (Array.isArray(trends) && trends.length > 0) {
        trends = trends
            .map(t => {
                // Zagotovimo lojtro in odstranimo morebitne odvečne presledke
                let tag = t.trim();
                if (!tag.startsWith('#')) tag = `#${tag}`;
                return tag; 
            })
            .filter(t => t.length > 3) // Malo strožji filter za smeti
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
