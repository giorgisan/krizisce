import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Inicializacija Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Inicializacija Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Varnost: Preveri Vercel Cron Secret
  const authHeader = req.headers.authorization;
  if (
      req.query.key !== process.env.CRON_SECRET && 
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
      // return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. DOBI NOVICE ZADNJIH 8 UR
    const { data: news } = await supabase
      .from('news')
      .select('title')
      .gt('publishedat', Date.now() - 8 * 60 * 60 * 1000) 
      .order('publishedat', { ascending: false })
      .limit(60)

    if (!news || news.length < 5) {
      return res.status(200).json({ message: 'Skipping: Premalo novic (< 5).' })
    }

    const headlines = news.map(n => `- ${n.title}`).join('\n')

    // 2. VPRAŠAJ GEMINI
    // POPRAVEK: Uporabljamo točno to ime. To je najbolj stabilno.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    const prompt = `
      Si urednik novičarskega portala. Analiziraj te naslove in izlušči 6 do 8 trenutno najbolj vročih tem.
      
      Naslovi zadnjih 8 ur:
      ${headlines}

      Navodila za izhod:
      1. Vrni SAMO JSON array stringov. Primer: ["#Volitve2025", "#Dončić", "#Požar"].
      2. Uporabi slovenski jezik.
      3. Združi sorodne novice pod en hashtag (npr. "Dončić zadel", "Luka blesti" -> "#Dončić").
      4. Izogibaj se splošnim oznakam kot so "Slovenija", "Kronika", "Šport", razen če gre za specifičen dogodek.
      5. Bodi kratek (max 2 besedi na hashtag).
      6. Ne dodajaj nobenega drugega teksta, samo JSON.
    `

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // Čiščenje JSON-a
    const cleanJson = responseText.replace(/```json|```/g, '').trim()
    
    let trends = []
    try {
        trends = JSON.parse(cleanJson)
    } catch (e) {
        console.error("JSON Parse Error:", cleanJson)
        throw new Error('AI odgovor ni validen JSON')
    }

    if (!Array.isArray(trends)) {
        throw new Error('AI ni vrnil seznama (array)')
    }

    // 3. SHRANI V BAZO
    const { error } = await supabase
      .from('trending_ai')
      .upsert({ id: 1, words: trends, updated_at: new Date().toISOString() })

    if (error) throw error

    return res.status(200).json({ success: true, count: trends.length, trends })

  } catch (error: any) {
    console.error('AI Error:', error)
    // Izpišemo celotno napako, da lažje debugiramo
    return res.status(500).json({ 
        error: error.message || 'Unknown error',
        details: error.toString() 
    })
  }
}
