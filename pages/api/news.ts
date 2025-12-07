// pages/api/news.ts

/* ==========================================================================
   1. IMPORTS & CONFIG (Original)
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
   2. URL & KEY HELPERS (Original - Untouched)
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
   3. DB HELPERS (Original - Untouched)
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

// !!! KLJUČNO: Ohranjen await in logika za zapis v bazo
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
   4. TRENDING ALGORITHM: UPGRADED (Slovenian Bulletproof)
   ========================================================================== */

const TREND_WINDOW_HOURS = 6 
const TREND_MIN_SOURCES = 2   
const TREND_MAX_ITEMS = 50
const TREND_HOT_CUTOFF_HOURS = 4
const SIMILARITY_THRESHOLD = 0.28 // Optimiziran prag za trigrame

type StoryArticle = {
  source: string
  link: string
  title: string
  summary: string | null
  publishedAt: number
}

// Pomožna funkcija za izdelavo trigramov (zaporedja 3 črk)
// To rešuje sklanjanje: "komendi" -> 'kom', 'ome', 'men', 'end', 'ndi'
// Ujema se s "komenda" -> 'kom', 'ome', 'men', 'end', 'nda'
function getTrigrams(text: string): Map<string, number> {
  // Normalizacija: male črke, brez šumnikov (za lažje ujemanje), samo alfanumerični znaki
  const clean = text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') 
    .replace(/[^a-z0-9]/g, '');

  const trigrams = new Map<string, number>();
  // Če je tekst prekratek, vrnemo celo besedo kot en "token"
  if (clean.length < 3) {
      if (clean.length > 0) trigrams.set(clean, 1);
      return trigrams;
  }

  for (let i = 0; i < clean.length - 2; i++) {
    const gram = clean.slice(i, i + 3);
    trigrams.set(gram, (trigrams.get(gram) || 0) + 1);
  }
  return trigrams;
}

// Kosinusna podobnost med dvema setoma trigramov
function cosineSimilarity(v1: Map<string, number>, v2: Map<string, number>): number {
  let dot = 0;
  let mag1 = 0;
  let mag2 = 0;

  // Izračun magnitude vektorja 1
  const v1Values = Array.from(v1.values());
  for(let i=0; i < v1Values.length; i++) mag1 += v1Values[i] ** 2;

  // Izračun magnitude vektorja 2
  const v2Values = Array.from(v2.values());
  for(let i=0; i < v2Values.length; i++) mag2 += v2Values[i] ** 2;

  if (mag1 === 0 || mag2 === 0) return 0;

  // Skalarni produkt (optimizacija: iteriramo po manjšem)
  const [smaller, larger] = v1.size < v2.size ? [v1, v2] : [v2, v1];
  const smallEntries = Array.from(smaller.entries());
  
  for(let i=0; i < smallEntries.length; i++) {
      const [gram, count] = smallEntries[i];
      const count2 = larger.get(gram);
      if (count2) {
          dot += count * count2;
      }
  }

  return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

async function fetchTrendingRows(): Promise<Row[]> {
  const nowMs = Date.now()
  const cutoffMs = nowMs - TREND_WINDOW_HOURS * 3_600_000

  const { data, error } = await supabaseRead
    .from('news')
    .select('id, link, link_canonical, link_key, title, source, image, contentsnippet, summary, isodate, pubdate, published_at, publishedat, created_at')
    .gt('publishedat', cutoffMs)
    .order('publishedat', { ascending: false })
    .limit(300)

  if (error) throw new Error(`DB trending: ${error.message}`)
  return (data || []) as Row[]
}

function computeTrendingFromRows(rows: Row[]): (NewsItem & { storyArticles: StoryArticle[] })[] {
  // 1. Priprava dokumentov
  const docs = rows.map((r, idx) => {
      const ms = (r.publishedat && Number(r.publishedat)) || toMs(r.published_at) || Date.now();
      const title = (r.title || '').trim();
      const summary = (r.summary || r.contentsnippet || '').trim();
      
      // Naslovu damo večjo težo tako, da ga podvojimo v input stringu
      const textToProcess = `${title} ${title} ${summary}`;
      
      return {
          id: idx,
          row: r,
          ms,
          vector: getTrigrams(textToProcess)
      };
  });

  if (!docs.length) return [];

  // 2. Grupiranje (Greedy Clustering)
  // Ker so docs sortirani po datumu (najnovejši prej), bo prvi članek v gruči vedno najnovejši "Leader".
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

          // Izračunaj podobnost
          const similarity = cosineSimilarity(doc.vector, other.vector);

          if (similarity > SIMILARITY_THRESHOLD) {
              cluster.push(other);
              assigned.add(other.id);
          }
      }
      clusters.push(cluster);
  }

  // 3. Točkovanje in filtriranje
  const nowMs = Date.now();
  const results: (NewsItem & { storyArticles: StoryArticle[] })[] = [];

  for (const cluster of clusters) {
      // Filtriraj premajhne gruče (premalo virov)
      const distinctSources = new Set(cluster.map(c => c.row.source));
      if (distinctSources.size < TREND_MIN_SOURCES) continue;

      // Najdi Leaderja (najnovejši članek)
      cluster.sort((a, b) => b.ms - a.ms);
      const leader = cluster[0];

      // Preveri "Hot Cutoff" - če je najnovejši članek starejši od X ur, ne prikaži
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

  // 4. Sortiranje rezultatov (Največ virov na vrhu, nato najnovejše)
  results.sort((a, b) => {
      // Izračunaj število virov za vsako zgodbo (glavna + stranske)
      const countSources = (item: any) => {
          const s = new Set<string>();
          s.add(item.source);
          item.storyArticles.forEach((sub: any) => s.add(sub.source));
          return s.size;
      };
      
      const countA = countSources(a);
      const countB = countSources(b);

      if (countB !== countA) return countB - countA;
      return b.publishedAt - a.publishedAt;
  });

  return results.slice(0, TREND_MAX_ITEMS);
}


/* ==========================================================================
   5. HANDLER (Original Logic preserved)
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

    // --- TRENDING VARIANT (UPDATED ALGORITHM) ---
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

    // --- INGEST LOGIC (ORIGINAL PRESERVED) ---
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
        // TUKAJ JE KLJUČEN AWAIT, KI SMO GA PREJ POMOTOMA ODSTRANILI
        if (rss?.length) await syncToSupabase(rss.slice(0, 250))
      } catch (err) {
        console.error('❌ RSS sync error:', err)
      }
    }

    // --- LATEST / REGULAR LIST ---
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
