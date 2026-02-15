/* lib/trendingAlgo.ts */
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. TIPI
export interface Article {
  id: number;
  title: string;
  source: string;
  link: string;
  publishedat: string; 
  contentsnippet?: string;
  imageurl?: string;
  image?: string;
  category?: string;
}

export interface TrendingGroupResult {
  id: number;
  title: string;
  source: string;
  link: string;
  publishedAt: number; 
  image?: string;
  contentsnippet?: string;
  storyArticles: {
    source: string;
    title: string;
    link: string;
    publishedAt: number;
  }[];
  score: number;
}

// 2. KONSTANTE
export const TREND_WINDOW_HOURS = 12;

const IGNORED_TOPICS = new Set([
  'horoskop', 'astro', 'zvezde', 'znamenja', 
  'tv spored', 'vreme', 'napoved', 
  'recept', 'kuhinja', 'nagradna igra', 
  'loto', 'eurojackpot'
]);

const STOP_WORDS = new Set([
  'in', 'ali', 'da', 'pa', 'se', 'je', 'bi', 'bo', 'so', 'sta', 'pri', 'na', 'v', 'z', 's', 'k', 'h',
  'o', 'po', 'za', 'do', 'od', 'iz', 'čez', 'med', 'pod', 'nad', 'pred', 'brez', 'ki', 'ko', 'ker',
  'če', 'kot', 'kjer', 'kako', 'zakaj', 'tudi', 'še', 'že', 'samo', 'le', 'ne', 'ni', 'bila', 'bil',
  'bilo', 'bili', 'bile', 'imel', 'imela', 'imeli', 'imele', 'smo', 'ste', 'jaz', 'ti', 'on', 'ona',
  'ono', 'mi', 'vi', 'oni', 'one', 'moj', 'tvoj', 'njegov', 'njen', 'naš', 'vaš', 'njihov', 'ta',
  'to', 'te', 'ti', 'tisti', 'tista', 'tisto', 'en', 'ena', 'eno', 'dva', 'tri', 'štiri', 'pet',
  'šest', 'sedem', 'osem', 'devet', 'deset', 'prvi', 'drugi', 'tretji', 'nov', 'nova', 'novo',
  'novi', 'velik', 'velika', 'malo', 'manj', 'več', 'dobro', 'slabo', 'dan', 'danes', 'včeraj',
  'jutri', 'leto', 'mesec', 'teden', 'ura', 'minuta', 'sekunda', 'Slovenija', 'Ljubljana', 'Maribor',
  'vlada', 'država', 'svet', 'evropa', 'policija', 'sodišče', 'banka', 'šola', 'bolnišnica'
]);

// --- 3. POMOŽNE FUNKCIJE ---

function getTime(dateInput: string | number): number {
    if (typeof dateInput === 'number') return dateInput;
    const t = new Date(dateInput).getTime();
    return isNaN(t) ? 0 : t;
}

function preprocessTitle(title: string): Set<string> {
  if (!title) return new Set();
  return new Set(
    title
      .toLowerCase()
      .replace(/[^\w\sšđčćž]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}


// --- 4. AI CLUSTERING (Gemini 2.0 Flash - REFINED & STRICTER) ---
async function clusterNewsWithAI(articles: Article[]): Promise<Record<string, number[]> | null> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || "");
  const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" }); 

  const articlesList = articles.map((a, index) => {
    // Odstranimo nepotrebne znake za varčevanje tokenov
    const snippet = a.contentsnippet ? ` | ${a.contentsnippet.substring(0, 150).replace(/\n/g, ' ')}` : '';
    return `ID:${index} [${a.source}] TITLE:"${a.title}"${snippet}`;
  }).join('\n');

  // --- POPRAVLJEN PROMPT: PRECIZNO LOČEVANJE OSEB ---
  const prompt = `
    You are a news editor. Group articles into clusters that belong to the EXACT SAME EVENT.
    
    INPUT:
    ${articlesList}

    RULES FOR GROUPING:
    1. **SAME MAIN EVENT ONLY**: Group the main report together with direct reactions and analysis of THAT specific event.
       - Example: "Domen Prevc wins gold" AND "Coach praises Domen's jump" -> GROUP TOGETHER.
       - Example: "Navalny dies" AND "Kremlin denies involvement in Navalny death" -> GROUP TOGETHER.
    
    2. **DISTINCT PEOPLE = DISTINCT GROUPS**: 
       - **CRITICAL**: "Nika Prevc" and "Domen Prevc" are DIFFERENT athletes. Do NOT group them unless they are in a Mixed Team event together.
       - A preview of a future event (e.g., "Nika will jump today") is DIFFERENT from a report of a past event (e.g., "Domen won yesterday").
       
    3. **DISTINCT TOPICS**:
       - "Zelensky talks about missiles" vs "Sajovic talks about Slovenian army" -> SEPARATE.
       - "Tina Maze wins" vs "Lindsey Vonn crashes" -> SEPARATE.

    4. **Output format**: JSON only. Keys are short Slovenian topic summaries. Values are arrays of IDs.

    RESPONSE FORMAT (JSON ONLY):
    {
      "Zlato za Domna Prevca": [1, 2, 5], 
      "Nika Prevc napada medaljo": [8, 9],
      "Smrt Navalnega": [10, 11, 12]
    }
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("❌ AI Clustering failed:", error);
    return null; 
  }
}


// --- 5. GLAVNA FUNKCIJA ---
export async function computeTrending(articles: Article[]): Promise<TrendingGroupResult[]> {
  if (!articles || articles.length === 0) return [];

  // A) Poskusi z AI
  const aiClusters = await clusterNewsWithAI(articles);

  if (aiClusters) {
    const results: TrendingGroupResult[] = [];

    for (const [topic, indices] of Object.entries(aiClusters)) {
      const groupArticles = indices.map(i => articles[i]).filter(a => a !== undefined);

      if (groupArticles.length < 2) continue;
      const uniqueSources = new Set(groupArticles.map(a => a.source));
      
      // Če AI vrne grupo z samo enim virom, jo ignoriramo (razen če je res velika)
      if (uniqueSources.size < 2 && groupArticles.length < 3) continue;

      // Sortiranje znotraj grupe (Slika > Datum)
      groupArticles.sort((a, b) => {
        const imgA = a.image || a.imageurl;
        const imgB = b.image || b.imageurl;
        if (imgA && !imgB) return -1;
        if (!imgA && imgB) return 1;
        return getTime(b.publishedat) - getTime(a.publishedat); 
      });

      const mainArticle = groupArticles[0];
      
      // --- FILTER: Ignoriraj Horoskop/Vreme/itd. ---
      const titleLower = mainArticle.title.toLowerCase();
      const topicLower = topic.toLowerCase();
      const isIgnored = Array.from(IGNORED_TOPICS).some(ignoredWord => 
          titleLower.includes(ignoredWord) || topicLower.includes(ignoredWord)
      );

      if (isIgnored) {
          continue; 
      }
      // ---------------------------------------------

      const others = groupArticles.slice(1);
      
      const finalImage = mainArticle.image || mainArticle.imageurl;
      const mainTime = getTime(mainArticle.publishedat);

      results.push({
        id: mainArticle.id,
        title: mainArticle.title,
        source: mainArticle.source,
        link: mainArticle.link,
        publishedAt: mainTime, 
        image: finalImage,
        contentsnippet: mainArticle.contentsnippet,
        storyArticles: others.map(o => ({
          source: o.source,
          title: o.title,
          link: o.link,
          publishedAt: getTime(o.publishedat) 
        })),
        score: uniqueSources.size * 10 + groupArticles.length // Malo boljši score algoritem
      });
    }

    return results.sort((a, b) => {
        // Najprej po številu različnih virov (več virov = bolj pomembna novica)
        const sourcesA = new Set([a.source, ...a.storyArticles.map(s => s.source)]).size;
        const sourcesB = new Set([b.source, ...b.storyArticles.map(s => s.source)]).size;
        
        if (sourcesB !== sourcesA) return sourcesB - sourcesA;
        return b.publishedAt - a.publishedAt;
    });
  }

  // B) JACCARD FALLBACK (Samo če AI popolnoma odpove)
  console.log("⚠️ AI failed, falling back to Jaccard...");
  const processedArticles = articles.map(article => ({
    ...article,
    wordSet: preprocessTitle(article.title),
    assigned: false
  }));

  const groups: TrendingGroupResult[] = [];

  for (let i = 0; i < processedArticles.length; i++) {
    if (processedArticles[i].assigned) continue;

    const currentGroup = [processedArticles[i]];
    processedArticles[i].assigned = true;

    // --- Filter za Jaccard ---
    const titleLower = processedArticles[i].title.toLowerCase();
    const isIgnored = Array.from(IGNORED_TOPICS).some(ignoredWord => 
        titleLower.includes(ignoredWord)
    );
    if (isIgnored) continue;
    // -------------------------

    for (let j = i + 1; j < processedArticles.length; j++) {
      if (processedArticles[j].assigned) continue;
      
      // Povečal prag podobnosti na 0.35 za Jaccard, da je manj "povezovanja vsega povprek"
      const similarity = jaccardSimilarity(processedArticles[i].wordSet, processedArticles[j].wordSet);
      if (similarity >= 0.35) {
        currentGroup.push(processedArticles[j]);
        processedArticles[j].assigned = true;
      }
    }

    if (currentGroup.length >= 2) {
      const uniqueSources = new Set(currentGroup.map(a => a.source));
      if (uniqueSources.size >= 2) {
        
        currentGroup.sort((a, b) => {
            const imgA = a.image || a.imageurl;
            const imgB = b.image || b.imageurl;
            if (imgA && !imgB) return -1;
            if (!imgA && imgB) return 1;
            return getTime(b.publishedat) - getTime(a.publishedat);
        });

        const mainArticle = currentGroup[0];
        const others = currentGroup.slice(1);
        const finalImage = mainArticle.image || mainArticle.imageurl;
        const mainTime = getTime(mainArticle.publishedat);

        groups.push({
          id: mainArticle.id,
          title: mainArticle.title,
          source: mainArticle.source,
          link: mainArticle.link,
          publishedAt: mainTime,
          image: finalImage,
          contentsnippet: mainArticle.contentsnippet,
          storyArticles: others.map(o => ({
            source: o.source,
            title: o.title,
            link: o.link,
            publishedAt: getTime(o.publishedat)
          })),
          score: uniqueSources.size * 10 + currentGroup.length
        });
      }
    }
  }

  return groups.sort((a, b) => b.score - a.score);
}
