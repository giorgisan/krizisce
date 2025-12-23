import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Preverjanje avtorizacije (odkomentiraj za produkcijo)
  if (req.query.key !== process.env.CRON_SECRET) {
      // return res.status(401).json({ error: 'Unauthorized' });
  }

  let trends: string[] = []
  
  // Pomožna funkcija za pridobivanje novic
  const fetchNews = async (hours: number) => {
    const timeLimit = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    const { data } = await supabase
      .from('news')
      .select('title')
      .gt('publishedat', timeLimit) 
      .neq('category', 'oglas')
      .neq('category', 'promo')
      .order('publishedat', { ascending: false })
      .limit(60)
      
    return data || []
  }

  try {
    // 1. POSKUS: Zadnjih 8 ur
    let news = await fetchNews(8)
    console.log(`Najdenih novic (8h): ${news.length}`)

    // 2. POSKUS: Če je premalo novic, glej nazaj 24 ur (da AI dobi vsaj nekaj materiala)
    if (news.length < 5) {
        console.log("Premalo novic v 8h, širim na 24h...")
        news = await fetchNews(24)
    }

    // Če še vedno ni dovolj novic, odnehaj (brez bednega fallbacka)
    if (!news || news.length < 3) {
        return res.status(200).json({ success: false, message: 'Premalo novic za analizo', count: news.length })
    }

    // Priprava naslovov
    const headlines = news.map(n => `- ${n.title}`).join('\n')

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
        
        const prompt = `
          Analiziraj te naslove in izlušči 6 do 8 trenutno najbolj vročih tem.
          Naslovi:
          ${headlines}

          NAVODILA (STROGO UPOŠTEVAJ):
          1. Vrni SAMO JSON array stringov.
          2. Vsak element se začne z lojtro (#).
          3. NE ZDRUŽUJ BESED (CamelCase prepovedan). Uporabi presledke (#Luka Dončić).
          4. IZJEMNO POMEMBNO - DOBESEDNOST:
              - Uporabljaj IZKLJUČNO besede, ki se pojavijo v naslovu. Ne išči sopomenk!
              - Bodi kot papiga: kopiraj ključne samostalnike iz naslova.
          5. PRIORITETA:
              - Imena oseb.
              - Kratice.
              - Imena podjetij/produktov.
          6. Max 3 besede na tag.
          7. Ne vključuj besed, kot so "umrl", "letos", "nov", razen če so del imena.
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
        // Tukaj se ustavimo. Če AI ne dela, nočemo SQL fallbacka.
        return res.status(500).json({ error: 'AI generation failed', details: aiError.message })
    }

    // SHRANI SAMO ČE IMAMO REZULTATE
    if (trends.length > 0) {
        // Filtriraj morebitne čudne tage (npr. samo "#")
        trends = trends.filter(t => t.length > 2)

        const { error } = await supabase
          .from('trending_ai')
          .upsert({ id: 1, words: trends, updated_at: new Date().toISOString() })
        
        if (error) throw error
        
        return res.status(200).json({ success: true, source: 'AI', count: trends.length, trends })
    } else {
        return res.status(200).json({ success: false, message: 'AI ni vrnil uporabnih trendov' })
    }

  } catch (error: any) {
    console.error('Critical Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
