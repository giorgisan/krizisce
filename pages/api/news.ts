// pages/api/news.ts

/* ==========================================================================
   1. IMPORTS & CONFIG
   ========================================================================== */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import type { NewsItem as FeedNewsItem } from '@/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
const CRON_SECRET = process.env.CRON_SECRET as string | undefined

const supabaseRead = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})
const supabaseWrite = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null

/* ==========================================================================
   2. SLOVENIAN NLP LOGIC (The "Missing" Part)
   ========================================================================== */

// 2.1. Obsežen seznam slovenskih mašil (Stopwords)
// To preprečuje, da bi se novice združevale na podlagi pogostih, a nepomembnih besed.
const SLO_STOPWORDS = new Set([
  // Predlogi in vezniki
  'v', 'na', 'ob', 'po', 'pri', 'pod', 'nad', 'za', 'do', 'od', 'z', 's',
  'in', 'ali', 'pa', 'kot', 'kjer', 'ker', 'da', 'ter', 'med', 'pred', 'čez',
  'zaradi', 'glede', 'proti', 'brez', 'kako', 'zakaj', 'kaj', 'kdo', 'kam',
  
  // Glagoli (pomožni in pogosti)
  'je', 'so', 'se', 'bo', 'bodo', 'bil', 'bila', 'bili', 'bilo', 'bi',
  'ni', 'niso', 'ne', 'sta', 'ste', 'smo', 'imajo', 'ima', 'gre', 'lahko',
  'mora', 'morajo', 'sporočili', 'pravi', 'pravijo', 'dodali',
  
  // Čas in količina
  'danes', 'včeraj', 'jutri', 'letos', 'lani', 'že', 'še', 'samo', 'le', 'tudi',
  'več', 'manj', 'veliko', 'malo', 'prvi', 'prva', 'prvo', 'drugi', 'nova', 'novi',
  'teden', 'tedna', 'mesec', 'meseca', 'leto', 'leta', 'dan', 'dni', 'ura', 'ure',
  
  // Generične novinarske besede (pomembno za odstranitev šuma)
  'foto', 'video', 'galerija', 'preberite', 'poglejte', 'članek', 'novice',
  'slovenija', 'sloveniji', 'slovenije', 'ljubljana', 'maribor', // Lokacije pogosto ne določajo *teme* dogodka
  'policija', 'policisti', 'uprava', 'agencija' // Institucije so pogosto v vseh novicah
]);

// 2.2. Slovenski Stemmer (Luščenje korenov)
// To rešuje problem: "Komenda" != "Komendi". S to funkcijo sta obe "komend".
function slovenianStemmer(word: string): string {
  if (word.length < 4) return word; // Prekratkih ne diramo
  
  const w = word.toLowerCase();
  
  // Vrstni red je važen: najprej daljše končnice
  const suffixes = [
    'ega', 'em', 'ih', 'im', 'om', 'a', 'e', 'i', 'o', 'u', 'je', 'ju', 'ama', 'ami'
  ];

  for (let i = 0; i < suffixes.length; i++) {
    const suffix = suffixes[i];
    if (w.endsWith(suffix)) {
      // Zagotovimo, da koren ostane dovolj dolg (vsaj 3 črke)
      const potentialStem = w.slice(0, -suffix.length);
      if (potentialStem.length >= 3) {
        return potentialStem;
      }
    }
  }
  return w;
}

// 2.3. Tokenizacija (Čiščenje teksta)
const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function tokenize(text: string): string[] {
  // Odstranimo HTML in posebne znake
  const clean = text.replace(/<[^>]+>/g, ' ').toLowerCase();
  const normalized = unaccent(clean);
  
  // Razbijemo na besede
  const rawTokens = normalized.split(/[^a-z0-9čšž]+/);
  const validTokens: string[] = [];

  for (let i = 0; i < rawTokens.length; i++) {
    const t = rawTokens[i];
    // Filtriramo kratke besede in stop besede
    if (t.length > 2 && !SLO_STOPWORDS.has(t)) {
      // Uporabimo stemmer na vsaki besedi
      validTokens.push(slovenianStemmer(t));
    }
  }
  return validTokens;
}

/* ==========================================================================
   3. HELPER FUNCTIONS (URL, Dates)
   ========================================================================== */
function cleanUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim())
    u.protocol = 'https:'
    u.host = u.host.toLowerCase().replace(/^www\./, '')
    const TRACK = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^ref$/i, /^src$/i, /^si_src$/i]
    
    // Uporaba Array.from za kompatibilnost
    const params = Array.from(u.searchParams.entries());
    for (let i = 0; i < params.length; i++) {
        if (TRACK.some((rx) => rx.test(params[i][0]))) {
            u.searchParams.delete(params[i][0]);
        }
    }

    u.pathname = u.pathname.replace(/\/amp\/?$/i, '/').replace(/\/+$/, '')
    u.hash = ''
    if (u.host.endsWith('rtvslo.si')) u.host = 'rtvslo.si'
    return u
  } catch { return null }
}

function makeLinkKey(raw: string, iso?: string | null): string {
  const u = cleanUrl(raw)
  if (!u) return raw.trim()
  
  const nums: string[] = []
  const pathNums = u.pathname.match(/\d{6,}/g)
  if (pathNums) nums.push(...pathNums)

  // Array.from za kompatibilnost
  const params = Array.from(u.searchParams.entries());
  for (let i = 0; i < params.length; i++) {
      if (/^\d{6,}$/.test(params[i][1])) nums.push(params[i][1])
  }

  if (nums.length > 0) {
      nums.sort((a, b) => b.length - a.length);
      return `https://${u.host}/a/${nums[0]}`
  }

  const parts = u.pathname.split('/').filter(Boolean)
  const last = (parts.length ? parts[parts.length - 1] : '').replace(/\.[a-z0-9]+$/i, '')
  
  let day = '';
  if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(+d)) {
          day = d.toISOString().slice(0, 10).replace(/-/g, '');
      }
  }
  
  if (last && day) return `https://${u.host}/a/${day}-${last.toLowerCase()}`
  return `https://${u.host}${u.pathname}`
}

/* ==========================================================================
   4. DB & DATA MAPPING
   ========================================================================== */
function resolveTimestamps(item: FeedNewsItem) {
  const parse = (v?: string | null) => v ? Date.parse(v) : NaN
  let ms = parse(item.isoDate) || parse(item.pubDate) || (typeof item.publishedAt === 'number' ? item.publishedAt : Date.now())
  if (Number.isNaN(ms)) ms = Date.now()
  return { ms, iso: new Date(ms).toISOString() }
}

function feedItemToDbRow(item: FeedNewsItem) {
  const linkRaw = (item.link || '').trim()
  const ts = resolveTimestamps(item)
  const linkKey = makeLinkKey(linkRaw, ts.iso)
  if (!linkKey || !item.title) return null
  
  const snippet = (item.contentSnippet || item.content || '').replace(/<[^>]+>/g, ' ').slice(0, 500).trim()

  return {
    link: linkRaw,
    link_canonical: cleanUrl(linkRaw)?.toString() || linkRaw,
    link_key: linkKey,
    title: item.title.trim(),
    source: (item.source || '').trim(),
    image: item.image?.trim() || null,
    contentsnippet: snippet,
    summary: snippet,
    published_at: ts.iso,
    publishedat: ts.ms,
  }
}

function rowToItem(r: any): any {
  return {
    title: r.title,
    link: r.link_canonical || r.link,
    source: r.source,
    image: r.image,
    contentSnippet: r.summary || r.contentsnippet,
    publishedAt: Number(r.publishedat) || 0
  }
}

/* ==========================================================================
   5. CLUSTERING LOGIC (TF-IDF + COSINE SIMILARITY)
   ========================================================================== */
const TREND_WINDOW_HOURS = 18
const TREND_MIN_SOURCES = 2
const TREND_MAX_ITEMS = 60
const SIMILARITY_THRESHOLD = 0.30 // Malenkost nižji prag za boljšo občutljivost

function computeVectors(docs: { id: number, tokens: string[] }[]) {
  const df = new Map<string, number>();
  const N = docs.length;

  // 1. Document Frequency
  for (let i = 0; i < docs.length; i++) {
    // Unique tokens per doc
    const unique = new Set(docs[i].tokens);
    const uniqueArr = Array.from(unique); // Kompatibilnost
    for(let j=0; j<uniqueArr.length; j++) {
        const t = uniqueArr[j];
        df.set(t, (df.get(t) || 0) + 1);
    }
  }

  // 2. TF-IDF Vectors
  return docs.map(doc => {
    const vec = new Map<string, number>();
    const tf = new Map<string, number>();
    
    // Count TF
    for(let k=0; k<doc.tokens.length; k++) {
        const t = doc.tokens[k];
        tf.set(t, (tf.get(t) || 0) + 1);
    }

    let magnitudeSq = 0;
    
    // Calculate weights
    // Uporabljamo Array.from za iteracijo map-a zaradi kompatibilnosti
    const tfEntries = Array.from(tf.entries());
    for(let m=0; m<tfEntries.length; m++) {
        const [term, count] = tfEntries[m];
        const docFreq = df.get(term) || 0;
        const idf = Math.log(N / (docFreq + 1)) + 1;
        const weight = count * idf;
        
        vec.set(term, weight);
        magnitudeSq += weight * weight;
    }

    return { id: doc.id, vec, magnitude: Math.sqrt(magnitudeSq) };
  });
}

function cosineSimilarity(v1: Map<string, number>, mag1: number, v2: Map<string, number>, mag2: number): number {
  if (!mag1 || !mag2) return 0;
  
  let dot = 0;
  // Optimizacija: iteriramo po manjšem vektorju
  const [smaller, larger] = v1.size < v2.size ? [v1, v2] : [v2, v1];
  
  const entries = Array.from(smaller.entries());
  for(let i=0; i<entries.length; i++) {
      const [term, val1] = entries[i];
      const val2 = larger.get(term);
      if (val2) {
          dot += val1 * val2;
      }
  }
  
  return dot / (mag1 * mag2);
}

async function getTrendingItems() {
  const cutoff = Date.now() - TREND_WINDOW_HOURS * 3600000;
  
  // Pridobimo podatke iz baze
  const { data: rows, error } = await supabaseRead
    .from('news')
    .select('*')
    .gt('publishedat', cutoff)
    .order('publishedat', { ascending: false })
    .limit(400);

  if (error || !rows || !rows.length) return [];

  // Priprava dokumentov za analizo
  const docs = rows.map((r, i) => {
    // Združimo naslov in povzetek, naslov ponovimo za večjo težo
    const text = `${r.title} ${r.title} ${r.summary || ''}`;
    return {
        id: i,
        row: r,
        tokens: tokenize(text), // Tu se zgodi čarovnija (Stopwords + Stemming)
        ms: Number(r.publishedat)
    };
  }).filter(d => d.tokens.length > 0);

  // Izračun vektorjev
  const vectors = computeVectors(docs.map(d => ({ id: d.id, tokens: d.tokens })));
  const enriched = docs.map((d, i) => ({ ...d, ...vectors[i] }));

  // Grupiranje (Clustering)
  const clusters: typeof enriched[] = [];
  const assigned = new Set<number>();

  // Sortiramo po času (novejši so "magneti" za grupiranje)
  enriched.sort((a, b) => b.ms - a.ms);

  for (let i = 0; i < enriched.length; i++) {
      const doc = enriched[i];
      if (assigned.has(doc.id)) continue;

      const cluster = [doc];
      assigned.add(doc.id);

      for (let j = 0; j < enriched.length; j++) {
          const other = enriched[j];
          if (assigned.has(other.id)) continue;

          const sim = cosineSimilarity(doc.vec, doc.magnitude, other.vec, other.magnitude);
          
          // Časovni penalty: starejše novice morajo biti bolj podobne, da se združijo
          const hoursDiff = Math.abs(doc.ms - other.ms) / 36e5;
          let threshold = SIMILARITY_THRESHOLD;
          if (hoursDiff > 10) threshold += 0.15;

          if (sim > threshold) {
              cluster.push(other);
              assigned.add(other.id);
          }
      }
      clusters.push(cluster);
  }

  // Formatiranje rezultatov
  const results = [];
  for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      
      const sources = new Set(cluster.map(c => c.row.source));
      if (sources.size < TREND_MIN_SOURCES) continue; // Ignoriramo teme, ki jih pokriva le en vir

      const leader = cluster[0]; // Najnovejši članek je glavni
      const storyArticles = cluster
        .filter(c => c.id !== leader.id)
        .map(c => ({
            source: c.row.source,
            link: c.row.link_canonical || c.row.link,
            title: c.row.title,
            publishedAt: c.ms
        }));

      results.push({
          ...rowToItem(leader.row),
          storyArticles,
          clusterSize: sources.size,
          freshness: leader.ms
      });
  }

  // Končno sortiranje: "Vročina" novice
  results.sort((a, b) => {
      // Formula: (število različnih virov * 3) - (starost v urah)
      const ageHoursA = (Date.now() - a.freshness) / 36e5;
      const ageHoursB = (Date.now() - b.freshness) / 36e5;
      
      const scoreA = (a.clusterSize * 3) - ageHoursA;
      const scoreB = (b.clusterSize * 3) - ageHoursB;
      
      return scoreB - scoreA;
  });

  return results.slice(0, TREND_MAX_ITEMS);
}

/* ==========================================================================
   6. API HANDLER
   ========================================================================== */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { variant, forceFresh } = req.query;

    // A) Vrača grupirane "Trending" novice
    if (variant === 'trending') {
      try {
        const items = await getTrendingItems();
        res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=60');
        return res.status(200).json(items);
      } catch (err: any) {
        console.error("Trending Error:", err);
        return res.status(500).json({ error: err.message });
      }
    }

    // B) Ingest (Osveževanje virov)
    const canIngest = forceFresh === '1' && (
        process.env.ALLOW_PUBLIC_REFRESH === '1' || 
        req.query.token === CRON_SECRET ||
        process.env.NODE_ENV !== 'production'
    );

    if (canIngest) {
      // Asinhrono osveževanje (ne čakamo, da se konča)
      fetchRSSFeeds({ forceFresh: true })
        .then(rss => {
           if (rss && rss.length) {
               const rows = rss.map(feedItemToDbRow).filter(Boolean);
               if (supabaseWrite) {
                   return (supabaseWrite as any).from('news').upsert(rows, { 
                       onConflict: 'link_key', 
                       ignoreDuplicates: true 
                   });
               }
           }
        })
        .catch(err => console.error("Ingest Error:", err));
    }

    // C) Navaden seznam novic (Latest)
    const limit = Math.min(Number(req.query.limit) || 60, 100);
    const cursor = req.query.cursor ? Number(req.query.cursor) : null;

    let q = supabaseRead
        .from('news')
        .select('*')
        .order('publishedat', { ascending: false })
        .limit(limit);

    if (req.query.source && req.query.source !== 'Vse') {
        q = q.eq('source', req.query.source);
    }
    if (cursor) {
        q = q.lt('publishedat', cursor);
    }
    
    const { data, error } = await q;
    
    if (error) throw error;
    
    const items = (data || []).map(rowToItem);
    
    // De-duplikacija za navaden seznam (mehka)
    const dedupedItems = [];
    const seenKeys = new Set();
    
    for(const item of items) {
        // Enostavnejši key za dedup: vir + normaliziran naslov
        const key = item.source + '|' + unaccent(item.title).toLowerCase().slice(0, 20);
        if(!seenKeys.has(key)) {
            dedupedItems.push(item);
            seenKeys.add(key);
        }
    }

    const nextCursor = data && data.length === limit ? data[data.length-1].publishedat : null;
    
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    if (req.query.paged === '1') {
        return res.status(200).json({ items: dedupedItems, nextCursor });
    }
    return res.status(200).json(dedupedItems);

  } catch (e: any) {
    console.error("API Error:", e);
    res.status(500).json({ error: e.message || 'Unknown error' });
  }
}
