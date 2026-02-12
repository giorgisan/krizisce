/* pages/api/cron/analyze-journalism.ts */
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { computeTrending } from '@/lib/trendingAlgo'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Varnost
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 2. Zajem novic (48h za večji vzorec)
    const cutoff = Date.now() - (48 * 60 * 60 * 1000)
    const { data: rows, error } = await supabase
        .from('news')
        .select('*') 
        .gt('publishedat', cutoff)
        .neq('category', 'oglas')
        .order('publishedat', { ascending: false })
        .limit(1000)

    if (error) throw error
    if (!rows || rows.length === 0) return res.json({ message: "Baza je prazna." })

    // 3. Grupiranje
    const groups = computeTrending(rows || [])
    
    console.log(`AI Analiza: Našel ${groups.length} skupin.`);

    // 4. Filtriranje (ZDAJ VKLJUČUJE TUDI storyArticles!)
    const topStories = groups
      .filter((g: any) => {
          // TU JE BIL PROBLEM: Dodali smo še 'storyArticles'
          const list = g.items || g.articles || g.storyArticles || [];
          return list.length >= 2; 
      })
      // Razvrstimo po velikosti
      .sort((a: any, b: any) => {
          const lenA = (a.items || a.articles || a.storyArticles || []).length;
          const lenB = (b.items || b.articles || b.storyArticles || []).length;
          return lenB - lenA;
      })
      .slice(0, 5)

    if (topStories.length === 0) {
        return res.json({ 
            message: "Ni dovolj velikih zgodb (min 2 vira).",
            debug_total_groups: groups.length 
        })
    }

    // 5. Priprava prompta
    let promptData = ""
    topStories.forEach((group: any, index: number) => {
       promptData += `\nZGODBA ${index + 1}:\n`
       // TU JE BIL TUDI PROBLEM: Dodali smo še 'storyArticles'
       const list = group.items || group.articles || group.storyArticles || [];
       
       list.slice(0, 6).forEach((item: any) => {
          promptData += `- Vir: ${item.source}, Naslov: "${item.title}"\n`
       })
    })

    // 6. Prompt
    const prompt = `
      Analiziraj spodnjih ${topStories.length} medijskih zgodb. 
      Tvoja naloga je oceniti način poročanja slovenskih medijev (objektivnost vs. senzacionalizem).
      
      Za vsako zgodbo vrni JSON objekt s temi polji:
      1. "topic": Kratek, nevtralen naslov dogodka (max 5 besed).
      2. "clickbait_score": Ocena 1-10 (1=suhoparno/faktografsko, 10=ekstremni clickbait/senzacionalizem).
      3. "sensationalism": Kratek komentar (max 1 stavek) o nivoju senzacionalizma.
      4. "comparison": En stavek, ki pove, kako se viri razlikujejo (npr. "RTV je zadržan, medtem ko Slovenske Novice strašijo.").
      5. "best_headline": Vir in naslov, ki je najbolj korekten/informativen.
      6. "worst_headline": Vir in naslov, ki je najbolj zavajajoč ali pretiran (če obstaja, sicer null).
      
      VHODNI PODATKI:
      ${promptData}
      
      IZHOD (Vrni SAMO validen JSON array, brez markdowna):
      [ { "topic": "...", "clickbait_score": 5, ... }, ... ]
    `

    // 7. Klic AI
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const jsonString = responseText.replace(/```json|```/g, '').trim();
    const analysisData = JSON.parse(jsonString);

    // 8. Shranjevanje
    await supabase.from('media_analysis').insert({ 
        data: analysisData,
        created_at: new Date().toISOString()
    })

    return res.status(200).json({ success: true, count: topStories.length, data: analysisData })

  } catch (e: any) {
      console.error("AI Error:", e)
      return res.status(500).json({ error: e.message })
  }
}
