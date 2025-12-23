import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
    // 1. KORAK: DOBI ZADNJIH 60 NOVIC (NEGLEDE NA DATUM)
    // Filtriranje datuma delamo v JS, ker je bolj zanesljivo kot SQL primerjave stringov
    const { data: allNews, error } = await supabase
      .from('news')
      .select('title, publishedat, category') // Rabimo publishedat za preverjanje!
      .neq('category', 'oglas')
      .neq('category', 'promo')
      .order('publishedat', { ascending: false })
      .limit(60)

    if (error) throw error
    if (!allNews || allNews.length === 0) {
        return res.status(200).json({ success: false, message: 'Baza je popolnoma prazna.' })
    }

    // DEBUG: Poglejmo, kdaj je bila objavljena zadnja novica
    const latestNewsDate = new Date(allNews[0].publishedat)
    console.log(`Zadnja novica v bazi je iz: ${latestNewsDate.toLocaleString()}`)

    // 2. KORAK: FILTRIRANJE V JAVASCRIPTU (24 ur)
    // To je bolj varno pred časovnimi pasovi
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 ur nazaj
    
    let recentNews = allNews.filter(n => {
        const newsDate = new Date(n.publishedat)
        return newsDate > cutoffTime
    })

    console.log(`Število novic v zadnjih 24h: ${recentNews.length}`)

    // Če je novic premalo (manj kot 5), poskusimo vzeti kar tistih 60, ki smo jih dobili,
    // če niso starejše od 48 ur. Bolje nekaj kot nič.
    if (recentNews.length < 5) {
        const cutoff48 = new Date(Date.now() - 48 * 60 * 60 * 1000)
        recentNews = allNews.filter(n => new Date(n.publishedat) > cutoff48)
        console.log(`Širim na 48h, novo število: ${recentNews.length}`)
    }

    // Če še vedno ni nič, potem scraper verjetno ne dela
    if (recentNews.length < 3) {
        return res.status(200).json({ 
            success: false, 
            message: 'Premalo svežih novic. Preveri scraper.',
            latest_news_date: latestNewsDate.toISOString(),
            count_24h: recentNews.length
        })
    }

    // 3. KORAK: PRIPRAVA ZA AI
    const headlines = recentNews.map(n => `- ${n.title}`).join('\n')

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
        
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
        return res.status(500).json({ error: 'AI generation failed', details: aiError.message })
    }

    // 4. KORAK: SHRANJEVANJE
    if (trends.length > 0) {
        trends = trends.filter(t => t.length > 2)

        const { error } = await supabase
          .from('trending_ai')
          .upsert({ id: 1, words: trends, updated_at: new Date().toISOString() })
        
        if (error) throw error
        
        return res.status(200).json({ success: true, count: trends.length, trends })
    } else {
        return res.status(200).json({ success: false, message: 'AI ni vrnil trendov' })
    }

  } catch (error: any) {
    console.error('Critical Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
