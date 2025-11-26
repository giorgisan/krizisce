// pages/api/news.ts — upsert usklajen z DB (UNIQUE na link_key), varno ignorira duplikate

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import type { NewsItem as FeedNewsItem } from '@/types'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
const CRON_SECRET = process.env.CRON_SECRET as string | undefined

const supabaseRead = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const supabaseWrite = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null

/* ---------------- URL kanonikalizacija + ključ ---------------- */
function cleanUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim())
    u.protocol = 'https:'
    u.host = u.host.toLowerCase().replace(/^www\./, '')
    const TRACK = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^ref$/i, /^src$/i, /^from$/i, /^si_src$/i, /^mc_cid$/i, /^mc_eid$/i]
    for (const [k] of Array.from(u.searchParams.entries())) {
      if (TRACK.some(rx => rx.test(k))) u.searchParams.delete(k)
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
  if (isNaN(+d)) return null
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
  story_id: string | null
  trending_score: number | null
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

// stopwordi za clustering / story ključne besede
const STORY_STOPWORDS = new Set([
  'in','da','se','je','so','na','v','za','po','pri','s','z','od','kot','ali','če','ce','kaj','ko','že','ze',
  'video','foto','intervju','kolumna','komentar','analiza','vse','slovenija','slovenije','slovenci','slovencev',
])

// še vedno generiramo story_id, če ga boš kdaj želel uporabljati direktno
function makeStoryIdFromTitle(rawTitle: string): string | null {
  const base = normTitle(rawTitle)
  if (!base) return null
  const words = base.split(/[^a-z]+/).filter(Boolean)
  const filtered = words.filter(w => !STORY_STOPWORDS.has(w))
  if (!filtered.length) return base.slice(0, 80)
  const sorted = Array.from(new Set(filtered)).sort()
  const core = sorted.slice(0, 8).join('-')
  return core.slice(0, 120)
}

function softDedupe<T extends { source?: string; title?: string; publishedAt?: number }>(arr: T[]): T[] {
  const byKey = new Map<string, T>()
  for (const it of arr) {
    const key = `${(it.source || '').trim()}|${normTitle(it.title || '')}|${tsSec(it.publishedAt || 0)}`
    const prev = byKey.get(key)
    if (!prev || (it.publishedAt || 0) > (prev.publishedAt || 0)) byKey.set(key, it)
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
  const msFromNumber =
    typeof item.publishedAt === 'number' && Number.isFinite(item.publishedAt) && item.publishedAt > 0 ? item.publishedAt : null
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
  const storyId = makeStoryIdFromTitle(title)

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
    story_id: storyId,
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

/* ---------------- handler ---------------- */
type PagedOk = { items: NewsItem[]; nextCursor: number | null }
type ListOk = NewsItem[]
type Err = { error: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<PagedOk | ListOk | Err>) {
  try {
    const paged = req.query.paged === '1'
    const wantsFresh = req.query.forceFresh === '1'
    const source = (req.query.source as string) || null
    const variant = (req.query.variant as string) || null // 'trending' ali null

    // --- kdo sme sprožit ingest ---
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

    const defaultLimit = paged ? 40 : 60
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? defaultLimit), 10) || defaultLimit, 1),
      200,
    )
    const cursor = req.query.cursor ? Number(req.query.cursor) : null

    /* --------- SPECIAL: TRENDING VARIANTA --------- */
    if (variant === 'trending') {
      const WINDOW_HOURS = 6
      const MIN_SOURCES = 2
      const MIN_KEYWORD_LEN = 4
      const MIN_OVERLAP = 2

      const nowMs = Date.now()
      const sinceMs = nowMs - WINDOW_HOURS * 60 * 60 * 1000

      let q = supabaseRead
        .from('news')
        .select(
          'id, link, link_canonical, link_key, title, source, image, contentsnippet, summary, isodate, pubdate, published_at, publishedat, created_at',
        )
        .gt('publishedat', sinceMs)
        .order('publishedat', { ascending: false })
        .order('id', { ascending: false })
        .limit(500)

      if (source && source !== 'Vse') q = q.eq('source', source)

      const { data, error } = await q
      if (error) return res.status(500).json({ error: `DB: ${error.message}` })

      const rows = (data || []) as Row[]

      type Meta = {
        row: Row
        ms: number
        keywords: Set<string>
        source: string
      }

      const meta: Meta[] = []

      for (const r of rows) {
        const ms =
          (r.publishedat && Number(r.publishedat)) ||
          toMs(r.published_at) ||
          toMs(r.pubdate) ||
          toMs(r.isodate) ||
          toMs(r.created_at) ||
          nowMs

        const base = normTitle(r.title || '')
        if (!base) continue

        const parts = base.split(/[^a-z]+/).filter(Boolean)
        const keywordsArr = parts.filter(w => w.length >= MIN_KEYWORD_LEN && !STORY_STOPWORDS.has(w))
        if (!keywordsArr.length) continue

        const kw = new Set<string>()
        for (const w of keywordsArr) kw.add(w)

        meta.push({
          row: r,
          ms,
          keywords: kw,
          source: r.source,
        })
      }

      // če res ni nič za grupirat, vrni navaden "latest" za to okno
      if (!meta.length) {
        const items = softDedupe(rows.map(rowToItem)).sort((a, b) => b.publishedAt - a.publishedAt)
        res.setHeader('Cache-Control', 'no-store')
        if (paged) return res.status(200).json({ items: items.slice(0, limit), nextCursor: null })
        return res.status(200).json(items.slice(0, limit))
      }

      // sort po ms DESC, da novejši "vodijo" skupine
      meta.sort((a, b) => b.ms - a.ms)

      type Group = {
        rows: Row[]
        sources: Set<string>
        firstMs: number
        lastMs: number
        keywords: Set<string>
      }

      const groups: Group[] = []

      for (const m of meta) {
        let assigned = false

        for (const g of groups) {
          let overlap = 0
          for (const kw of m.keywords) {
            if (g.keywords.has(kw)) {
              overlap++
              if (overlap >= MIN_OVERLAP) break
            }
          }

          if (overlap >= MIN_OVERLAP) {
            g.rows.push(m.row)
            g.sources.add(m.source)
            if (m.ms < g.firstMs) g.firstMs = m.ms
            if (m.ms > g.lastMs) g.lastMs = m.ms
            for (const kw of m.keywords) g.keywords.add(kw)
            assigned = true
            break
          }
        }

        if (!assigned) {
          const kwSet = new Set<string>()
          for (const w of m.keywords) kwSet.add(w)
          groups.push({
            rows: [m.row],
            sources: new Set<string>([m.source]),
            firstMs: m.ms,
            lastMs: m.ms,
            keywords: kwSet,
          })
        }
      }

      const scored: { row: Row; score: number }[] = []

      for (const g of groups) {
        const sourceCount = g.sources.size
        if (sourceCount < MIN_SOURCES) continue

        const ageHours = (nowMs - g.firstMs) / (60 * 60 * 1000)
        const ageFactor = 1 / Math.log(ageHours + 2)

        const score = sourceCount * ageFactor

        const rep = g.rows
          .slice()
          .sort((a, b) => {
            const am =
              (a.publishedat && Number(a.publishedat)) ||
              toMs(a.published_at) ||
              toMs(a.pubdate) ||
              toMs(a.isodate) ||
              toMs(a.created_at) ||
              0
            const bm =
              (b.publishedat && Number(b.publishedat)) ||
              toMs(b.published_at) ||
              toMs(b.pubdate) ||
              toMs(b.isodate) ||
              toMs(b.created_at) ||
              0
            return bm - am
          })[0]

        scored.push({ row: rep, score })
      }

      if (!scored.length) {
        // nič multicource zgodb → fallback na navaden latest iz okna
        const items = softDedupe(rows.map(rowToItem)).sort((a, b) => b.publishedAt - a.publishedAt)
        res.setHeader('Cache-Control', 'no-store')
        if (paged) return res.status(200).json({ items: items.slice(0, limit), nextCursor: null })
        return res.status(200).json(items.slice(0, limit))
      }

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        const am =
          (a.row.publishedat && Number(a.row.publishedat)) ||
          toMs(a.row.published_at) ||
          toMs(a.row.pubdate) ||
          toMs(a.row.isodate) ||
          toMs(a.row.created_at) ||
          0
        const bm =
          (b.row.publishedat && Number(b.row.publishedat)) ||
          toMs(b.row.published_at) ||
          toMs(b.row.pubdate) ||
          toMs(b.row.isodate) ||
          toMs(b.row.created_at) ||
          0
        return bm - am
      })

      const selectedRows = scored.slice(0, limit).map(s => s.row)
      const items = softDedupe(selectedRows.map(rowToItem))

      res.setHeader('Cache-Control', 'no-store')
      if (paged) return res.status(200).json({ items, nextCursor: null })
      return res.status(200).json(items)
    }

    /* --------- DEFAULT: navaden feed --------- */

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
    const items = softDedupe(rawItems).sort((a, b) => b.publishedAt - a.publishedAt)

    const nextCursor = rows.length === limit
      ? (rows[rows.length - 1].publishedat ? Number(rows[rows.length - 1].publishedat) : null)
      : null

    res.setHeader('Cache-Control', 'no-store')
    if (paged) return res.status(200).json({ items, nextCursor })
    return res.status(200).json(items)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
