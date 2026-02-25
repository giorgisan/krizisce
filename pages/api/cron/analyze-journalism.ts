/* pages/api/cron/analyze-journalism.ts */
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { computeTrending, TREND_WINDOW_HOURS } from '@/lib/trendingAlgo'

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
    const cutoff = Date.now() - (TREND_WINDOW_HOURS * 60 * 60 * 1000)
    const { data: rows, error } = await supabase
        .from('news')
        .select('*') 
        .gt('publishedat', cutoff)
        .neq('category', 'oglas')
        .order('publishedat', { ascending: false })
        .limit(800)

    if (error) throw error
    if (!rows || rows.length === 0) return res.json({ message: "Baza je prazna." })

    const groups = await computeTrending(rows || [])
    
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

    let promptData = ""
    topStories.forEach((group: any, index: number) => {
       promptData += `\nZGODBA ${index + 1}:\n`
       const list = group.items || group.articles || group.storyArticles || [];
       list.slice(0, 10).forEach((item: any) => {
          promptData += `- Vir: ${item.source}, Naslov: "${item.title}", Link: "${item.link}"\n`
       })
    })

    const prompt = `
      You are an expert Slovenian media analyst. Analyze how different Slovenian media outlets cover the same ${topStories.length} events.
      Focus on "media framing" - what angle each source chooses to highlight.
      
      POMEMBNO: Odgovori izključno v SLOVENŠČINI.
      
      For each story, return a JSON object with:
      1. "topic": Kratek, nevtralen naslov dogodka v slovenščini (max 5 besed).
      2. "summary": En stavek bistva v slovenščini.
      3. "framing_analysis": Kratek odstavek (2-3 stavki) v slovenščini, ki pojasni razlike v poročanju (kaj so izpostavili).
      4. "sources": Array of sources:
          - "source": Name of the media.
          - "title": Headline.
          - "url": The link.
          - "tone": Headline tone (Nevtralen, Senzacionalen, Alarmanten, Informativen, Vprašalni).
      
      INPUT DATA:
      ${promptData}
      
      OUTPUT FORMAT (JSON array only):
      [ { "topic": "...", "summary": "...", "framing_analysis": "...", "sources": [...] } ]
    `

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
    });
    
    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json|```/g, '').trim();
    let analysisData = JSON.parse(jsonString);

    analysisData = analysisData.map((aiItem: any, index: number) => {
        const originalGroup = topStories[index] as any;
        if (originalGroup) {
            aiItem.main_image = originalGroup.image || null;
            if (!aiItem.main_image) {
                const list = originalGroup.items || originalGroup.articles || originalGroup.storyArticles || [];
                aiItem.main_image = list.find((a: any) => a.image)?.image || null;
            }
        }
        return aiItem;
    });

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
