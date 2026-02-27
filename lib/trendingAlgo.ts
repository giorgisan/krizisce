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

// --- 4. AI CLUSTERING (Gemini 2.0 Flash - WITH SAFETY & RETRY) ---
async function clusterNewsWithAI(articles: Article[], retries = 2): Promise<Record<string, number[]> | null> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || "");
  // Nasvet: Če bo 2.0 še vedno pogosto javljal napake, ga tukaj lahko spremeniš v "models/gemini-1.5-flash", ki ima večje kvote.
  const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" }); 

  const articlesList = articles.map((a, index) => {
    const snippet = a.contentsnippet ? ` | ${a.contentsnippet.substring(0, 80).replace(/\n/g, ' ')}` : '';
    return `ID:${index} [${a.source}] TITLE:"${a.title}"${snippet}`;
  }).join('\n');

  // --- STRICT PROMPT ---
  const prompt = `
    You are a professional news editor. Group articles into clusters that belong to the EXACT SAME EVENT.
    
    INPUT:
    ${articlesList}

    STRICT RULES FOR GROUPING:
    1. **SAME MAIN EVENT ONLY**: Group the main report together with direct reactions and analysis of THAT specific event.
       - "Domen Prevc wins gold" AND "Coach praises Domen" -> GROUP TOGETHER.
    
    2. **CRITICAL: DO NOT MIX PEOPLE**: 
       - "Nikola Jokić" (Basketball) and "Domen Prevc" (Ski Jumping) are totally different. SEPARATE THEM.
       - "Nika Prevc" and "Domen Prevc" are different athletes. SEPARATE THEM unless it's a Mixed Team event.

    3. **HANDLING "BRIDGE" HEADLINES**: 
       - If a headline mentions two people (e.g., "Nika wants to be like Domen"), put it in the Active Subject's group (Nika). Do NOT pull Domen's old articles into it.

    4. **UNIQUE ASSIGNMENT**: Each article ID should appear in at most ONE cluster. Do not repeat the same ID in multiple clusters.

    5. **Output format**: JSON only. Keys are short Slovenian topic summaries. Values are arrays of IDs.

    RESPONSE FORMAT (JSON ONLY):
    {
      "Zlato za Domna Prevca": [1, 2, 5], 
      "Jokićev rekord": [8, 9],
      "Smrt Navalnega": [10, 11, 12]
    }
  `;

  // RETRY MEHANIZEM: Poskusi večkrat, če dobiš 429
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const responseText = result.response.text();
      return JSON.parse(responseText);
      
    } catch (error: any) {
      // Preverimo, če gre za omejitev prometa in imamo še kakšen poskus na voljo
      if (error.status === 429 && attempt < retries) {
         console.warn(`⚠️ API Limit 429 hit. Attempt ${attempt}/${retries}. Waiting ${attempt * 5}s before retry...`);
         // Počakamo 5 sekund pri prvem poskusu, 10 pri drugem... (Exponential backoff)
         await new Promise(resolve => setTimeout(resolve, attempt * 5000));
         continue; // Pojdi v nov krog zanke in poskusi ponovno
      }
      
      // Če napaka ni 429 ali pa so nam zmanjkali poskusi, vrni null (sproži Jaccard fallback)
      console.error("❌ AI Clustering failed definitively:", error);
      return null; 
    }
  }
  
  return null;
}


// --- 5. GLAVNA FUNKCIJA (Z VARNOSTNO ZANKO IN DEDUP) ---
export async function computeTrending(articles: Article[]): Promise<TrendingGroupResult[]> {
  if (!articles || articles.length === 0) return [];

  // A) Poskusi z AI
  const aiClusters = await clusterNewsWithAI(articles);

  if (aiClusters) {
    const results: TrendingGroupResult[] = [];
    const usedArticleIds = new Set<number>(); // <-- NOVO: Sledenje že uporabljenih člankov

    for (const [topic, indices] of Object.entries(aiClusters)) {
      // 1. Zberi članke IN filtriraj tiste, ki so že v kakšni drugi skupini
      let groupArticles = indices
        .map(i => articles[i])
        .filter(a => a !== undefined && !usedArticleIds.has(a.id));

      if (groupArticles.length < 2) continue;

      // 2. Določi glavnega
      groupArticles.sort((a, b) => {
        const imgA = a.image || a.imageurl;
        const imgB = b.image || b.imageurl;
        if (imgA && !imgB) return -1;
        if (!imgA && imgB) return 1;
        return getTime(b.publishedat) - getTime(a.publishedat); 
      });

      const mainArticle = groupArticles[0];
      const mainKeywords = preprocessTitle(mainArticle.title);

      // --- 3. SAFETY CHECK (VARNOSTNA ZANKA) ---
      const validArticles = [mainArticle];
      const rejectedArticles: Article[] = [];

      for (let i = 1; i < groupArticles.length; i++) {
          const candidate = groupArticles[i];
          const candidateKeywords = preprocessTitle(candidate.title);
          
          const hasOverlap = [...mainKeywords].some(k => candidateKeywords.has(k));

          if (hasOverlap) {
              validArticles.push(candidate);
          } else {
              rejectedArticles.push(candidate);
          }
      }
      
      // Če smo po čiščenju ostali sami (ali premalo), grupo ignoriramo
      if (validArticles.length < 2) continue;
      
      // Posodobimo groupArticles na prečiščen seznam
      groupArticles = validArticles;
      const uniqueSources = new Set(groupArticles.map(a => a.source));

      // Ponovno preveri pogoje po čiščenju
      if (uniqueSources.size < 2 && groupArticles.length < 3) continue;

      // --- FILTER: Ignoriraj Horoskop/Vreme/itd. ---
      const titleLower = mainArticle.title.toLowerCase();
      const topicLower = topic.toLowerCase();
      const isIgnored = Array.from(IGNORED_TOPICS).some(ignoredWord => 
          titleLower.includes(ignoredWord) || topicLower.includes(ignoredWord)
      );

      if (isIgnored) continue;
      
      // --- NOVO: Zakleni članke, da se ne pojavijo v naslednji zanki ---
      groupArticles.forEach(a => usedArticleIds.add(a.id));

      const others = groupArticles.slice(1);
      const finalImage = mainArticle.image || mainArticle.imageurl;
      const mainTime = getTime(mainArticle.publishedat);

      // --- TOČKOVANJE Z GRAVITACIJO ---
      const rawScore = (uniqueSources.size * 50) + groupArticles.length;
      const hoursOld = Math.max(0, (Date.now() - mainTime) / (1000 * 60 * 60));
      const gravity = Math.pow(hoursOld + 2, 1.2); 
      
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
        score: rawScore / gravity 
      });
    }

    return results.sort((a, b) => b.score - a.score);
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

    for (let j = i + 1; j < processedArticles.length; j++) {
      if (processedArticles[j].assigned) continue;
      
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

        const rawScore = (uniqueSources.size * 50) + currentGroup.length;
        const hoursOld = Math.max(0, (Date.now() - mainTime) / (1000 * 60 * 60));
        const gravity = Math.pow(hoursOld + 2, 1.2); 

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
          score: rawScore / gravity
        });
      }
    }
  }

  return groups.sort((a, b) => b.score - a.score);
}
