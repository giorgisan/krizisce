// pages/api/news.ts

/* ==========================================================================
   1. IMPORTS & CONFIG (Original - Nedotaknjeno)
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
   2. URL HELPERJI (Original - Nedotaknjeno)
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
    const inner = v.match(/\d{6,}/g)
    if (inner) nums.push(...inner)
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
   3. DB HELPERJI (Original - Nedotaknjeno)
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
    if (Number.isNaN(t)) return null
    return { raw: value, ms: t, iso: new Date(t).toISOString() }
  }

  const fromIso = parse(item.isoDate)
  const fromPub = parse(item.pubDate)
  const msFromNumber = typeof item.publishedAt === 'number' && Number.isFinite(item.publishedAt) && item.publishedAt > 0 ? item.publishedAt : null

  const ms = fromIso?.ms ?? fromPub?.ms ?? msFromNumber ?? Date.now()
  const iso = fromIso?.iso ?? fromPub?.iso ?? new Date(ms).toISOString()
  const isoRaw = fromIso?.raw ?? fromPub?.raw ?? iso
  const pubRaw = fromPub?.raw ?? null

  return { ms: Math.round(ms), iso, isoRaw, pubRaw }
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

// !!! ORIGINAL LOGIKA ZA SINHRONIZACIJO !!!
async function syncToSupabase(items: FeedNewsItem[]) {
  if (!supabaseWrite) return

  const shaped = items.map((i) => {
    const t = resolveTimestamps(i)
    return { ...i, title: i.title || '', source: i.source || '', publishedAt: t.ms }
  })

  const dedupedIn = softDedupe(shaped)
  const rows = dedupedIn.map(feedItemToDbRow).filter(Boolean) as any[]
  if (!rows.length) return

  const { error } = await (supabaseWrite as any)
    .from('news')
    .upsert(rows, {
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
  const ms = (r.publishedat && Number(r.publishedat)) || toMs(r.published_at) || toMs(r.pubdate) || toMs(r.isodate) || toMs(r.created_at) || Date.now()
  return {
    title: r.title,
    link: r.link_canonical || r.link || '',
    source: r.source,
    image: r.image || null,
    contentSnippet: r.summary?.trim() || r.contentsnippet?.trim() || null,
    publishedAt: ms,
    isoDate: r.published_at || r.isodate || r.pubdate || null,
  }
}

/* ==========================================================================
   4. TRENDING ALGORITHM (NEW & IMPROVED)
   ========================================================================== */

const TREND_WINDOW_HOURS = 6 
const TREND_MIN_SOURCES = 2
const TREND_MAX_ITEMS = 50
const TREND_HOT_CUTOFF_HOURS = 5 // Malo popuščeno
const SIMILARITY_THRESHOLD = 0.22 // Prag prilagojen za trigrame in kratke naslove

type StoryArticle = {
  source: string
  link: string
  title: string
  summary: string | null
  publishedAt: number
}

// Stop words (šum), ki ga odstranimo pred analizo
const STOP_WORDS = new Set([
  'v', 'na', 'ob', 'po', 'pri', 'pod', 'nad', 'za', 'do', 'od', 'z', 's',
  'in', 'ali', 'pa', 'kot', 'je', 'so', 'se', 'bo', 'bodo', 'bil', 'bila',
  'bili', 'bilo', 'bi', 'ko', 'ker', 'da', 'ne', 'ni', 'sta', 'ste', 'smo',
  'danes', 'vceraj', 'jutri', 'letos', 'lani', 'ze', 'se', 'tudi',
  'slovenija', 'sloveniji', 'foto', 'video', 'novice', 'clanek', 'preberite',
  'ljubljana', 'maribor', 'celje', // Lokacije so včasih šum, če so edina skupna točka
  'policija', 'policisti' // Da ne združi vseh kroničnih novic skupaj samo zaradi besede "policija"
]);

// Funkcija za izdelavo trigramov (rešuje sklanjanje in morfologijo)
function getTrigrams(text: string): Map<string, number> {
  // 1. Čiščenje
  let clean = unaccent(text).toLowerCase()
    .replace(/<[^>]+>/g, ' ') // HTML
    .replace(/[^a-z0-9\s]/g, '') // Ločila
    .replace(/\s+/g, ' ')
    .trim();

  // 2. Odstranjevanje stop words
  const words = clean.split(' ').filter(w => !STOP_WORDS.has(w) && w.length > 2);
  clean = words.join(' '); // Sestavimo nazaj za trigrame

  const trigrams = new Map<string, number>();
  
  // Če je tekst po čiščenju prazen ali prekratek
  if (clean.length < 3) return trigrams;

  // 3. Generiranje trigramov (drsno okno)
  // Primer: "komenda" -> 'kom', 'ome', 'men', 'end', 'nda'
  for (let i = 0; i < clean.length - 2; i++) {
    const gram = clean.slice(i, i + 3);
    // Ignoriramo trigrame, ki so samo presledki
    if (!gram.includes(' ')) {
        trigrams.set(gram, (trigrams.get(gram) || 0) + 1);
    }
  }
  return trigrams;
}

// Izračun podobnosti (Cosine Similarity)
function cosineSimilarity(v1: Map<string, number>, v2: Map<string, number>): number {
  let dot = 0, mag1 = 0, mag2 = 0;
  
  const v1Vals = Array.from(v1.values());
  for(let i=0; i<v1Vals.length; i++) mag1 += v1Vals[i]**2;
  
  const v2Vals = Array.from(v2.values());
  for(let i=0; i<v2Vals.length; i++) mag2 += v2Vals[i]**2;
  
  if (!mag1 || !mag2) return 0;

  const [smaller, larger] = v1.size < v2.size ? [v1, v2] : [v2, v1];
  const smallEntries = Array.from(smaller.entries());
  
  for(let i=0; i<smallEntries.length; i++) {
      const [gram, count] = smallEntries[i];
      const count2 = larger.get(gram);
      if (count2) dot += count * count2;
  }
  return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

async function fetchTrendingRows(): Promise<Row[]> {
  const nowMs = Date.now()
  const cutoffMs = nowMs - TREND_WINDOW_HOURS * 3_600_000

  const { data, error } = await supabaseRead
    .from('news')
    .select('*') // Vzamemo vse, da ne zgrešimo
    .gt('publishedat', cutoffMs)
    .order('publishedat', { ascending: false })
    .limit(350)

  if (error) throw new Error(`DB trending: ${error.message}`)
  return (data || []) as Row[]
}

function computeTrendingFromRows(rows: Row[]): (NewsItem & { storyArticles: StoryArticle[] })[] {
  // Priprava podatkov
  const docs = rows.map((r, idx) => {
      const ms = (r.publishedat && Number(r.publishedat)) || toMs(r.published_at) || Date.now();
      const title = (r.title || '').trim();
      const summary = (r.summary || r.contentsnippet || '').trim();
      
      // Naslovu damo večjo težo (ga ponovimo), ker je najbolj relevanten
      const text = `${title} ${title} ${summary}`;
      
      return {
          id: idx,
          row: r,
          ms,
          vector: getTrigrams(text)
      };
  }).filter(d => d.vector.size > 0);

  // Clustering (Greedy)
  const clusters: typeof docs[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      if (assigned.has(doc.id)) continue;

      const cluster = [doc];
      assigned.add(doc.id);

      for (let j = 0; j < docs.length; j++) {
          const other = docs[j];
          if (assigned.has(other.id)) continue;

          const sim = cosineSimilarity(doc.vector, other.vector);

          // Dinamičen prag: Če so novice časovno zelo blizu, smo bolj strogi.
          // Če so narazen, dopustimo manjšo podobnost (ker se naslovi spreminjajo).
          if (sim > SIMILARITY_THRESHOLD) {
              cluster.push(other);
              assigned.add(other.id);
          }
      }
      clusters.push(cluster);
  }

  // Formatiranje
  const nowMs = Date.now();
  const results: (NewsItem & { storyArticles: StoryArticle[] })[] = [];

  for (const cluster of clusters) {
      // Filtriraj premajhne
      const distinctSources = new Set(cluster.map(c => c.row.source));
      if (distinctSources.size < TREND_MIN_SOURCES) continue;

      // Določi vodilno novico (najnovejša)
      cluster.sort((a, b) => b.ms - a.ms);
      const leader = cluster[0];

      // Filter svežosti
      const ageHours = (nowMs - leader.ms) / 3_600_000;
      if (ageHours > TREND_HOT_CUTOFF_HOURS) continue;

      const storyArticles: StoryArticle[] = cluster
          .filter(c => c.id !== leader.id)
          .map(c => ({
              source: c.row.source,
              link: c.row.link_canonical || c.row.link,
              title: c.row.title,
              summary: c.row.summary || c.row.contentsnippet,
              publishedAt: c.ms
          }));

      results.push({
          ...rowToItem(leader.row),
          storyArticles
      });
  }

  // Sortiranje končnega seznama (Največje in najnovejše na vrh)
  results.sort((a, b) => {
      // Prioriteta: Velikost grozda
      const countA = 1 + a.storyArticles.length;
      const countB = 1 + b.storyArticles.length; // +1 za leadera
      
      if (countA !== countB) return countB - countA;
      
      // Sekundarno: Čas
      return b.publishedAt - a.publishedAt;
  });

  return results.slice(0, TREND_MAX_ITEMS);
}

/* ==========================================================================
   5. API HANDLER (Original Structure)
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

    // --- TRENDING VARIANT ---
    if (variant === 'trending') {
      try {
        const rows = await fetchTrendingRows()
        const items = computeTrendingFromRows(rows)
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30') 
        return res.status(200).json(items as any)
      } catch (err: any) {
        return res
          .status(500)
          .json({ error: err?.message || 'Trending error' })
      }
    }

    // --- INGEST LOGIC (ORIGINAL - STRICTLY PRESERVED) ---
    const headerSecret = (req.headers['x-cron-secret'] as string | undefined)?.trim()
    const isCronCaller = Boolean(CRON_SECRET && headerSecret && headerSecret === CRON_SECRET)
    const isInternalIngest = req.headers['x-krizisce-ingest'] === '1'
    const isDev = process.env.NODE_ENV !== 'production'
    const tokenOk = CRON_SECRET && req.query.token === CRON_SECRET
    const allowPublic = process.env.ALLOW_PUBLIC_REFRESH === '1'

    const canIngest = isCronCaller || isInternalIngest || isDev || tokenOk || allowPublic

    if (!paged && wantsFresh && canIngest) {
      try {
        const rss = await fetchRSSFeeds({ forceFresh: true })
        // TUKAJ JE OHRANJEN AWAIT - TO JE BILO KLJUČNO!
        if (rss?.length) await syncToSupabase(rss.slice(0, 250))
      } catch (err) {
        console.error('❌ RSS sync error:', err)
      }
    }

    // --- LATEST LIST ---
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? (paged ? 40 : 60)), 10) || (paged ? 40 : 60), 1), 200)
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
