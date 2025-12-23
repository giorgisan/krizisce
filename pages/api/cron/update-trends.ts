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
    // 1. KORAK: DOBI NOVICE
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

    // 2. KORAK: FILTRIRANJE (24 ur)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    let recentNews = allNews.filter(n => {
        const newsDate = new Date(n.publishedat)
        return newsDate > cutoffTime
    })

    // Fallback: če je premalo novic, vzemi zadnjih 15 neglede na čas
    if (recentNews.length < 5) {
        recentNews = allNews.slice(0, 15);
    }

    // 3. KORAK: AI GENERIRANJE
    const headlines = recentNews.map(n => `- ${n.title}`).join('\n')

    try {
        // Uporabljamo 1.5-flash z izklopljenimi varovali
        // (Da ne blokira novic o nesrečah/kriminalu)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        })
        
        const prompt = `
            Analiziraj te naslove in izlušči 4 do 6 trenutno najbolj vročih tem.
            Naslovi:
            ${headlines}

            NAVODILA (STROGO UPOŠTEVAJ):
            1. Vrni SAMO JSON array stringov.
            2. Vsak element se začne z lojtro (#).
            3. NE ZDRUŽUJ BESED (CamelCase prepovedan). Uporabi presledke (#Luka Dončić).
            4. IZJEMNO POMEMBNO - DOBESEDNOST:
                - Uporabljaj IZKLJUČNO besede, ki se pojavijo v naslovu. Ne išči sopomenk!
                - Če v naslovu piše "ustvarjalec", NE smeš napisati "razvijalec".
                - Če v naslovu piše "gripe", NE smeš napisati "bolezni".
                - Bodi kot papiga: kopiraj ključne samostalnike iz naslova.
                - Če ni dovolj vročih tem, raje vrni manj tagov (npr. samo 3), kot da si izmišljuješ.
            5. PRIORITETA:
                - Imena oseb (Luka Dončić, Trump, Vince Zampella).
                - Kratice (THC, ZDA, NPU).
                - Imena podjetij/produktov (Call of Duty, Lekarna).
            6. Ne dodajaj splošnih pridevnikov (npr. "prepovedana", "velika", "znana"), razen če so del lastnega imena.
            7. Max 3 besede na tag.
        `

        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        const cleanJson = responseText.replace(/```json|```/g, '').trim()
        
        const parsed = JSON.parse(cleanJson)
        
        if (Array.isArray(parsed) && parsed.length > 0) {
            trends = parsed
        } else {
            throw new Error('Prazen array iz AI')
        }

    } catch (aiError: any) {
        console.error("⚠️ AI napaka:", aiError.message)
        // Tukaj se ustavimo. Ni fallbacka.
        return res.status(500).json({ 
            success: false, 
            error: 'AI generation failed', 
            details: aiError.message 
        })
    }

    // 4. KORAK: SHRANJEVANJE (Samo če je AI uspel)
    if (trends.length > 0) {
        // Počistimo format
        trends = trends.map(t => t.startsWith('#') ? t : `#${t}`).filter(t => t.length > 2);

        const { error } = await supabase
          .from('trending_ai')
          .upsert({ id: 1, words: trends, updated_at: new Date().toISOString() })
        
        if (error) throw error
        
        return res.status(200).json({ success: true, count: trends.length, trends })
    } 

    return res.status(200).json({ success: false, message: 'Neznana napaka (prazni trendi)' })

  } catch (error: any) {
    console.error('Critical Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
