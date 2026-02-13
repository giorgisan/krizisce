/* lib/trendingAlgo.ts */
import { GoogleGenerativeAI } from "@google/generative-ai";

// Tipi (prilagodi po potrebi glede na tvoj types.ts)
interface Article {
  id: number;
  title: string;
  source: string;
  link: string;
  publishedat: string;
  contentsnippet?: string;
  imageurl?: string; // Dodano, če rabiš slike
  category?: string;
}

export interface TrendingGroupResult {
  id: number;
  title: string;
  source: string;
  link: string;
  publishedat: string;
  imageurl?: string;
  contentsnippet?: string;
  storyArticles: {
    source: string;
    title: string;
    link: string;
  }[];
  score: number;
}

export const TREND_WINDOW_HOURS = 12; // Okno za trende

// --- 1. AI CLUSTERING ---
async function clusterNewsWithAI(articles: Article[]): Promise<Record<string, number[]> | null> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || "");
  // Uporabimo Gemini 3 Flash zaradi hitrosti in velikega limita (10k/dan)
  const model = genAI.getGenerativeModel({ model: "models/gemini-3-flash-preview" });

  // Priprava podatkov: Pošljemo samo ID in Naslov (snippet morda ni nujen za grupiranje in špara tokene)
  // Format: "INDEX: [VIR] Naslov"
  const articlesList = articles.map((a, index) => 
    `${index}. [${a.source}] ${a.title}`
  ).join('\n');

  const prompt = `
    You are a strictly logical news clustering engine. Group these articles by TOPIC.
    
    INPUT ARTICLES:
    ${articlesList}

    RULES:
    1. Group articles that report on the EXACT SAME EVENT or STORY.
    2. A valid group must have at least 2 articles from DIFFERENT sources.
    3. Ignore single-source stories.
    4. Create a short, descriptive topic name for the key (e.g., "Požar na Krasu", "Volitve 2026").
    5. Value precision over quantity. If unsure, do not group.

    OUTPUT FORMAT:
    Return ONLY a raw JSON object where keys are topic names and values are arrays of INDICES from the input list.
    Example: { "Požar na Krasu": [0, 5, 12], "Pogačar Zmaga": [2, 8] }
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Čiščenje JSON-a (včasih AI doda ```json ... ```)
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;
    if (jsonStart === -1 || jsonEnd === -1) return null;
    
    return JSON.parse(responseText.substring(jsonStart, jsonEnd));
  } catch (error) {
    console.error("AI Clustering failed:", error);
    return null; // Vrne null, da lahko preklopimo na Jaccard
  }
}

// --- 2. JACCARD FALLBACK (Tvoja stara logika) ---
function jaccardFallback(articles: Article[]): TrendingGroupResult[] {
    // ... TUKAJ KOPIRAJ SVOJO STARO LOGIKO Jaccard Grupiranja ...
    // Zaradi preglednosti je ne bom celotne lepil, ampak veš, kaj mislim.
    // Če je nimaš shranjene, povej, pa jo rekonstruiram.
    return []; 
}


// --- 3. GLAVNA FUNKCIJA (Zdaj je ASYNC!) ---
export async function computeTrending(articles: Article[]): Promise<TrendingGroupResult[]> {
  if (!articles || articles.length === 0) return [];

  // Poskusi z AI
  const aiClusters = await clusterNewsWithAI(articles);

  if (aiClusters) {
    // ČE AI USPE: Pretvori indekse nazaj v članke
    const results: TrendingGroupResult[] = [];

    for (const [topic, indices] of Object.entries(aiClusters)) {
      const groupArticles = indices.map(i => articles[i]).filter(a => a !== undefined);

      // Filter: Vsaj 2 članka
      if (groupArticles.length < 2) continue;

      // Filter: Različni viri (AI bi moral to upoštevati, ampak preverimo)
      const uniqueSources = new Set(groupArticles.map(a => a.source));
      if (uniqueSources.size < 2) continue;

      // Določimo "Glavni" članek (najraje tisti s sliko ali najnovejši)
      // Sortiramo po tem, ali ima sliko, nato po datumu
      groupArticles.sort((a, b) => {
        if (a.imageurl && !b.imageurl) return -1;
        if (!a.imageurl && b.imageurl) return 1;
        return new Date(b.publishedat).getTime() - new Date(a.publishedat).getTime();
      });

      const mainArticle = groupArticles[0];
      const others = groupArticles.slice(1);

      results.push({
        id: mainArticle.id,
        title: mainArticle.title, // Lahko bi uporabil tudi 'topic' iz AI-ja, ampak naslov članka je bolj novinarski
        source: mainArticle.source,
        link: mainArticle.link,
        publishedat: mainArticle.publishedat,
        imageurl: mainArticle.imageurl,
        contentsnippet: mainArticle.contentsnippet,
        storyArticles: others.map(o => ({
          source: o.source,
          title: o.title,
          link: o.link
        })),
        score: uniqueSources.size * 10 // Preprosto točkovanje
      });
    }

    // Sortiraj po številu povezanih člankov (največje zgodbe na vrh)
    return results.sort((a, b) => b.storyArticles.length - a.storyArticles.length);
  }

  // ČE AI NE USPE: Uporabi stari algoritem
  console.log("Falling back to Jaccard algorithm...");
  // return jaccardFallback(articles); // Odkomentiraj, ko vstaviš staro kodo
  return []; // Zaenkrat prazno
}

// Izvozimo konstanto za Cron job
export { TREND_WINDOW_HOURS };
