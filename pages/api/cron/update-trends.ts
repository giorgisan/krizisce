import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// UPORABI 1.5 FLASH (Visoki limiti, stabilen za text)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

// --- VARNOSTNA FUNKCIJA: Če AI odpove, preštejemo besede sami ---
function extractTrendsManually(titles: string[]): string[] {
  const stopWords = new Set([
    'in', 'ali', 'pa', 'ter', 'je', 'so', 'bo', 'bodo', 'se', 'bi', 'da', 'na', 'v', 'z', 's', 'k', 'h',
    'o', 'za', 'pri', 'po', 'od', 'do', 'iz', 'čez', 'med', 'pod', 'nad', 'pred', 'glede', 'zaradi',
    'novice', 'video', 'foto', 'dan', 'danes', 'včeraj', 'jutri', 'leto', 'leta', 'let', 'nova', 'novo',
    'kako', 'zakaj', 'kdaj', 'kje', 'kdo', 'kaj', 'česa', 'čem', 'komu', 'koga', 'ne', 'ni', 'bilo',
    'slovenija', 'slovenski', 'policija', 'policisti', 'letih', 'evrov', 'kmalu', 'spet', 'še', 'že',
    'lahko', 'proti', 'brez', 'tudi', 'samo', 'dela', 'delo', 'ura', 'ure'
  ]);

  const wordCount: Record<string, number> = {};

  titles.forEach(title => {
    // Počistimo naslov in razbijemo na besede
    const words = title.replace(/[^\w\sČčŠšŽžĐđĆć]/g, '').split(/\s+/);
    
    words.forEach(word => {
      const cleanWord = word.trim();
      if (cleanWord.length > 3 && !stopWords.has(cleanWord.toLowerCase())) {
        // Damo prednost besedam z veliko začetnico (imena, kraji)
        const isCapitalized = cleanWord[0] === cleanWord[0].toUpperCase();
        const weight = isCapitalized ? 2 : 1;
        const key = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
        wordCount[key] = (wordCount[key] || 0) + weight;
      }
    });
  });

  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6) // Vzamemo top 6
    .map(([word]) => `#${word}`);
}
// -----------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Preverjanje avtorizacije
  if (req.query.key !== process.env.CRON_SECRET) {
      // return res.status(401).json({ error: 'Unauthorized' });
  }

  let trends: string[] = []
  let source = 'AI'

  try {
    // 1. KORAK: DOBI NOVICE
    const { data: allNews, error } = await supabase
      .from('news')
      .select('title, publishedat, category')
      .neq('category', 'oglas')
      .neq('category', 'promo')
      .order('publishedat', { ascending: false })
      .limit(60)

    if (error) throw error
    if (!allNews || allNews.length === 0) {
        return res.status(200).json({ success: false, message: 'Baza je prazna.' })
    }

    // 2. KORAK: FILTRIRANJE (24 ur)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    let recentNews = allNews.filter(n => {
        const newsDate = new Date(n.publishedat)
        return newsDate > cutoffTime
    })

    // Fallback: če je premalo novic, vzemi zadnjih 15 neglede na čas
    if (recentNews.length < 5) {
        recentNews = allNews.slice(0, 15);
    }

    // 3. KORAK: AI GENERIRANJE
    const headlines = recentNews.map(n => `- ${n.title}`).join('\n')

    try {
        // SPREMEMBA: Uporabljamo 1.5-flash
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
        
        const prompt = `
          Analiziraj te naslove in izlušči 6 do 8 trenutno najbolj vročih tem.
          Naslovi:
          ${headlines}

          NAVODILA (STROGO UPOŠTEVAJ):
          1. Vrni SAMO JSON array stringov.
          2. Vsak element se začne z lojtro (#).
          3. NE ZDRUŽUJ BESED (CamelCase prepovedan). Uporabi presledke (#Luka Dončić).
          4. IZJEMNO POMEMBNO - DOBESEDNOST:
              - Uporabljaj IZKLJUČNO besede, ki se pojavijo v naslovu. Ne išči sopomenk!
              - Bodi kot papiga: kopiraj ključne samostalnike iz naslova.
          5. PRIORITETA:
              - Imena oseb.
              - Kratice.
              - Imena podjetij/produktov.
          6. Max 3 besede na tag.
          7. Ne vključuj besed, kot so "umrl", "letos", "nov", razen če so del imena.
        `

        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        const cleanJson = responseText.replace(/```json|```/g, '').trim()
        
        const parsed = JSON.parse(cleanJson)
        
        if (Array.isArray(parsed) && parsed.length > 0) {
            trends = parsed
        } else {
            throw new Error('Prazen array iz AI')
        }

    } catch (aiError: any) {
        console.error("⚠️ AI napaka (preklapljam na manual):", aiError.message)
        // SPREMEMBA: Namesto da vrnemo napako, uporabimo varnostno funkcijo
        source = 'MANUAL_FALLBACK'
        const titles = recentNews.map(n => n.title);
        trends = extractTrendsManually(titles);
    }

    // 4. KORAK: SHRANJEVANJE
    if (trends.length > 0) {
        // Počistimo format
        trends = trends.map(t => t.startsWith('#') ? t : `#${t}`).filter(t => t.length > 2);

        const { error } = await supabase
          .from('trending_ai')
          .upsert({ id: 1, words: trends, updated_at: new Date().toISOString() })
        
        if (error) throw error
        
        return res.status(200).json({ success: true, source, count: trends.length, trends })
    } else {
        return res.status(200).json({ success: false, message: 'Ni bilo mogoče generirati trendov.' })
    }

  } catch (error: any) {
    console.error('Critical Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
