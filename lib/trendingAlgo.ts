/* lib/trendingAlgo.ts */
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. TIPI
export interface Article {
  id: number;
  title: string;
  source: string;
  link: string;
  publishedat: string; // Iz Supabase pride kot ISO string
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
  publishedAt: number; // Za frontend mora biti timestamp (number)
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

// Teme, ki jih NE želimo v "Trending" (Aktualno) sekciji
const IGNORED_TOPICS = new Set([
  'horoskop', 'astro', 'zvezde', 'znamenja', 
  'tv spored', 'vreme', 'napoved', 
  'recept', 'kuhinja', 'nagradna igra', 
  'loto', 'eurojackpot'
]);

// Stopwords za Jaccard fallback
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

// Varna pretvorba datuma (string -> number)
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

// --- 4. AI CLUSTERING (Gemini 3 Flash) ---
async function clusterNewsWithAI(articles: Article[]): Promise<Record<string, number[]> | null> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || "");
  const model = genAI.getGenerativeModel({ model: "models/gemini-3-flash-preview" });

  // --- NOVO: Vključimo tudi 'contentsnippet' v input za AI ---
  const articlesList = articles.map((a, index) => {
    // Omejimo snippet na 200 znakov, da ne porabimo preveč tokenov, a še vedno damo kontekst
    const snippet = a.contentsnippet ? ` | ${a.contentsnippet.substring(0, 200).replace(/\n/g, ' ')}` : '';
    return `${index}. [${a.source}] "${a.title}"${snippet}`;
  }).join('\n');

  // --- NOVO: Posodobljen Prompt s pravili za dogodke in mnenja ---
  const prompt = `
    You are a Slovenian news clustering expert.
    You monitor news sources like 24ur, RTV, Delo, N1, Siol, Dnevnik, Zurnal24, Svet24, Slovenske novice.

    GROUP these articles by the EXACT SAME EVENT.
    ${articlesList}

    RULES:
    1. A valid group = 2+ articles from DIFFERENT sources about the SAME SPECIFIC EVENT.
    2. DO NOT group general commentary/columns (Opinion) with specific news events just because they share a topic (e.g., "Elections").
    3. Ignore single-source articles completely.
    4. Create SHORT topic names in Slovenian (2-4 words): "Požar na Krasu" (NOT "Natural disasters").
    5. One article = ONE group only.
    6. Combine similar topics: "Nova vlada" + "Politične spremembe" → "Nova vlada".
    7. Return ONLY raw JSON: { "Topic Name": [indices], ... }

    RESPOND WITH PURE JSON ONLY. Do not use markdown code blocks. Just the raw JSON string.
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;
    if (jsonStart === -1 || jsonEnd === -1) return null;
    
    return JSON.parse(responseText.substring(jsonStart, jsonEnd));
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
      if (uniqueSources.size < 2) continue;

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
        score: uniqueSources.size * 10
      });
    }

    return results.sort((a, b) => {
        const countDiff = b.storyArticles.length - a.storyArticles.length;
        if (countDiff !== 0) return countDiff;
        return b.publishedAt - a.publishedAt;
    });
  }

  // B) JACCARD FALLBACK
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
      
      const similarity = jaccardSimilarity(processedArticles[i].wordSet, processedArticles[j].wordSet);
      if (similarity >= 0.3) {
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

  return groups.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      return b.publishedAt - a.publishedAt;
  });
}
