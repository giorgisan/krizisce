/* pages/api/cron/analyze-journalism.ts */
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { computeTrending } from '@/lib/trendingAlgo'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Varnostni pregled (Cron Secret)
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 2. Zajem novic (Zadnjih 24 ur)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000)
    const { data: rows, error } = await supabase
        .from('news')
        .select('*') 
        .gt('publishedat', cutoff)
        .neq('category', 'oglas')
        .order('publishedat', { ascending: false })
        .limit(1000)

    if (error) throw error
    if (!rows || rows.length === 0) return res.json({ message: "Ni dovolj novic." })

    // 3. Grupiranje (Uporabimo obstoječ algoritem)
    const groups = computeTrending(rows || [])
    
    // Vzemi top 5 zgodb, ki imajo vsaj 3 različne vire (da je kaj primerjati)
    const topStories = groups
      .filter(g => g.items.length >= 3)
      .slice(0, 5)

    if (topStories.length === 0) return res.json({ message: "Ni dovolj velikih zgodb (min 3 viri)." })

    // 4. Priprava podatkov za AI
    let promptData = ""
    topStories.forEach((group, index) => {
       promptData += `\nZGODBA ${index + 1}:\n`
       // Omejimo na max 6 naslovov na zgodbo, da šparamo tokene, če je zgodba ogromna
       group.items.slice(0, 6).forEach(item => {
          promptData += `- Vir: ${item.source}, Naslov: "${item.title}"\n`
       })
    })

    // 5. Prompt za Gemini
    const prompt = `
      Analiziraj spodnjih 5 medijskih zgodb. Tvoja naloga je oceniti način poročanja slovenskih medijev.
      
      Za vsako zgodbo vrni JSON objekt s temi polji:
      1. "topic": Kratek, nevtralen naslov dogodka (max 5 besed).
      2. "clickbait_score": Ocena 1-10 (1=suhoparno/faktografsko, 10=ekstremni clickbait/senzacionalizem).
      3. "sensationalism": Kratek komentar (max 1 stavek) o nivoju senzacionalizma in čustvenem naboju.
      4. "comparison": En stavek, ki pove, kako se viri razlikujejo (npr. "RTV je zadržan, medtem ko Slovenske Novice strašijo.").
      5. "best_headline": Vir in naslov, ki je najbolj korekten/informativen.
      6. "worst_headline": Vir in naslov, ki je najbolj zavajajoč ali pretiran (če obstaja, sicer null).
      
      VHODNI PODATKI:
      ${promptData}
      
      IZHOD (Vrni SAMO validen JSON array, brez markdowna):
      [ { "topic": "...", "clickbait_score": 5, ... }, ... ]
    `

    // 6. Klic AI (Gemini 2.0 Flash)
    // Uporabljamo 2.0 Flash, ker ima visok limit (1500 req/day)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Čiščenje JSON-a (za vsak slučaj)
    const jsonString = responseText.replace(/```json|```/g, '').trim();
    const analysisData = JSON.parse(jsonString);

    // 7. Shranjevanje v bazo
    // Najprej pobrišemo stare analize (opcijsko, ali pa samo dodajamo) -> Tukaj samo dodajamo novo.
    await supabase.from('media_analysis').insert({ 
        data: analysisData,
        created_at: new Date().toISOString()
    })

    return res.status(200).json({ success: true, data: analysisData })

  } catch (e: any) {
      console.error(e)
      return res.status(500).json({ error: e.message })
  }
}
