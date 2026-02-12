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
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 2. Zajem novic (48h)
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
    
    // 4. Filtriranje
    const topStories = groups
      .filter((g: any) => {
          const list = g.items || g.articles || g.storyArticles || [];
          return list.length >= 2; 
      })
      .sort((a: any, b: any) => {
          const lenA = (a.items || a.articles || a.storyArticles || []).length;
          const lenB = (b.items || b.articles || b.storyArticles || []).length;
          return lenB - lenA;
      })
      .slice(0, 5)

    if (topStories.length === 0) {
        return res.json({ message: "Ni dovolj velikih zgodb.", count: 0 })
    }

    // 5. Priprava prompta
    let promptData = ""
    topStories.forEach((group: any, index: number) => {
       promptData += `\nZGODBA ${index + 1}:\n`
       const list = group.items || group.articles || group.storyArticles || [];
       
       list.slice(0, 8).forEach((item: any) => {
          promptData += `- Vir: ${item.source}, Naslov: "${item.title}", Link: "${item.link}", Slika: "${item.image || ''}"\n`
       })
    })

    // 6. PROMPT
    const prompt = `
      Analiziraj spodnjih ${topStories.length} medijskih zgodb.
      
      Za vsako zgodbo vrni JSON objekt:
      1. "topic": Kratek, nevtralen naslov dogodka (max 5 besed).
      2. "summary": En stavek, ki pove bistvo dogodka.
      3. "tone_difference": Kratek opis (max 2 stavka) razlik v poročanju.
      4. "main_image": Izberi EN URL slike iz vhodnih podatkov ("Slika"), ki najboljše predstavlja to zgodbo. Če slike ni, vrni prazen string.
      5. "sources": Seznam virov. Za vsak vir:
          - "source": Ime medija.
          - "title": Naslov.
          - "url": Povezava (Link).
          - "tone": Ton naslova (Nevtralen, Senzacionalen, Alarmanten, Informativen, Vprašalni).
      
      VHODNI PODATKI:
      ${promptData}
      
      IZHOD (JSON array):
      [ { "topic": "...", "main_image": "...", "sources": [...] } ]
    `

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json|```/g, '').trim();
    let analysisData = JSON.parse(jsonString);

    // --- POPRAVEK: VAROVALKA ZA SLIKE ---
    // Če AI ni vrnil slike, jo poiščemo ročno v originalnih podatkih
    analysisData = analysisData.map((item: any, index: number) => {
        if (!item.main_image || item.main_image.length < 5) {
            // Poišči ustrezno skupino v topStories
            const group = topStories[index];
            const list = group.items || group.articles || group.storyArticles || [];
            // Najdi prvi članek, ki ima sliko
            const articleWithImage = list.find((a: any) => a.image && a.image.length > 5);
            if (articleWithImage) {
                item.main_image = articleWithImage.image;
            }
        }
        return item;
    });
    // -------------------------------------

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
