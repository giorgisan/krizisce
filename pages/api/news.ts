// pages/api/news.ts — upsert usklajen z DB (UNIQUE na link_key), varno ignorira duplikate

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

/* ---------------- URL kanonikalizacija + ključ ---------------- */
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

/* ---------------- helperji ---------------- */
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

/* ---------------- TRENDING: clustering nad DB (runtime) ---------------- */

const TREND_WINDOW_HOURS = 6
const TREND_MIN_SOURCES = 2
const TREND_MIN_OVERLAP = 2 // min. št. skupnih "močnih" ključnih besed
const TREND_MAX_ITEMS = 5

type StoryArticle = {
  source: string
  link: string
  title: string
  summary: string | null
  publishedAt: number
}

type RowMeta = {
  row: Row
  ms: number
  keywords: string[]          // vsi keywordi iz naslova
  strongKeywords: string[]    // "IDF-težki" keywordi za klastriranje
}

type TrendGroup = {
  rows: RowMeta[]
  keywords: string[] // unija strongKeywords v skupini
}

/**
 * Stop-words za slovenske naslove – generične besede, ki ne nosijo
 * informacij o sami zgodbi (nesreča, znano, danes, 18-letnik, ...).
 */
const STORY_STOPWORDS = new Set<string>([
  'v',
  'na',
  'ob',
  'po',
  'pri',
  'pod',
  'nad',
  'za',
  'do',
  'od',
  'z',
  's',
  'in',
  'ali',
  'pa',
  'kot',
  'je',
  'so',
  'se',
  'bo',
  'bodo',
  'bil',
  'bila',
  'bili',
  'bilo',
  'danes',
  'vceraj',
  'nocoj',
  'noc',
  'slovenija',
  'sloveniji',
  'slovenski',
  'slovenska',
  'slovensko',
  'video',
  'foto',
  'galerija',
  'intervju',
  'clanek',
  'novice',
  'kronika',
  // kronika / nesreče
  'nesreca',
  'nesreci',
  'prometna',
  'prometni',
  'prometne',
  'tragedija',
  'smrt',
  'smrti',
  'umrl',
  'umrla',
  'umrli',
  'umrle',
  'letnik',
  'letnika',
  'letniki',
  'znano',
  'znane',
  'znani',
  'podrobnosti',
])

/**
 * Zelo grob "stemmer" za slovenske naslove:
 * - številk ne spreminjamo,
 * - daljše besede odrežemo na začetni del (približek korena).
 *
 * Ideja: šmartinki / šmartinski / šmartinska → "smarti",
 * kar je dovolj, da se zgodbe o isti lokaciji vidijo kot iste.
 */
function stemToken(raw: string): string {
  if (!raw) return raw
  if (/^\d+$/.test(raw)) return raw

  let w = raw
  if (w.length > 7) return w.slice(0, 6)
  if (w.length > 5) return w.slice(0, 5)
  return w
}

/**
 * Ekstrakcija ključnih besed iz naslova.
 * - normalizacija (lowercase, brez šumnikov),
 * - razbitje po ne-alfa znakov,
 * - odstranitev stop-words,
 * - "stemmanje" z cut-na-začetek,
 * - filtriranje na dolžino in unikatnost.
 */
function extractKeywordsFromTitle(title: string): string[] {
  const base = unaccent(title || '').toLowerCase()
  if (!base) return []

  const tokens = base.split(/[^a-z0-9]+/i).filter(Boolean)
  const out: string[] = []

  for (let i = 0; i < tokens.length; i++) {
    let w = tokens[i]
    if (!w) continue

    if (STORY_STOPWORDS.has(w)) continue

    w = stemToken(w)
    if (w.length < 4) continue
    if (STORY_STOPWORDS.has(w)) continue

    if (out.indexOf(w) === -1) out.push(w)
  }

  return out
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
    .limit(200)

  if (error) throw new Error(`DB trending: ${error.message}`)
  return (data || []) as Row[]
}

/**
 * computeTrendingFromRows
 *
 * Ključne točke:
 * - iz naslova izlušči keywords in jim da grob "stem",
 * - naredi frekvenčno statistiko keywordov (IDF-ish),
 * - za klastriranje uporablja samo "močne" (redkejše) keyworde,
 * - skupino obdrži samo, če ima vsaj TREND_MIN_SOURCES različnih virov.
 *
 * S tem:
 * - nesreča v Kamniku in nesreča na Šmartinki se NE združita,
 * - vse variacije Šmartinke (Šmartinski cesti, ...), ki imajo iste
 *   redke keyworde, se lepo zlepijo v eno zgodbo.
 */
function computeTrendingFromRows(
  rows: Row[],
): (NewsItem & { storyArticles: StoryArticle[] })[] {
  // 1) osnovni meta-podatki + keywords iz naslovov
  const metas: RowMeta[] = rows
    .map((row) => {
      const ms =
        (row.publishedat && Number(row.publishedat)) ||
        toMs(row.published_at) ||
        toMs(row.pubdate) ||
        toMs(row.isodate) ||
        toMs(row.created_at) ||
        Date.now()

      const keywords = extractKeywordsFromTitle(row.title || '')
      return { row, ms, keywords, strongKeywords: [] }
    })
    .filter((m) => m.keywords.length > 0)

  if (!metas.length) return []

  // 2) frekvence keywordov (IDF komponenta)
  const freq = new Map<string, number>()
  for (const m of metas) {
    for (const kw of m.keywords) {
      freq.set(kw, (freq.get(kw) || 0) + 1)
    }
  }

  // 3) strongKeywords = redkejši / informativni keywordi
  for (const m of metas) {
    const strong: string[] = []

    for (const kw of m.keywords) {
      const f = freq.get(kw) || 0

      // popolnoma unikatne besede so vedno močne
      if (f <= 1) {
        strong.push(kw)
        continue
      }

      // daljši, srednje redki keywordi so OK
      if (kw.length >= 7 && f <= 6) {
        strong.push(kw)
        continue
      }

      if (kw.length >= 5 && f <= 4) {
        strong.push(kw)
        continue
      }
    }

    // fallback: če je vse "generično", vzemi 1–2 najredkejši besedi,
    // da sploh lahko kaj primerjamo
    if (!strong.length && m.keywords.length) {
      const sortedByFreq = [...m.keywords].sort(
        (a, b) => (freq.get(a) || 0) - (freq.get(b) || 0),
      )
      strong.push(...sortedByFreq.slice(0, 2))
    }

    m.strongKeywords = strong
  }

  // novejši najprej
  metas.sort((a, b) => b.ms - a.ms)

  const groups: TrendGroup[] = []

  // 4) greedy klastriranje po overlapu strongKeywords
  for (let i = 0; i < metas.length; i++) {
    const m = metas[i]
    const mKW = m.strongKeywords.length ? m.strongKeywords : m.keywords

    let attachedIndex = -1
    let bestScore = 0

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      const gKW = g.keywords

      let intersect = 0
      const seen = new Set<string>()

      for (let ki = 0; ki < mKW.length; ki++) {
        const kw = mKW[ki]
        if (seen.has(kw)) continue
        seen.add(kw)
        if (gKW.indexOf(kw) !== -1) intersect++
      }

      if (intersect < TREND_MIN_OVERLAP) continue

      const unionSize = new Set([...mKW, ...gKW]).size
      const jaccard = unionSize > 0 ? intersect / unionSize : 0

      // iščemo skupino z največjo podobnostjo
      if (jaccard > bestScore) {
        bestScore = jaccard
        attachedIndex = gi
      }
    }

    if (attachedIndex >= 0) {
      const g = groups[attachedIndex]
      g.rows.push(m)

      const mKWset = mKW
      for (let ki = 0; ki < mKWset.length; ki++) {
        const kw = mKWset[ki]
        if (g.keywords.indexOf(kw) === -1) g.keywords.push(kw)
      }
    } else {
      groups.push({ rows: [m], keywords: mKW.slice() })
    }
  }

  const nowMs = Date.now()

  type ScoredGroup = {
    group: TrendGroup
    rep: RowMeta
    sourceCount: number
    articleCount: number
    score: number
  }

  const scored: ScoredGroup[] = []

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]
    if (!g.rows.length) continue

    // različni viri
    const srcs: string[] = []
    for (let ri = 0; ri < g.rows.length; ri++) {
      const s = (g.rows[ri].row.source || '').trim()
      if (s && srcs.indexOf(s) === -1) srcs.push(s)
    }
    const sourceCount = srcs.length
    if (sourceCount < TREND_MIN_SOURCES) continue

    // predstavnik: najnovejši
    let rep = g.rows[0]
    for (let ri = 1; ri < g.rows.length; ri++) {
      if (g.rows[ri].ms > rep.ms) rep = g.rows[ri]
    }

    // recency: gledamo najmlajši članek v skupini
    let newestMs = g.rows[0].ms
    for (let ri = 1; ri < g.rows.length; ri++) {
      if (g.rows[ri].ms > newestMs) newestMs = g.rows[ri].ms
    }

    const ageHoursNewest = Math.max(0, (nowMs - newestMs) / 3_600_000)
    const recencyWeight = 1 / (1 + ageHoursNewest)

    const articleCount = g.rows.length

    const score =
      sourceCount * 10 + Math.min(articleCount, 6) * 2 + recencyWeight * 5

    scored.push({ group: g, rep, sourceCount, articleCount, score })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount
    return b.rep.ms - a.rep.ms
  })

  const top = scored.slice(0, TREND_MAX_ITEMS)

  const result: (NewsItem & { storyArticles: StoryArticle[] })[] = []

  for (let si = 0; si < top.length; si++) {
    const sg = top[si]
    const base = rowToItem(sg.rep.row)

    const storyArticles: StoryArticle[] = []
    const seenSrc: string[] = []

    for (let ri = 0; ri < sg.group.rows.length; ri++) {
      const meta = sg.group.rows[ri]
      const r = meta.row
      const srcName = (r.source || '').trim()
      const link = r.link_canonical || r.link || ''
      if (!srcName || !link) continue
      if (seenSrc.indexOf(srcName) !== -1) continue
      seenSrc.push(srcName)

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

    storyArticles.sort((a, b) => b.publishedAt - a.publishedAt)

    result.push({ ...base, storyArticles })
  }

  return result
}

/* ---------------- handler ---------------- */
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

    // --- TRENDING BRANCH ---
    if (variant === 'trending') {
      try {
        const rows = await fetchTrendingRows()
        const items = computeTrendingFromRows(rows)
        res.setHeader('Cache-Control', 'no-store')
        return res.status(200).json(items as any)
      } catch (err: any) {
        return res
          .status(500)
          .json({ error: err?.message || 'Trending error' })
      }
    }

    // --- INGEST GUARD (samo za "latest" varianto) ---
    const headerSecret = (req.headers['x-cron-secret'] as string | undefined)
      ?.trim()
    const isCronCaller =
      Boolean(CRON_SECRET && headerSecret && headerSecret === CRON_SECRET)
    const isInternalIngest = req.headers['x-krizisce-ingest'] === '1'
    const isDev = process.env.NODE_ENV !== 'production'

    const tokenOk = CRON_SECRET && req.query.token === CRON_SECRET
    const allowPublic = process.env.ALLOW_PUBLIC_REFRESH === '1'

    const canIngest =
      isCronCaller || isInternalIngest || isDev || tokenOk || allowPublic

    if (!paged && wantsFresh && canIngest) {
      try {
        const rss = await fetchRSSFeeds({ forceFresh: true })
        if (rss?.length) await syncToSupabase(rss.slice(0, 250))
      } catch (err) {
        console.error('❌ RSS sync error:', err)
      }
    }

    const limit = Math.min(
      Math.max(
        parseInt(String(req.query.limit ?? (paged ? 40 : 60)), 10) ||
          (paged ? 40 : 60),
        1,
      ),
      200,
    )
    const cursor = req.query.cursor ? Number(req.query.cursor) : null

    let q = supabaseRead
      .from('news')
      .select(
        'id, link, link_canonical, link_key, title, source, image, contentsnippet, summary, isodate, pubdate, published_at, publishedat, created_at',
      )
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
    const items = softDedupe(rawItems).sort(
      (a, b) => b.publishedAt - a.publishedAt,
    )

    const nextCursor =
      rows.length === limit
        ? rows[rows.length - 1].publishedat
          ? Number(rows[rows.length - 1].publishedat)
          : null
        : null

    res.setHeader('Cache-Control', 'no-store')
    if (paged) return res.status(200).json({ items, nextCursor })
    return res.status(200).json(items)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}

/* ================= SSG (ISR) ================= */

export async function getStaticProps() {
  const { createClient } = await import('@supabase/supabase-js')
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })

  type Row = {
    id: number
    link: string
    title: string
    source: string
    summary: string | null
    contentsnippet: string | null
    image: string | null
    published_at: string | null
    publishedat: number | null
  }

  const { data } = await supabase
    .from('news')
    .select(
      'id, link, title, source, summary, contentsnippet, image, published_at, publishedat',
    )
    .order('publishedat', { ascending: false })
    .limit(60)

  const rows = (data ?? []) as Row[]

  const initialNews: NewsItem[] = rows.map((r) => ({
    title: r.title,
    link: r.link,
    source: r.source,
    contentSnippet: r.contentsnippet ?? r.summary ?? '',
    image: r.image ?? null,
    publishedAt:
      (r.publishedat ??
        (r.published_at ? Date.parse(r.published_at) : 0)) || 0,
    isoDate: r.published_at,
  }))

  return { props: { initialNews }, revalidate: 60 }
}
