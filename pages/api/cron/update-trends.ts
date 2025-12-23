import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Preverjanje varnosti (za cron)
  const authHeader = req.headers.authorization;
  if (
      req.query.key !== process.env.CRON_SECRET && 
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
      // return res.status(401).json({ error: 'Unauthorized' });
  }

  let trends: string[] = []
  let source = 'AI'

  try {
    // 1. DOBI NOVICE ZADNJIH 8 UR
    const { data: news } = await supabase
      .from('news')
      .select('title')
      .gt('publishedat', Date.now() - 8 * 60 * 60 * 1000) 
      .order('publishedat', { ascending: false })
      .limit(60)

    // Če je premalo novic za AI, bomo uporabili SQL fallback spodaj
    if (news && news.length >= 5) {
        const headlines = news.map(n => `- ${n.title}`).join('\n')

        // 2. POSKUSI Z AI (Uporabljamo stabilen alias)
        try {
            // Uporabimo 'gemini-flash-latest', ki je bil na tvojem seznamu in je najbolj robusten
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" })
            
            const prompt = `
              Analiziraj te naslove in izlušči 5 do 7 trenutno najbolj vročih tem.
              Naslovi:
              ${headlines}

              Navodila:
              1. Vrni SAMO JSON array stringov. Primer: ["#Volitve2025", "#Dončić", "#Požar"].
              2. Uporabi slovenski jezik.
              3. Združi sorodne novice.
              4. Bodi kratek (max 2 besedi).
              5. STROGO PREPOVEDANO: Ne uporabljaj vejic ali pik znotraj hashtaga (npr. "#Kriminal, Droge" NI DOVOLJENO). Uporabi raje ločene tage ali pa samo glavno besedo.
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
            console.error("⚠️ AI napaka (uporabljam fallback):", aiError.message)
            source = 'SQL_FALLBACK'
            // Če AI spodleti, pustimo 'trends' prazen, da se sproži SQL logika spodaj
        }
    }

    // 3. SQL FALLBACK (Če AI ni delal ali je bilo premalo novic)
    if (trends.length === 0) {
        console.log("🔄 Izvajam SQL Fallback...")
        source = 'SQL_FALLBACK'
        
        // Pokličemo tvojo SQL funkcijo direktno
        const { data: sqlData } = await supabase.rpc('get_trending_words', {
            hours_lookback: 24, // Malo širše okno za varnost
            limit_count: 8
        })

        if (sqlData) {
            // Pretvorimo SQL format {word: 'dončić', count: 5} v ["#Dončić"]
            trends = sqlData.map((item: any) => {
                // Dodamo lojtro in naredimo prvo črko veliko (lepše izgleda)
                const word = item.word.charAt(0).toUpperCase() + item.word.slice(1)
                return `#${word}`
            })
        }
    }

    // 4. SHRANI V BAZO (Ne glede na to, od kod so prišli podatki)
    // Tako frontend vedno samo bere iz te tabele in je super hiter
    if (trends.length > 0) {
        const { error } = await supabase
          .from('trending_ai')
          .upsert({ id: 1, words: trends, updated_at: new Date().toISOString() })

        if (error) throw error
    }

    return res.status(200).json({ success: true, source, count: trends.length, trends })

  } catch (error: any) {
    console.error('Critical Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
