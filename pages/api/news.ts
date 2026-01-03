import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import type { NewsItem as FeedNewsItem } from '@/types'
import { determineCategory, CategoryId } from '@/lib/categories'
import { generateKeywords } from '@/lib/textUtils'

// --- KONFIGURACIJA ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
const CRON_SECRET = process.env.CRON_SECRET as string | undefined

// --- SUPABASE KLIENTI ---
const supabaseRead = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})
const supabaseWrite = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null

/* -------------------------------------------------------------------------- */
/* HELPER FUNKCIJE                                                            */
/* -------------------------------------------------------------------------- */

function cleanUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim())
    u.protocol = 'https:'
    u.host = u.host.toLowerCase().replace(/^www\./, '')
    const TRACK = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^ref$/i, /^src$/i, /^from$/i, /^si_src$/i, /^mc_cid$/i, /^mc_eid$/i]
    for (const [k] of Array.from(u.searchParams.entries())) {
      if (TRACK.some((rx) => rx.test(k))) u.searchParams.delete(k)
    }
    u.pathname = u.pathname.replace(/\/amp\/?$/i, '/')
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '')
    u.hash = ''
    if (u.host.endsWith('rtvslo.si')) u.host = 'rtvslo.si'
    return u
  } catch { return null }
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
  const fromContent = ((item as any).content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
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
  const fromPub = parse((item as any).pubDate)
  const msFromNumber = typeof item.publishedAt === 'number' && Number.isFinite(item.publishedAt) && item.publishedAt > 0 ? item.publishedAt : null
  const ms = fromIso?.ms ?? fromPub?.ms ?? msFromNumber ?? Date.now()
  const iso = fromIso?.iso ?? fromPub?.iso ?? new Date(ms).toISOString()
  return { ms: Math.round(ms), iso }
}

function feedItemToDbRow(item: FeedNewsItem) {
  const linkRaw = (item.link || '').trim()
  const ts = resolveTimestamps(item)
  const linkKey = makeLinkKey(linkRaw, ts.iso)
  const title = (item.title || '').trim()
  const source = (item.source || '').trim()
  if (!linkKey || !title || !source) return null
  const snippet = normalizeSnippet(item)
  
  const category = item.category || determineCategory({ 
    link: linkRaw, 
    title: title, 
    contentSnippet: snippet || '', 
    categories: [] 
  })

  let kws = item.keywords;
  if (!kws || kws.length === 0) {
      const text = title + ' ' + (snippet || '');
      kws = generateKeywords(text);
  }

  return {
    link: linkRaw,
    link_key: linkKey,
    title,
    source,
    image: item.image?.trim() || null,
    contentsnippet: snippet,
    summary: snippet,
    published_at: ts.iso,
    publishedat: ts.ms,
    category: category, 
    keywords: kws, 
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

  if (process.env.NODE_ENV !== 'production' || rows.length > 0) {
      console.log(`[Sync] Pripravljenih ${rows.length} vrstic za vpis.`)
  }

  const { error } = await (supabaseWrite as any)
    .from('news')
    .upsert(rows, { onConflict: 'link_key' }) 
  
  if (error) {
      console.error('[Sync] DB Error:', error)
      throw error
  }
}

type Row = {
  id: number
  link: string
  link_key: string | null
  title: string
  source: string
  image: string | null
  contentsnippet: string | null
  summary: string | null
  published_at: string | null
  publishedat: number | null
  created_at: string | null
  category: string | null
  keywords: string[] | null 
}

const toMs = (s?: string | null) => {
  if (!s) return 0
  const v = Date.parse(s)
  return Number.isFinite(v) ? v : 0
}

function rowToItem(r: Row): FeedNewsItem {
  const ms = (r.publishedat && Number(r.publishedat)) || toMs(r.published_at) || toMs(r.created_at) || Date.now()
  return {
    title: r.title,
    link: r.link || '',
    source: r.source,
    image: r.image || null,
    contentSnippet: r.contentsnippet?.trim() || r.summary?.trim() || null,
    publishedAt: ms,
    isoDate: r.published_at || null,
    category: (r.category as CategoryId) || 'ostalo',
    keywords: r.keywords || [] 
  }
}

/* -------------------------------------------------------------------------- */
/* TRENDING LOGIKA                                                            */
/* -------------------------------------------------------------------------- */
const TREND_WINDOW_HOURS = 6 
const TREND_MIN_SOURCES = 2       
const TREND_MIN_OVERLAP = 2
const TREND_MAX_ITEMS = 5
const TREND_HOT_CUTOFF_HOURS = 4
const TREND_JACCARD_THRESHOLD = 0.20; 

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
  keywords: string[]
}

type TrendGroup = {
  rows: RowMeta[]
  keywords: string[]
}

const STORY_STOPWORDS = new Set<string>([
  'v', 'na', 'ob', 'po', 'pri', 'pod', 'nad', 'za', 'do', 'od', 'z', 's',
  'in', 'ali', 'pa', 'kot', 'je', 'so', 'se', 'bo', 'bodo', 'bil', 'bila',
  'bili', 'bilo', 'bi', 'ko', 'ker', 'da', 'ne', 'ni', 'sta', 'ste', 'smo',
  'danes', 'vceraj', 'nocoj', 'noc', 'jutri', 'letos', 'lani', 'ze', 'se',
  'slovenija', 'sloveniji', 'slovenije', 'slovenijo', 
  'slovenski', 'slovenska', 'slovensko', 'slovenskih',
  'ljubljana', 'ljubljani',
  'svet', 'svetu', 'evropa', 'eu', 'zda',
  'video', 'foto', 'galerija', 'intervju', 'clanek', 'novice', 'kronika', 
  'novo', 'ekskluzivno', 'v zivo', 'preberite', 'poglejte',
  'iz', 'ter', 'kjer', 'kako', 'zakaj', 'kaj', 'kdo', 'kam', 'kadar',
  'razlog', 'zaradi', 'glede', 'proti', 'brez', 'med', 'pred', 'cez',
  'lahko', 'morajo', 'mora', 'imajo', 'ima', 'gre', 'pravi', 'pravijo',
  'znano', 'znane', 'znani', 'podrobnosti', 'razkrivamo', 'vec', 'manj', 'veliko',
  'prvi', 'prva', 'prvo', 'drugi', 'druga', 'tretji', 'novi', 'nova', 
  'dober', 'dobra', 'slaba', 'velik', 'malo',
  'let', 'leta', 'leto', 'letnik', 'letnika', 'letih', 'letni', 'letna',
  'letošnji', 'letošnja', 'starost', 'star', 'stara',
  'teden', 'tedna', 'mesec', 'meseca', 'dan', 'dni', 'ura', 'ure',
  'bozic', 'bozicni', 'bozicna', 'bozicno', 'vecer', 'praznik', 'prazniki', 
  'praznicni', 'jutro', 'dopoldne', 'popoldne', 'koncu', 'zacetku', 'sredini'
])

function stemToken(raw: string): string {
  if (!raw) return raw
  if (/^\d+$/.test(raw)) return raw
  const w = raw
  if (w.length <= 4) return w
  if (w.length > 6) return w.substring(0, w.length - 2)
  return w.substring(0, w.length - 1)
}

function extractKeywordsFromTitle(title: string): string[] {
  const base = unaccent(title || '').toLowerCase()
  if (!base) return []
  const tokens = base.split(/[^a-z0-9]+/i).filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    let w = tokens[i]
    if (!w) continue
    if (STORY_STOPWORDS.has(w)) continue
    const stem = stemToken(w)
    if (STORY_STOPWORDS.has(stem)) continue
    if (stem.length < 3) continue 
    if (out.indexOf(stem) === -1) out.push(stem)
  }
  return out
}

async function fetchTrendingRows(): Promise<Row[]> {
  const nowMs = Date.now()
  const cutoffMs = nowMs - TREND_WINDOW_HOURS * 3_600_000
  
  const { data, error } = await supabaseRead
    .from('news')
    .select(
      'id, link, link_key, title, source, image, contentsnippet, summary, published_at, publishedat, created_at, category, keywords',
    )
    .gt('publishedat', cutoffMs)
    .neq('category', 'oglas') 
    .order('publishedat', { ascending: false })
    .limit(300)

  if (error) throw new Error(`DB trending: ${error.message}`)
  return (data || []) as Row[]
}

function computeTrendingFromRows(rows: Row[]): (FeedNewsItem & { storyArticles: StoryArticle[] })[] {
  const metas: RowMeta[] = rows.map((row) => {
      const ms = (row.publishedat && Number(row.publishedat)) || toMs(row.published_at) || toMs(row.created_at) || Date.now()
      const keywords = extractKeywordsFromTitle(row.title || '')
      return { row, ms, keywords }
    }).filter((m) => m.keywords.length > 0)

  if (!metas.length) return []
  metas.sort((a, b) => b.ms - a.ms)

  const groups: TrendGroup[] = []
  
  for (let i = 0; i < metas.length; i++) {
    const m = metas[i]
    const mKW = m.keywords
    let attachedIndex = -1
    let bestScore = 0 
    
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      const gKW = g.keywords
      
      let intersect = 0
      const unionSet = new Set<string>([...gKW]) 
      
      for (let ki = 0; ki < mKW.length; ki++) {
        const kw = mKW[ki]
        unionSet.add(kw) 
        if (gKW.indexOf(kw) !== -1) intersect++
      }

      const jaccard = unionSet.size > 0 ? (intersect / unionSet.size) : 0;

      if (intersect >= TREND_MIN_OVERLAP && jaccard >= TREND_JACCARD_THRESHOLD) {
        if (jaccard > bestScore) {
          bestScore = jaccard
          attachedIndex = gi
        }
      }
    }

    if (attachedIndex >= 0) {
      const g = groups[attachedIndex]
      g.rows.push(m)
      for (let ki = 0; ki < mKW.length; ki++) {
        const kw = mKW[ki]
        const ifExists = g.keywords.indexOf(kw)
        if (ifExists === -1) g.keywords.push(kw)
      }
    } else {
      groups.push({ rows: [m], keywords: mKW.slice() })
    }
  }

  const nowMs = Date.now()
  type ScoredGroup = { group: TrendGroup; rep: RowMeta; sourceCount: number; articleCount: number; newestMs: number }
  const scored: ScoredGroup[] = []

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]
    if (!g.rows.length) continue
    const srcs: string[] = []
    for (let ri = 0; ri < g.rows.length; ri++) {
      const s = (g.rows[ri].row.source || '').trim()
      if (s && srcs.indexOf(s) === -1) srcs.push(s)
    }
    const sourceCount = srcs.length
    if (sourceCount < TREND_MIN_SOURCES) continue
    let rep = g.rows[0]
    for (let ri = 1; ri < g.rows.length; ri++) {
      if (g.rows[ri].ms > rep.ms) rep = g.rows[ri]
    }
    const articleCount = g.rows.length
    let newestMs = g.rows[0].ms
    for (let ri = 1; ri < g.rows.length; ri++) {
      if (g.rows[ri].ms > newestMs) newestMs = g.rows[ri].ms
    }
    const ageHours = Math.max(0, (nowMs - newestMs) / 3_600_000)
    if (ageHours > TREND_HOT_CUTOFF_HOURS) continue
    scored.push({ group: g, rep, sourceCount, articleCount, newestMs })
  }

  scored.sort((a, b) => {
    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount
    return b.newestMs - a.newestMs
  })

  const top = scored.slice(0, TREND_MAX_ITEMS)
  const result: (FeedNewsItem & { storyArticles: StoryArticle[] })[] = []

  for (let si = 0; si < top.length; si++) {
    const sg = top[si]
    const base = rowToItem(sg.rep.row)
    const storyArticles: StoryArticle[] = []
    const seenSrc: string[] = []
    sg.group.rows.sort((a, b) => b.ms - a.ms)
    for (let ri = 0; ri < sg.group.rows.length; ri++) {
      const meta = sg.group.rows[ri]
      const r = meta.row
      const srcName = (r.source || '').trim()
      const link = r.link || ''
      if (!srcName || !link) continue
      if (seenSrc.indexOf(srcName) !== -1) continue
      seenSrc.push(srcName)
      const summary = (r.summary && r.summary.trim()) || (r.contentsnippet && r.contentsnippet.trim()) || null
      storyArticles.push({ source: srcName, link, title: r.title || '', summary, publishedAt: meta.ms })
    }
    result.push({ ...base, storyArticles })
  }
  return result
}

/* -------------------------------------------------------------------------- */
/* API HANDLER                                                                */
/* -------------------------------------------------------------------------- */
type PagedOk = { items: FeedNewsItem[]; nextCursor: number | null }
type ListOk = FeedNewsItem[]
type Err = { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PagedOk | ListOk | Err>,
) {
  try {
    const paged = req.query.paged === '1'
    const wantsFresh = req.query.forceFresh === '1'
    const sourceParam = (req.query.source as string) || null 
    const variant = (req.query.variant as string) || 'latest'
    const category = (req.query.category as string) || null
    const searchQuery = (req.query.q as string) || null 
    const tagQuery = (req.query.tag as string) || null 

    // --- 1. TRENDING ---
    if (variant === 'trending') {
      try {
        const rows = await fetchTrendingRows()
        const items = computeTrendingFromRows(rows)
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60') 
        return res.status(200).json(items as any)
      } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Trending error' })
      }
    }

    // --- 2. INGEST LOGIKA (Cron) ---
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
        if (rss?.length) {
            await syncToSupabase(rss.slice(0, 250))
        }
      } catch (err) { console.error('❌ RSS sync error:', err) }
    }

    // --- 3. PRIPRAVA POIZVEDBE (GET NEWS) ---
    const limitParam = parseInt(String(req.query.limit), 10)
    const defaultLimit = 25 
    const limit = Math.min(Math.max(limitParam || defaultLimit, 1), 300)
    const cursor = req.query.cursor ? Number(req.query.cursor) : null

    // Glavni query
    let q = supabaseRead
      .from('news')
      .select('id, link, link_key, title, source, image, contentsnippet, summary, published_at, publishedat, created_at, category, keywords')
      .gt('publishedat', 0)
      
      // --- 4. FILTRIRANJE OGLASOV ---
      .neq('category', 'oglas') 
      
    // SORTIRANJE:
    q = q
      .order('publishedat', { ascending: false })
      .order('id', { ascending: false })

    // Filtri
    if (sourceParam && sourceParam !== 'Vse') {
      const sources = sourceParam.split(',').map(s => s.trim()).filter(Boolean)
      if (sources.length > 0) {
        q = q.in('source', sources)
      }
    }

    // Datumsko filtriranje
    const dateFrom = req.query.from ? Number(req.query.from) : null
    const dateTo = req.query.to ? Number(req.query.to) : null

    if (dateFrom && dateTo) {
        q = q.gte('publishedat', dateFrom).lt('publishedat', dateTo)
    } 
    
    // Kursor (Paginacija)
    if (cursor && cursor > 0) {
        q = q.lt('publishedat', cursor)
    }

    if (category && category !== 'vse') {
      if (category === 'ostalo') {
         q = q.or('category.is.null,category.eq.ostalo')
      } else {
         q = q.eq('category', category)
      }
    }

    // --- 5. LOGIKA ISKANJA ---
    // A) HITRO ISKANJE PO TAGU (Klik na trending tag)
    if (tagQuery && tagQuery.trim().length > 0) {
        const rawTag = tagQuery.trim();
        const stems = generateKeywords(rawTag);
        
        if (stems.length > 0) {
            // Uporabimo .overlaps() za "ALI" logiko (bolj varno)
            q = q.overlaps('keywords', stems);
        } else {
             q = q.ilike('title', `%${rawTag}%`);
        }
    } 
    // B) SPLOŠNO ISKANJE (Vpis v search bar)
    if (searchQuery && searchQuery.trim().length > 0) {
        const rawTerm = searchQuery.trim();
        const searchTerms = generateKeywords(rawTerm);
        
        const orConditions = [
            `title.ilike.%${rawTerm}%`,
            `summary.ilike.%${rawTerm}%`,
            `contentsnippet.ilike.%${rawTerm}%`
        ];

        if (searchTerms.length > 0) {
            const pgArrayLiteral = `{${searchTerms.join(',')}}`;
            orConditions.push(`keywords.cs.${pgArrayLiteral}`);
        }

        q = q.or(orConditions.join(','));
    }

    // -----------------------------------------------------------------------
    // OPTIMIZACIJA: "Over-fetching"
    // Zahtevamo več novic (limit + 20), da lahko potem dedupliciramo in še vedno 
    // vrnemo polno število (limit).
    // -----------------------------------------------------------------------
    const bufferSize = 20;
    q = q.limit(limit + bufferSize)

    // --- 6. IZVEDBA POIZVEDBE ---
    const { data, error } = await q
    
    if (error) {
        console.error("❌ DB ERROR during fetch:", error);
        return res.status(500).json({ error: `DB: ${error.message}` })
    }

    const rows = (data || []) as Row[]
    const rawItems = rows.map(rowToItem)
    
    // Uporabimo softDedupe, ki poskrbi za čistejši seznam
    const dedupedItems = softDedupe(rawItems).sort((a, b) => b.publishedAt - a.publishedAt)
    
    // --- FINALNO REZANJE ---
    // Odrežemo točno toliko, kot je bilo zahtevano, da ne vračamo bufferja
    const items = dedupedItems.slice(0, limit);

    // Izračunamo kursor za naslednjo stran na podlagi ZADNJEGA vrnjenega elementa
    const nextCursor = items.length === limit ? items[items.length - 1].publishedAt : null

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30') 
    if (paged) return res.status(200).json({ items, nextCursor })
    return res.status(200).json(items)

  } catch (e: any) {
    console.error("❌ API CRASH:", e);
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
