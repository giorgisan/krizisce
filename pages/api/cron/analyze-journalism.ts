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
       const list = group.items || group.articles || group.storyArticles || [];
       
       // Pošljemo VSE naslove (ne samo prvih 6, če jih ni preveč), da jih AI lahko vrne
       list.slice(0, 8).forEach((item: any) => {
          promptData += `- Vir: ${item.source}, Naslov: "${item.title}", Slika: "${item.image || ''}"\n`
       })
    })

    // 6. NOV PROMPT (Manj sojenja, več analize razlik)
    const prompt = `
      Analiziraj spodnjih ${topStories.length} medijskih zgodb.
      Tvoja naloga je primerjati, kako različni slovenski mediji poročajo o isti temi.
      Ne ocenjuj clickbaita s številko, ampak opiši razlike v tonu.
      
      Za vsako zgodbo vrni JSON objekt:
      1. "topic": Kratek, nevtralen naslov dogodka (max 5 besed).
      2. "summary": En stavek, ki pove bistvo dogodka (objektivno).
      3. "tone_difference": Kratek opis (max 2 stavka), kako se viri razlikujejo (npr. "RTV in Delo poročata faktografsko, medtem ko Slovenske Novice izpostavljajo čustveni vidik in dramo.").
      4. "sources": Seznam vseh virov v tej zgodbi. Za vsak vir vrni:
          - "source": Ime medija.
          - "title": Njihov naslov (dobesedno).
          - "tone": Ena beseda, ki opiše ton tega naslova (npr. "Nevtralen", "Senzacionalen", "Dramatičen", "Informativen", "Vprašalni").
      
      VHODNI PODATKI:
      ${promptData}
      
      IZHOD (JSON array):
      [ 
        { 
          "topic": "...", 
          "summary": "...", 
          "tone_difference": "...",
          "sources": [ { "source": "RTV", "title": "...", "tone": "Nevtralen" }, ... ]
        }, 
        ... 
      ]
    `

    // 7. Klic AI
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
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
