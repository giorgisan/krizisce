/* pages/api/cron/analyze-journalism.ts */
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
    // 1. ZAJEM IZ CACHE TABELE (Tako bo Monitor identičen naslovnici!)
    const { data: cacheData, error: cacheError } = await supabase
        .from('trending_groups_cache')
        .select('data')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

    if (cacheError || !cacheData) throw new Error("Ni trendovskih podatkov v cache-u.")

    const allGroups = cacheData.data;
    if (!Array.isArray(allGroups) || allGroups.length === 0) return res.json({ message: "Ni skupin." })

    // 2. Izbor prvih 5 skupin (Točno te, ki so na vrhu prve strani)
    const topStories = allGroups.slice(0, 5)

    // 3. Priprava podatkov za AI
    let promptData = ""
    topStories.forEach((group: any, index: number) => {
       promptData += `\nZGODBA ${index + 1}:\n`
       // Uporabimo vse artikle v skupini
       const mainArticle = { source: group.source, title: group.title, link: group.link };
       const otherArticles = group.storyArticles || [];
       const allInGroup = [mainArticle, ...otherArticles];
       
       allInGroup.slice(0, 8).forEach((item: any) => {
          promptData += `- Vir: ${item.source}, Naslov: "${item.title}", Link: "${item.link}"\n`
       })
    })

    const prompt = `
      Analiziraj kako slovenski mediji poročajo o spodnjih ${topStories.length} dogodkih. 
      Osredotoči se na "medijsko okvirjanje" (framing) - kateri kot poročanja izbere posamezen vir.
      
      ODGOVORI IZKLJUČNO V SLOVENŠČINI.
      
      Za vsako zgodbo vrni JSON:
      1. "topic": Nevtralen naslov dogodka (max 5 besed).
      2. "summary": Bistvo dogodka v enem stavku.
      3. "framing_analysis": Kratek odstavek (2-3 stavki), kateri medij poudarja dramo/čustva in kateri dejstva/sistem.
      4. "sources": Seznam virov s polji: source, title, url in tone (Nevtralen, Senzacionalen, Alarmanten, Informativen, Vprašalni).
      
      VHOD:
      ${promptData}
      
      OUTPUT FORMAT (JSON array only):
      [ { "topic": "...", "summary": "...", "framing_analysis": "...", "sources": [...] } ]
    `

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
    });
    
    const analysisData = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());

    // 4. Pripis slik iz originalnih skupin
    const finalData = analysisData.map((aiItem: any, index: number) => {
        const originalGroup = topStories[index];
        if (originalGroup) {
            aiItem.main_image = originalGroup.image || null;
        }
        return aiItem;
    });

    // 5. Shranjevanje
    await supabase.from('media_analysis').insert({ 
        data: finalData,
        created_at: new Date().toISOString()
    })

    return res.status(200).json({ success: true, count: finalData.length, data: finalData })

  } catch (e: any) {
      console.error("Monitor AI Error:", e)
      return res.status(500).json({ error: e.message })
  }
}
