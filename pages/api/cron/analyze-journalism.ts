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
    // 1. Zajem novic
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

    // 2. Grupiranje
    const groups = computeTrending(rows || [])
    
    // 3. Filtriranje
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

    // 4. Priprava prompta
    let promptData = ""
    topStories.forEach((group: any, index: number) => {
       promptData += `\nZGODBA ${index + 1}:\n`
       const list = group.items || group.articles || group.storyArticles || [];
       
       list.slice(0, 10).forEach((item: any) => {
          promptData += `- Vir: ${item.source}, Naslov: "${item.title}", Link: "${item.link}"\n`
       })
    })

    // 5. PROMPT
    const prompt = `
      Analiziraj spodnjih ${topStories.length} medijskih zgodb.
      
      Za vsako zgodbo vrni JSON objekt:
      1. "topic": Kratek, nevtralen naslov dogodka (max 5 besed).
      2. "summary": En stavek, ki pove bistvo dogodka.
      3. "tone_difference": Kratek opis (max 2 stavka) razlik v poročanju (kdo je nevtralen, kdo dramatičen).
      4. "sources": Seznam virov. Za vsak vir:
          - "source": Ime medija.
          - "title": Naslov.
          - "url": Povezava (Link).
          - "tone": Ton naslova (Nevtralen, Senzacionalen, Alarmanten, Informativen, Vprašalni).
      
      VHODNI PODATKI:
      ${promptData}
      
      IZHOD (JSON array):
      [ { "topic": "...", "sources": [...] } ]
    `

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json|```/g, '').trim();
    
    let analysisData = JSON.parse(jsonString);

    // --- KLJUČNI POPRAVEK: VSTAVLJANJE SLIKE IZ BAZE ---
    analysisData = analysisData.map((aiItem: any, index: number) => {
        const originalGroup = topStories[index];
        
        if (originalGroup) {
            // TU JE BIL POPRAVEK: cast v 'any'
            const groupAny = originalGroup as any;
            const list = groupAny.items || groupAny.articles || groupAny.storyArticles || [];
            
            // Poišči prvi članek, ki ima veljaven URL slike
            const articleWithImage = list.find((a: any) => 
                a.image && 
                typeof a.image === 'string' && 
                a.image.startsWith('http') &&
                a.image.length > 10
            );

            if (articleWithImage) {
                aiItem.main_image = articleWithImage.image;
            } else {
                aiItem.main_image = null; 
            }
        }
        return aiItem;
    });
    // ---------------------------------------------------

    // 7. Shranjevanje
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
