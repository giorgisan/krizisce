import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    const { data: news } = await supabase
      .from('news')
      .select('title')
      .gt('publishedat', Date.now() - 8 * 60 * 60 * 1000) 
      .order('publishedat', { ascending: false })
      .limit(60)

    if (news && news.length >= 5) {
        const headlines = news.map(n => `- ${n.title}`).join('\n')

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" })
            
            // --- POPRAVLJEN PROMPT ---
            const prompt = `
              Analiziraj te naslove in izlušči 4 do 6 trenutno najbolj vročih tem.
              Naslovi:
              ${headlines}

              NAVODILA (STROGO UPOŠTEVAJ):
              1. Vrni SAMO JSON array stringov.
              2. Vsak element se začne z lojtro (#).
              3. NE ZDRUŽUJ BESED (CamelCase prepovedan). Uporabi presledke (#Luka Dončić).
              4. IZJEMNO POMEMBNO: Teme morajo temeljiti IZKLJUČNO na zgornjih naslovih. 
                 - Ne dodajaj splošnih zimskih tem (npr. "smučanje", "pelete"), če o njih ni konkretne novice v zgornjem seznamu.
                 - Če ni dovolj vročih tem, raje vrni manj tagov (npr. samo 3), kot da si izmišljuješ.
              5. Max 3 besede na tag.
            `
            // -------------------------

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
        }
    }

    // SQL FALLBACK
    if (trends.length === 0) {
        source = 'SQL_FALLBACK'
        const { data: sqlData } = await supabase.rpc('get_trending_words', {
            hours_lookback: 24,
            limit_count: 8
        })
        if (sqlData) {
            trends = sqlData.map((item: any) => {
                const word = item.word.charAt(0).toUpperCase() + item.word.slice(1)
                return `#${word}`
            })
        }
    }

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
