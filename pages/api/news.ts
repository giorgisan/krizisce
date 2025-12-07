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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as
  | string
  | undefined
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
   2. URL HANDLING (Canonicalization & Keys)
   ========================================================================== */
function cleanUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim())
    u.protocol = 'https:'
    u.host = u.host.toLowerCase().replace(/^www\./, '')

    const TRACK = [
      /^utm_/i,
      /^fbclid$/i,
      /^gclid$/i,
      /^ref$/i,
      /^src$/i,
      /^from$/i,
      /^si_src$/i,
      /^mc_cid$/i,
      /^mc_eid$/i,
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
   3. DB HELPERS & TYPES
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

const unaccent = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normTitle = (s: string) =>
  unaccent(s).toLowerCase().replace(/\s+/g, ' ').trim()
const tsSec = (ms?: number | null) =>
  Math.max(0, Math.floor((typeof ms === 'number' ? ms : 0) / 1000))

function softDedupe<
  T extends { source?: string; title?: string; publishedAt?: number },
>(arr: T[]): T[] {
  const byKey = new Map<string, T>()
  for (const it of arr) {
    const key = `${(it.source || '').trim()}|${normTitle(
      it.title || '',
    )}|${tsSec(it.publishedAt || 0)}`
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

  const fromContent = (item.content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

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

  const msFromNumber =
    typeof item.publishedAt === 'number' &&
    Number.isFinite(item.publishedAt) &&
    item.publishedAt > 0
      ? item.publishedAt
      : null

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

async function syncToSupabase(items: FeedNewsItem[]) {
  if (!supabaseWrite) return

  const shaped = items.map((i) => {
    const t = resolveTimestamps(i)
    return {
      ...i,
      title: i.title || '',
      source: i.source || '',
      publishedAt: t.ms,
    }
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
  const ms =
    (r.publishedat && Number(r.publishedat)) ||
    toMs(r.published_at) ||
    toMs(r.pubdate) ||
    toMs(r.isodate) ||
    toMs(r.created_at) ||
    Date.now()

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
   4. CLUSTERING CONFIG & STOPWORDS
   ========================================================================== */

const TREND_WINDOW_HOURS = 6 
const TREND_MIN_SOURCES = 2   
const TREND_MAX_ITEMS = 5
const TREND_HOT_CUTOFF_HOURS = 4

// Uteži in pragovi
const SCORE_THRESHOLD = 10; // Potrebujemo vsaj 10 točk za združitev
const WEIGHT_BIGRAM = 10;   // Skupni bigram prinese 10 točk (takojšnje ujemanje)
const WEIGHT_WORD = 1;      // Skupna beseda prinese 1 točko

// Razširjen seznam Stopwords za preprečevanje "tematskega zdrsa"
const STORY_STOPWORDS = new Set<string>([
  // Osnovni vezniki in predlogi
  'v', 'na', 'ob', 'po', 'pri', 'pod', 'nad', 'za', 'do', 'od', 'z', 's',
  'in', 'ali', 'pa', 'kot', 'je', 'so', 'se', 'bo', 'bodo', 'bil', 'bila',
  'bili', 'bilo', 'bi', 'ko', 'ker', 'da', 'ne', 'ni', 'sta', 'ste', 'smo',
  'iz', 'ter', 'kjer', 'kako', 'zakaj', 'kaj', 'kdo', 'kam', 'kadar',
  'razlog', 'zaradi', 'glede', 'proti', 'brez', 'med', 'pred', 'cez',
  
  // Čas in količina
  'danes', 'vceraj', 'nocoj', 'noc', 'jutri', 'letos', 'lani', 'ze', 'se',
  'teden', 'tedna', 'mesec', 'meseca', 'dan', 'dni', 'ura', 'ure',
  'vec', 'manj', 'veliko', 'malo', 'prvi', 'prva', 'prvo', 'drugi', 'druga', 'tretji',
  'novi', 'nova', 'dober', 'dobra', 'slaba', 'velik',
  
  // Geografija (Generična)
  'slovenija', 'sloveniji', 'slovenije', 'slovenijo', 
  'slovenski', 'slovenska', 'slovensko', 'slovenskih', 'slovenci',
  'ljubljana', 'ljubljani', 'maribor', 'celje', 'koper', 
  'svet', 'svetu', 'evropa', 'eu', 'zda',
  
  // Novinarski žargon
  'video', 'foto', 'galerija', 'intervju', 'clanek', 'novice', 
  'novo', 'ekskluzivno', 'v zivo', 'preberite', 'poglejte',
  'znano', 'znane', 'znani', 'podrobnosti', 'razkrivamo',
  'pravi', 'pravijo', 'imajo', 'ima', 'gre', 'lahko', 'morajo', 'mora',
  
  // Denar in števila
  'evrov', 'evro', 'evra', 'eur', 'dolarjev', 'dolar', 'frankov', 
  'tisoč', 'milijon', 'milijard', 'odstotkov', 'odstotke', 'procentov',
  
  // === KRONIKA (Generic words that merge unrelated tragedies) ===
  'policija', 'policisti', 'gasilci', 'resevalci', 
  'zrtve', 'zrtev', 'stevilo', 'ljudi', 'oseb', 'mrtvih', 'mrtvi', 'umrli', 'umrl', 'umrlo',
  'ranjenih', 'poskodovanih', 'nesreca', 'trcenje', 'ogenj', 'pozar', 
  'napad', 'streljanje', 'ubil', 'umor',
  'moski', 'zenska', 'otrok', 'otroci', 'starost', 'neurje', 'poplave',
  
  // === ŠPORT (Generic words that merge unrelated matches) ===
  'zmaga', 'zmage', 'zmago', 'zmagal', 'zmagala', 'zmagali',
  'poraz', 'izgubil', 'izgubila', 'slavil', 'slavila',
  'tekma', 'tekme', 'tekmi', 'spopad', 'dvoboj',
  'rekord', 'rekorda', 'rekorde', 'rekordno',
  'uspeh', 'neuspeh', 'cilj', 'cilja', 'nastop',
  'pokal', 'pokala', 'prvenstvo', 'prvenstva', 'lige', 'liga',
  'finale', 'polfinale', 'cetrtfinale',
  'mesto', 'mesta', 'uvrstitev', 'tock', 'tocke'
])

/* ==========================================================================
   5. CLUSTERING LOGIC (Features, Scoring, Grouping)
   ========================================================================== */

type StoryArticle = {
  source: string
  link: string
  title: string
  summary: string | null
  publishedAt: number
}

// Features: Unigrami (words) in Bigrami (pairs)
type Features = {
    words: Set<string>;
    bigrams: Set<string>;
}

type RowMeta = {
  row: Row
  ms: number
  features: Features
}

type TrendGroup = {
  leader: RowMeta 
  rows: RowMeta[]
}

function stemToken(raw: string): string {
  if (!raw) return raw
  if (/^\d+$/.test(raw)) return raw // Ne stemamo številk

  const w = raw
  // Zelo blag stemmer - samo odstrani 'a', 'i', 'o', 'e' na koncu, če je dolga beseda
  if (w.length <= 4) return w
  if (/[aeiou]$/.test(w)) {
      return w.slice(0, -1);
  }
  return w
}

function extractFeatures(text: string): Features {
  const cleanText = text.replace(/<[^>]*>/g, ' ');
  const base = unaccent(cleanText || '').toLowerCase();
  
  // Razbijemo na tokene (samo črke in številke)
  const rawTokens = base.split(/[^a-z0-9čšž]+/i).filter(Boolean);
  const validTokens: string[] = [];

  for (const t of rawTokens) {
     if (/^\d+$/.test(t)) continue; // Ignoriraj čiste številke
     if (t.length < 3) continue; // Ignoriraj kratke besede
     if (STORY_STOPWORDS.has(t)) continue; // Ignoriraj stop words
     validTokens.push(t);
  }

  const words = new Set<string>();
  const bigrams = new Set<string>();

  // 1. Unigrami (stemmed)
  for (const t of validTokens) {
      const stem = stemToken(t);
      if (!STORY_STOPWORDS.has(stem)) {
          words.add(stem);
      }
  }

  // 2. Bigrami (original pairs) - močan signal
  for (let i = 0; i < validTokens.length - 1; i++) {
      const b1 = validTokens[i];
      const b2 = validTokens[i+1];
      bigrams.add(`${b1} ${b2}`);
  }

  return { words, bigrams };
}

function calculateSimilarityScore(f1: Features, f2: Features): number {
    let score = 0;

    // A. Bigrami (10 točk)
    for (const bg of Array.from(f1.bigrams)) {
        if (f2.bigrams.has(bg)) {
            score += WEIGHT_BIGRAM;
        }
    }

    // B. Besede (Fallback če ni bigramov)
    let commonWords = 0;
    for (const w of Array.from(f1.words)) {
        if (f2.words.has(w)) {
            commonWords++;
        }
    }
    
    // Če imamo >= 3 zelo specifične skupne besede, to šteje kot "match" (10 točk)
    // Tudi če ni bigrama (npr. zaradi zamenjanega vrstnega reda)
    if (commonWords >= 3) {
        score += 10; 
    } else {
        score += commonWords * WEIGHT_WORD;
    }

    return score;
}

async function fetchTrendingRows(): Promise<Row[]> {
  const nowMs = Date.now()
  const cutoffMs = nowMs - TREND_WINDOW_HOURS * 3_600_000

  const { data, error } = await supabaseRead
    .from('news')
    .select(
      'id, link, link_canonical, link_key, title, source, image, contentsnippet, summary, isodate, pubdate, published_at, publishedat, created_at',
    )
    .gt('publishedat', cutoffMs)
    .order('publishedat', { ascending: false })
    .limit(300)

  if (error) throw new Error(`DB trending: ${error.message}`)
  return (data || []) as Row[]
}

function computeTrendingFromRows(
  rows: Row[],
): (NewsItem & { storyArticles: StoryArticle[] })[] {
  
  // 1. Priprava metapodatkov
  const metas: RowMeta[] = rows
    .map((row) => {
      const ms =
        (row.publishedat && Number(row.publishedat)) ||
        toMs(row.published_at) ||
        toMs(row.pubdate) ||
        toMs(row.isodate) ||
        toMs(row.created_at) ||
        Date.now()

      const t = (row.title || '').trim();
      const s = (row.summary || '').trim();
      
      let content = t;
      // Summary dodamo le, če ni preveč podoben naslovu
      if (s && !t.includes(s)) content += ' ' + s;
      
      const features = extractFeatures(content);
      return { row, ms, features }
    })
    .filter((m) => m.features.words.size > 0)

  if (!metas.length) return []

  // Sortiramo po času
  metas.sort((a, b) => b.ms - a.ms)

  const groups: TrendGroup[] = []

  // 2. Grupiranje (Leader-based)
  for (const m of metas) {
    let bestGroupIndex = -1;
    let bestScore = 0;

    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];
      // Primerjamo samo z Leaderjem
      const score = calculateSimilarityScore(group.leader.features, m.features);

      if (score >= SCORE_THRESHOLD) {
        if (score > bestScore) {
          bestScore = score;
          bestGroupIndex = gi;
        }
      }
    }

    if (bestGroupIndex >= 0) {
      groups[bestGroupIndex].rows.push(m);
    } else {
      groups.push({
        leader: m,
        rows: [m]
      });
    }
  }

  // 3. Točkovanje in filtriranje skupin
  const nowMs = Date.now()

  type ScoredGroup = {
    group: TrendGroup
    rep: RowMeta
    sourceCount: number
    articleCount: number
    newestMs: number
  }

  const scored: ScoredGroup[] = []

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]
    if (!g.rows.length) continue

    const srcs = new Set<string>();
    for (const r of g.rows) {
      const s = (r.row.source || '').trim()
      if (s) srcs.add(s);
    }
    const sourceCount = srcs.size;

    if (sourceCount < TREND_MIN_SOURCES) continue

    const rep = g.leader; 
    const articleCount = g.rows.length
    
    let newestMs = 0;
    for(const r of g.rows) {
      if(r.ms > newestMs) newestMs = r.ms;
    }

    const ageHours = Math.max(0, (nowMs - newestMs) / 3_600_000)
    if (ageHours > TREND_HOT_CUTOFF_HOURS) {
      continue
    }
    
    scored.push({ group: g, rep, sourceCount, articleCount, newestMs })
  }

  // 4. Sortiranje rezultatov (Hotness ranking)
  scored.sort((a, b) => {
    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount
    if (b.articleCount !== a.articleCount) return b.articleCount - a.articleCount
    return b.newestMs - a.newestMs
  })

  // 5. Priprava outputa
  const top = scored.slice(0, TREND_MAX_ITEMS)
  const result: (NewsItem & { storyArticles: StoryArticle[] })[] = []

  for (const sg of top) {
    const base = rowToItem(sg.rep.row)
    const storyArticles: StoryArticle[] = []
    const seenSrc = new Set<string>();

    sg.group.rows.sort((a, b) => b.ms - a.ms)

    for (const meta of sg.group.rows) {
      const r = meta.row
      const srcName = (r.source || '').trim()
      const link = r.link_canonical || r.link || ''
      
      if (!srcName || !link) continue
      if (seenSrc.has(srcName)) continue
      seenSrc.add(srcName);

      const summary =
        (r.summary && r.summary.trim()) ||
        (r.contentsnippet && r.contentsnippet.trim()) ||
        null

      storyArticles.push({
        source: srcName,
        link,
        title: r.title || '',
        summary,
        publishedAt: meta.ms,
      })
    }
    result.push({ ...base, storyArticles })
  }
  return result
}

/* ==========================================================================
   6. API HANDLER (Main Export)
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

    // --- LATEST / INGEST LOGIC ---
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
        if (rss?.length) await syncToSupabase(rss.slice(0, 250))
      } catch (err) {
        console.error('❌ RSS sync error:', err)
      }
    }

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
