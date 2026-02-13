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
  publishedAt: number; // !!! POPRAVEK: CamelCase in number (za "pred X min")
  image?: string;
  contentsnippet?: string;
  storyArticles: {
    source: string;
    title: string;
    link: string;
    publishedAt: number; // Tudi tukaj dodamo čas
  }[];
  score: number;
}

// 2. KONSTANTE
export const TREND_WINDOW_HOURS = 12;

// Stopwords za Jaccard
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

// --- 3. POMOŽNE FUNKCIJE ZA JACCARD ---
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

  const articlesList = articles.map((a, index) => 
    `${index}. [${a.source}] ${a.title}`
  ).join('\n');

  const prompt = `
    You are a news clustering engine. Group these articles by TOPIC.
    INPUT ARTICLES:
    ${articlesList}
    RULES:
    1. Group articles that report on the EXACT SAME EVENT.
    2. A valid group must have at least 2 articles from DIFFERENT sources.
    3. Ignore single-source stories.
    4. Create a short, descriptive topic name in Slovenian.
    5. Return ONLY raw JSON: { "Topic Name": [indices], ... }
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;
    if (jsonStart === -1 || jsonEnd === -1) return null;
    return JSON.parse(responseText.substring(jsonStart, jsonEnd));
  } catch (error) {
    console.error("AI Clustering failed:", error);
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

      // Sortiranje: Slike imajo prednost, nato datum
      groupArticles.sort((a, b) => {
        const imgA = a.image || a.imageurl;
        const imgB = b.image || b.imageurl;
        
        if (imgA && !imgB) return -1;
        if (!imgA && imgB) return 1;
        return new Date(b.publishedat).getTime() - new Date(a.publishedat).getTime();
      });

      const mainArticle = groupArticles[0];
      const others = groupArticles.slice(1);
      
      const finalImage = mainArticle.image || mainArticle.imageurl;
      const mainTime = new Date(mainArticle.publishedat).getTime(); // Pretvorba v ms

      results.push({
        id: mainArticle.id,
        title: mainArticle.title,
        source: mainArticle.source,
        link: mainArticle.link,
        publishedAt: mainTime, // <--- Tukaj je zdaj number!
        image: finalImage,
        contentsnippet: mainArticle.contentsnippet,
        storyArticles: others.map(o => ({
          source: o.source,
          title: o.title,
          link: o.link,
          publishedAt: new Date(o.publishedat).getTime() // Dodan čas za povezane
        })),
        score: uniqueSources.size * 10
      });
    }

    // Tie-Breaker: Količina, nato Svežina
    return results.sort((a, b) => {
        const countDiff = b.storyArticles.length - a.storyArticles.length;
        if (countDiff !== 0) return countDiff;
        return b.publishedAt - a.publishedAt; // Uporabimo number za primerjavo
    });
  }

  // B) JACCARD FALLBACK
  console.log("AI failed, falling back to Jaccard...");
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
            return new Date(b.publishedat).getTime() - new Date(a.publishedat).getTime();
        });

        const mainArticle = currentGroup[0];
        const others = currentGroup.slice(1);
        const finalImage = mainArticle.image || mainArticle.imageurl;
        const mainTime = new Date(mainArticle.publishedat).getTime();

        groups.push({
          id: mainArticle.id,
          title: mainArticle.title,
          source: mainArticle.source,
          link: mainArticle.link,
          publishedAt: mainTime, // <--- Number
          image: finalImage,
          contentsnippet: mainArticle.contentsnippet,
          storyArticles: others.map(o => ({
            source: o.source,
            title: o.title,
            link: o.link,
            publishedAt: new Date(o.publishedat).getTime() // <--- Number
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
