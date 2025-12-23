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
  let source = 'AI'

  try {
    // 1. DOBI NOVICE ZADNJIH 8 UR
    const { data: news } = await supabase
      .from('news')
      .select('title')
      .gt('publishedat', Date.now() - 8 * 60 * 60 * 1000) 
      .neq('category', 'oglas') // <--- POPRAVEK: Izločimo oglase!
      .neq('category', 'promo') // <--- POPRAVEK: Izločimo promo (če obstaja)
      .order('publishedat', { ascending: false })
      .limit(60)

    if (news && news.length >= 5) {
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
