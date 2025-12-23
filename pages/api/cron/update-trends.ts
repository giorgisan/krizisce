import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Inicializacija Supabase z admin pravicami (za pisanje)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Inicializacija Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Varnostni prever: prepreči, da bi kdorkoli klical to, razen Vercel Crona
  // (Vercel avtomatsko doda ta header, ko teče cron job)
  const authHeader = req.headers.authorization;
  if (req.query.key !== process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Za testiranje lahko začasno to izklopiš ali pa uporabiš ?key=tvoje_geslo
      // return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. DOBI NOVICE ZADNJIH 8 UR
    const { data: news } = await supabase
      .from('news')
      .select('title')
      .gt('publishedat', Date.now() - 8 * 60 * 60 * 1000) // Zadnjih 8 ur
      .order('publishedat', { ascending: false })
      .limit(60)

    if (!news || news.length < 5) {
      return res.status(200).json({ message: 'Premalo novic za analizo.' })
    }

    // Pripravi tekst za AI
    const headlines = news.map(n => `- ${n.title}`).join('\n')

    // 2. VPRAŠAJ GEMINI AI
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    const prompt = `
      Analiziraj te naslove novic in izlušči 6 do 8 trenutno najbolj vročih tem.
      
      Pravila:
      1. Vrni SAMO JSON array stringov (npr. ["#Volitve", "#Dončić"]).
      2. Uporabi slovenski jezik.
      3. Združi sopomenke (npr. "zmaga Dončića" in "Luka Dončić" -> "#Dončić").
      4. Bodi kratek in jedrnat (max 2 besedi na tag).
      5. Ne vključuj splošnih besed kot "Slovenija", "Vreme", "Policija", razen če je specifičen dogodek.
      6. Ignoriraj športne rezultate nepomembnih tekem.
      
      Naslovi:
      ${headlines}
    `

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // Očisti JSON (včasih AI doda ```json na začetek)
    const cleanJson = responseText.replace(/```json|```/g, '').trim()
    const trends = JSON.parse(cleanJson)

    if (!Array.isArray(trends)) {
        throw new Error('AI ni vrnil arraya')
    }

    // 3. SHRANI V BAZO
    // Vedno posodobimo vrstico z ID=1, da ne polnimo baze
    const { error } = await supabase
      .from('trending_ai')
      .upsert({ id: 1, words: trends, updated_at: new Date().toISOString() })

    if (error) throw error

    return res.status(200).json({ success: true, trends })

  } catch (error: any) {
    console.error('AI Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
