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
  const authHeader = req.headers.authorization;
  if (
      req.query.key !== process.env.CRON_SECRET && 
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
      // return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. DOBI NOVICE
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

    // 2. PRIPRAVI PROMPT
    const prompt = `
      Si urednik novičarskega portala. Analiziraj te naslove in izlušči 6 do 8 trenutno najbolj vročih tem.
      Naslovi:
      ${headlines}

      Navodila:
      1. Vrni SAMO JSON array stringov. Primer: ["#Volitve2025", "#Dončić", "#Požar"].
      2. Uporabi slovenski jezik.
      3. Združi sorodne novice.
      4. Bodi kratek (max 2 besedi).
    `

    // 3. POSKUSI Z MODELOM (Uporabljamo specifično verzijo 001 ali 002)
    // To je najbolj stabilna verzija Flasha
    const modelName = "gemini-1.5-flash-001"; 
    const model = genAI.getGenerativeModel({ model: modelName })

    console.log(`🤖 Kličem AI model: ${modelName}...`);
    
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // Čiščenje JSON-a
    const cleanJson = responseText.replace(/```json|```/g, '').trim()
    
    let trends = []
    try {
        trends = JSON.parse(cleanJson)
    } catch (e) {
        throw new Error(`AI odgovor ni validen JSON: ${cleanJson}`)
    }

    if (!Array.isArray(trends)) {
        throw new Error('AI ni vrnil seznama (array)')
    }

    // 4. SHRANI V BAZO
    const { error } = await supabase
      .from('trending_ai')
      .upsert({ id: 1, words: trends, updated_at: new Date().toISOString() })

    if (error) throw error

    return res.status(200).json({ success: true, model_used: modelName, trends })

  } catch (error: any) {
    console.error('❌ AI Critical Error:', error.message)

    // --- DEBUGGING MOD ---
    // Če glavni model ne dela, vprašajmo Google, kaj je sploh na voljo za ta API ključ
    try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_AI_KEY}`);
        const listData = await listRes.json();
        
        // Vrnemo napako SKUPAJ s seznamom modelov, ki so na voljo
        return res.status(500).json({ 
            error: error.message,
            diagnosis: "Spodaj je seznam modelov, ki so na voljo tvojemu ključu:",
            available_models: listData 
        })
    } catch (listError) {
        return res.status(500).json({ error: error.message, details: "Ni mogoče niti pridobiti seznama modelov." })
    }
  }
}
