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
   2. URL HANDLING
   ========================================================================== */
function cleanUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim())
    u.protocol = 'https:'
    u.host = u.host.toLowerCase().replace(/^www\./, '')

    const TRACK = [
      /^utm_/i, /^fbclid$/i, /^gclid$/i, /^ref$/i, /^src$/i, /^from$/i,
      /^si_src$/i, /^mc_cid$/i, /^mc_eid$/i,
    ]
    for (const [k] of Array.from(u.searchParams.entries())) {
      if (TRACK.some((rx) => rx.test(k))) u.searchParams.delete(k)
    }

    // Cleanup specific path issues
    u.pathname = u.pathname.replace(/\/amp\/?$/i, '/')
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '')
    u.hash = ''
    if (u.host.endsWith('rtvslo.si')) u.host = 'rtvslo.si'

    return u
  } catch {
    return null
  }
}

function yyyymmdd(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(+d)) return null
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${dd}`
}

function makeLinkKey(raw: string, iso?: string | null): string {
  const u = cleanUrl(raw)
  if (!u) return raw.trim()

  const nums: string[] = []
  const pathNums = u.pathname.match(/\d{6,}/g)
  if (pathNums) nums.push(...pathNums)

  for (const [, v] of Array.from(u.searchParams.entries())) {
    if (/^\d{6,}$/.test(v)) nums.push(v)
  }

  const numericId = nums.sort((a, b) => b.length - a.length)[0]
  if (numericId) return `https://${u.host}/a/${numericId}`

  const parts = u.pathname.split('/').filter(Boolean)
  let last = parts.length ? parts[parts.length - 1] : ''
  last = last.replace(/\.[a-z0-9]+$/i, '')

  const day = yyyymmdd(iso) ?? ''
  if (last && day) return `https://${u.host}/a/${day}-${last.toLowerCase()}`
  if (last) return `https://${u.host}/a/${last.toLowerCase()}`

  return `https://${u.host}${u.pathname}`
}

/* ==========================================================================
   3. DB TYPES & HELPERS
   ========================================================================== */
type Row = {
  id: number
  link: string
  link_canonical: string | null
  link_key: string | null
  title: string
  source: string
  image: string | null
  contentsnippet: string | null
  summary: string | null
  isodate: string | null
  pubdate: string | null
  published_at: string | null
  publishedat: number | null
  created_at: string | null
}

export type NewsItem = {
  title: string
  link: string
  source: string
  image?: string | null
  contentSnippet?: string | null
  publishedAt: number
  isoDate?: string | null
}

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normTitle = (s: string) => unaccent(s).toLowerCase().replace(/\s+/g, ' ').trim()
const tsSec = (ms?: number | null) => Math.max(0, Math.floor((typeof ms === 'number' ? ms : 0) / 1000))

function softDedupe<T extends { source?: string; title?: string; publishedAt?: number }>(arr: T[]): T[] {
  const byKey = new Map<string, T>()
  for (const it of arr) {
    const key = `${(it.source || '').trim()}|${normTitle(it.title || '')}|${tsSec(it.publishedAt || 0)}`
    const prev = byKey.get(key)
    if (!prev || (it.publishedAt || 0) > (prev.publishedAt || 0)) {
      byKey.set(key, it)
    }
  }
  return Array.from(byKey.values())
}

function normalizeSnippet(item: FeedNewsItem): string | null {
  const snippet = (item.contentSnippet || '').trim()
  if (snippet) return snippet
  const fromContent = (item.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return fromContent || null
}

function resolveTimestamps(item: FeedNewsItem) {
  const parse = (value?: string | null) => {
    if (!value) return null
    const t = Date.parse(value)
    return Number.isNaN(t) ? null : { raw: value, ms: t, iso: new Date(t).toISOString() }
  }
  const fromIso = parse(item.isoDate)
  const fromPub = parse(item.pubDate)
  const msFromNumber = typeof item.publishedAt === 'number' && item.publishedAt > 0 ? item.publishedAt : null
  
  const ms = fromIso?.ms ?? fromPub?.ms ?? msFromNumber ?? Date.now()
  const iso = fromIso?.iso ?? fromPub?.iso ?? new Date(ms).toISOString()
  
  return { ms: Math.round(ms), iso, isoRaw: fromIso?.raw ?? fromPub?.raw ?? iso, pubRaw: fromPub?.raw ?? null }
}

function feedItemToDbRow(item: FeedNewsItem) {
  const linkRaw = (item.link || '').trim()
  const ts = resolveTimestamps(item)
  const linkCanonical = cleanUrl(linkRaw)?.toString() || linkRaw
  const linkKey = makeLinkKey(linkRaw, ts.iso)
  const title = (item.title || '').trim()
  const source = (item.source || '').trim()
  
  if (!linkKey || !title || !source) return null
  const snippet = normalizeSnippet(item)

  return {
    link: linkRaw,
    link_canonical: linkCanonical,
    link_key: linkKey,
    title,
    source,
    image: item.image?.trim() || null,
    contentsnippet: snippet,
    summary: snippet,
    isodate: ts.isoRaw,
    pubdate: ts.pubRaw,
    published_at: ts.iso,
    publishedat: ts.ms,
  }
}

async function syncToSupabase(items: FeedNewsItem[]) {
  if (!supabaseWrite) return
  const shaped = items.map((i) => {
    const t = resolveTimestamps(i)
    return { ...i, title: i.title || '', source: i.source || '', publishedAt: t.ms }
  })
  const dedupedIn = softDedupe(shaped)
  const rows = dedupedIn.map(feedItemToDbRow).filter(Boolean) as any[]
  if (!rows.length) return

  const { error } = await (supabaseWrite as any).from('news').upsert(rows, {
    onConflict: 'link_key',
    ignoreDuplicates: true,
  })
  if (error) throw error
}

const toMs = (s?: string | null) => {
  if (!s) return 0
  const v = Date.parse(s)
  return Number.isFinite(v) ? v : 0
}

function rowToItem(r: Row): NewsItem {
  const ms = (r.publishedat && Number(r.publishedat)) || toMs(r.published_at) || toMs(r.pubdate) || Date.now()
  return {
    title: r.title,
    link: r.link_canonical || r.link || '',
    source: r.source,
    image: r.image || null,
    contentSnippet: r.summary?.trim() || r.contentsnippet?.trim() || null,
    publishedAt: ms,
    isoDate: r.published_at || r.isodate || null,
  }
}

/* ==========================================================================
   4. ADVANCED CLUSTERING (TF-IDF & COSINE SIMILARITY)
   ========================================================================== */

const TREND_WINDOW_HOURS = 12 // Povečano okno za zaznavanje, a zmanjšana relevantnost
const TREND_MIN_SOURCES = 2
const TREND_MAX_ITEMS = 60
const SIMILARITY_THRESHOLD = 0.35 // Cosine similarity: 0 = različno, 1 = identično. 0.35 je dober prag za kratke tekste.

// Razširjen seznam stop besed
const STOPWORDS = new Set([
  'v', 'na', 'ob', 'po', 'pri', 'pod', 'nad', 'za', 'do', 'od', 'z', 's',
  'in', 'ali', 'pa', 'kot', 'je', 'so', 'se', 'bo', 'bodo', 'bil', 'bila',
  'bili', 'bilo', 'bi', 'ko', 'ker', 'da', 'ne', 'ni', 'sta', 'ste', 'smo',
  'iz', 'ter', 'kjer', 'kako', 'zakaj', 'kaj', 'kdo', 'kam', 'kadar',
  'le', 'še', 'samo', 'tudi', 'lahko', 'mora', 'morajo', 'gre', 'imajo', 'ima',
  'danes', 'včeraj', 'jutri', 'teden', 'mesec', 'leto', 'čas', 'ura',
  'video', 'foto', 'preberite', 'poglejte', 'novice', 'članek', 'podrobnosti',
  'slovenija', 'sloveniji', 'slovenije', 'svet', 'evropa',
  'prvi', 'drugi', 'tretji', 'nova', 'novi', 'novo', 'velik', 'malo', 'več',
  'zaradi', 'glede', 'proti', 'brez', 'med', 'pred', 'čez',
  'policija', 'sporočili', 'uprava', 'agencija', // generični viri
]);

type StoryArticle = {
  source: string;
  link: string;
  title: string;
  summary: string | null;
  publishedAt: number;
}

// Tokenizacija in čiščenje
function tokenize(text: string): string[] {
  // Ohranimo alfanumerične znake in šumnike
  const clean = text.replace(/<[^>]+>/g, ' ').toLowerCase();
  const normalized = unaccent(clean); // Odstranimo šumnike za ujemanje
  // Razbijemo na besede, ohranimo številke (pomembno za 81-letnica)
  return normalized
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

// Ekstrakcija "močnih" entitet (Besede z veliko začetnico v originalu)
function extractEntities(text: string): Set<string> {
    const entities = new Set<string>();
    // Odstranimo HTML
    const clean = text.replace(/<[^>]+>/g, ' ');
    // Najdemo besede z veliko začetnico, ki niso na začetku stavka (preprosta hevristika)
    // Ali pa preprosto vse z veliko začetnico, če so daljše od 3 črk
    const words = clean.split(/\s+/);
    for (const w of words) {
        const cleanW = w.replace(/[.,:;!?()"']/g, '');
        if (cleanW.length > 3 && /^[A-ZČŠŽ]/.test(cleanW)) {
             // Normaliziramo entiteto
             entities.add(unaccent(cleanW.toLowerCase()));
        }
        // Dodamo številke kot entitete (starosti, rezultati)
        if (/\d+/.test(cleanW)) {
            entities.add(cleanW);
        }
    }
    return entities;
}

// Izračun TF-IDF vektorjev
function computeTFIDFVectors(docs: { id: number, tokens: string[], entities: Set<string> }[]) {
    const df = new Map<string, number>(); // Document Frequency
    const N = docs.length;

    // 1. Izračun DF (v koliko dokumentih se pojavi beseda)
    for (const doc of docs) {
        const seen = new Set(doc.tokens);
        for (const token of seen) {
            df.set(token, (df.get(token) || 0) + 1);
        }
    }

    // 2. Kreiranje vektorjev
    return docs.map(doc => {
        const vec = new Map<string, number>();
        const tf = new Map<string, number>();
        
        // Term Frequency
        for (const t of doc.tokens) tf.set(t, (tf.get(t) || 0) + 1);

        let magnitudeSq = 0;

        for (const [term, freq] of tf.entries()) {
            // IDF: log(N / (df + 1)) + 1
            const docFreq = df.get(term) || 0;
            const idf = Math.log(N / (docFreq + 1)) + 1;
            
            let weight = freq * idf;

            // BONUS: Če je beseda tudi prepoznana ENTITETA (Velika začetnica/Številka),
            // ji drastično povečamo težo (x 2.5). To reši problem "Kristina Hojs".
            if (doc.entities.has(term)) {
                weight *= 2.5; 
            }

            vec.set(term, weight);
            magnitudeSq += weight * weight;
        }

        return { 
            id: doc.id, 
            vec, 
            magnitude: Math.sqrt(magnitudeSq) 
        };
    });
}

// Kosinusna podobnost
function cosineSimilarity(v1: Map<string, number>, mag1: number, v2: Map<string, number>, mag2: number): number {
    if (mag1 === 0 || mag2 === 0) return 0;
    
    let dot = 0;
    // Iteriramo čez manjši vektor za hitrost
    const [smaller, larger] = v1.size < v2.size ? [v1, v2] : [v2, v1];
    
    for (const [term, val1] of smaller.entries()) {
        const val2 = larger.get(term);
        if (val2) {
            dot += val1 * val2;
        }
    }
    
    return dot / (mag1 * mag2);
}

async function fetchTrendingRows(): Promise<Row[]> {
  const cutoffMs = Date.now() - TREND_WINDOW_HOURS * 3_600_000
  const { data, error } = await supabaseRead
    .from('news')
    .select('id, link, link_canonical, link_key, title, source, image, contentsnippet, summary, publishedat, isodate, pubdate, created_at')
    .gt('publishedat', cutoffMs)
    .order('publishedat', { ascending: false })
    .limit(300) // Vzamemo večji set za boljši IDF kontekst

  if (error) throw new Error(`DB trending: ${error.message}`)
  return (data || []) as Row[]
}

function computeTrendingFromRows(rows: Row[]): (NewsItem & { storyArticles: StoryArticle[] })[] {
    if (!rows.length) return [];

    // 1. Priprava dokumentov za NLP
    const docs = rows.map((r, idx) => {
        const title = (r.title || '').trim();
        const snippet = (r.summary || r.contentsnippet || '').trim();
        // Združimo naslov in kratek del vsebine, naslov ponovimo 2x za večjo težo
        const text = `${title} ${title} ${snippet}`; 
        
        return {
            id: idx,
            row: r,
            tokens: tokenize(text),
            entities: extractEntities(title + ' ' + snippet), // Iščemo entitete v originalnem tekstu
            ms: (r.publishedat && Number(r.publishedat)) || toMs(r.published_at) || Date.now()
        };
    }).filter(d => d.tokens.length > 0);

    // 2. Izračun vektorjev (TF-IDF)
    const vectors = computeTFIDFVectors(docs.map(d => ({ id: d.id, tokens: d.tokens, entities: d.entities })));

    // Povežemo vektorje nazaj z metapodatki
    const enrichedDocs = docs.map((d, i) => ({ ...d, vector: vectors[i] }));

    // 3. Clustering (Hierarchical / Greedy Agglomerative approach)
    // Razvrstimo po času (najnovejši prvi so "centri" grozdov)
    enrichedDocs.sort((a, b) => b.ms - a.ms);

    const clusters: typeof enrichedDocs[] = [];
    const assigned = new Set<number>();

    for (const doc of enrichedDocs) {
        if (assigned.has(doc.id)) continue;

        // Ustvari nov cluster z trenutnim člankom kot jedrom
        const currentCluster = [doc];
        assigned.add(doc.id);

        // Poišči vse ostale ne-dodeljene članke, ki so dovolj podobni
        for (const other of enrichedDocs) {
            if (assigned.has(other.id)) continue;

            const similarity = cosineSimilarity(
                doc.vector.vec, doc.vector.magnitude,
                other.vector.vec, other.vector.magnitude
            );

            // Dinamičen prag: Če je časovna razlika majhna (< 4h), je prag nižji.
            // Če je velika, mora biti podobnost zelo visoka.
            const timeDiffHours = Math.abs(doc.ms - other.ms) / 36e5;
            let threshold = SIMILARITY_THRESHOLD;
            if (timeDiffHours > 6) threshold += 0.15; // Penalty za stare novice

            if (similarity > threshold) {
                currentCluster.push(other);
                assigned.add(other.id);
            }
        }
        clusters.push(currentCluster);
    }

    // 4. Filtriranje in oblikovanje rezultatov
    const results: (NewsItem & { storyArticles: StoryArticle[] })[] = [];

    for (const cluster of clusters) {
        // Filtriraj clustre, ki nimajo dovolj različnih virov (prepreči spam enega medija)
        const sources = new Set(cluster.map(c => c.row.source));
        if (sources.size < TREND_MIN_SOURCES) continue;

        // Najdi "glavni" članek (najbolj svež ali najbolj reprezentativen)
        // Ker smo sortirali na začetku po času, je cluster[0] najnovejši
        const leader = cluster[0];
        
        const stories: StoryArticle[] = cluster
            .filter(c => c.id !== leader.id) // Vsi razen glavnega
            .map(c => ({
                source: c.row.source,
                link: c.row.link_canonical || c.row.link,
                title: c.row.title,
                summary: c.row.summary || c.row.contentsnippet,
                publishedAt: c.ms
            }));

        results.push({
            ...rowToItem(leader.row),
            storyArticles: stories
        });
    }

    // 5. Ranking - najbolj vroče novice na vrh
    // Formula: (število virov * 2) + (novost v urah * -1)
    results.sort((a, b) => {
        const scoreA = (new Set(a.storyArticles.map(s => s.source)).size + 1) * 10;
        const scoreB = (new Set(b.storyArticles.map(s => s.source)).size + 1) * 10;
        // Penaliziraj starejše od 12h
        const ageA = (Date.now() - a.publishedAt) / 36e5;
        const ageB = (Date.now() - b.publishedAt) / 36e5;
        
        return (scoreB - ageB) - (scoreA - ageA);
    });

    return results.slice(0, TREND_MAX_ITEMS);
}

/* ==========================================================================
   5. API HANDLER
   ========================================================================== */
type PagedOk = { items: NewsItem[]; nextCursor: number | null }
type ListOk = NewsItem[]
type Err = { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PagedOk | ListOk | Err>,
) {
  try {
    const paged = req.query.paged === '1'
    const wantsFresh = req.query.forceFresh === '1'
    const source = (req.query.source as string) || null
    const variant = (req.query.variant as string) || 'latest'

    // --- TRENDING VARIANT (Improved) ---
    if (variant === 'trending') {
      try {
        const rows = await fetchTrendingRows()
        const items = computeTrendingFromRows(rows)
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60') 
        return res.status(200).json(items as any)
      } catch (err: any) {
        console.error('Trending fail:', err)
        return res.status(500).json({ error: err?.message || 'Trending error' })
      }
    }

    // --- INGEST LOGIC ---
    const headerSecret = (req.headers['x-cron-secret'] as string | undefined)?.trim()
    const isCronCaller = Boolean(CRON_SECRET && headerSecret && headerSecret === CRON_SECRET)
    const isInternalIngest = req.headers['x-krizisce-ingest'] === '1'
    const isDev = process.env.NODE_ENV !== 'production'
    const tokenOk = CRON_SECRET && req.query.token === CRON_SECRET
    const allowPublic = process.env.ALLOW_PUBLIC_REFRESH === '1'
    const canIngest = isCronCaller || isInternalIngest || isDev || tokenOk || allowPublic

    if (!paged && wantsFresh && canIngest) {
       // Fire and forget ingest if possible, or await slightly
       // console.log("Triggering RSS fetch...")
       fetchRSSFeeds({ forceFresh: true })
        .then(rss => rss?.length ? syncToSupabase(rss.slice(0, 250)) : null)
        .catch(err => console.error('RSS Sync error:', err));
    }

    // --- STANDARD LIST LOGIC ---
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? (paged ? 40 : 60)), 10) || 60, 1), 200)
    const cursor = req.query.cursor ? Number(req.query.cursor) : null

    let q = supabaseRead
      .from('news')
      .select('id, link, link_canonical, link_key, title, source, image, contentsnippet, summary, isodate, pubdate, published_at, publishedat, created_at')
      .gt('publishedat', 0)
      .order('publishedat', { ascending: false })
      .order('id', { ascending: false })

    if (source && source !== 'Vse') q = q.eq('source', source)
    if (cursor && cursor > 0) q = q.lt('publishedat', cursor)
    q = q.limit(limit)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: `DB: ${error.message}` })

    const rows = (data || []) as Row[]
    const rawItems = rows.map(rowToItem)
    const items = softDedupe(rawItems).sort((a, b) => b.publishedAt - a.publishedAt)
    const nextCursor = rows.length === limit ? (rows[rows.length - 1].publishedat ? Number(rows[rows.length - 1].publishedat) : null) : null

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30') 
    if (paged) return res.status(200).json({ items, nextCursor })
    return res.status(200).json(items)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
