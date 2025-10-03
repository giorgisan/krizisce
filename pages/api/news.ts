// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// --- Supabase client --------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

// --- Types ------------------------------------------------------------------
export type ApiNewsItem = {
  title: string
  link: string
  source: string
  image: string | null
  contentSnippet: string
  isoDate: string | null
  publishedAt: number // epoch ms
}

type PagedOk = { items: ApiNewsItem[]; nextCursor: number | null }
type ListOk  = ApiNewsItem[]
type ApiErr  = { error: string }

// --- Helpers ----------------------------------------------------------------
function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

// canonical timestamp resolver: prefer `published_at` (timestamptz), then bigint `publishedat`,
// then `isodate` from RSS; all returned as epoch ms
function resolveTs(row: any): number {
  // 1) timestamptz from DB (canonical, UTC)
  if (row?.published_at) {
    const ms = Date.parse(String(row.published_at))
    if (!Number.isNaN(ms)) return ms
  }
  // 2) bigint(ms) fallback
  if (row?.publishedat != null) {
    const ms = Number(row.publishedat)
    if (Number.isFinite(ms) && ms > 0) return ms
  }
  // 3) RSS iso date fallback
  if (row?.isodate) {
    const ms = Date.parse(String(row.isodate))
    if (!Number.isNaN(ms)) return ms
  }
  return Date.now()
}

function mapRow(row: any): ApiNewsItem {
  return {
    title: row.title,
    link: row.link,
    source: row.source,
    image: row.image ?? null,
    contentSnippet: (row.contentsnippet ?? row.summary ?? '') || '',
    isoDate: row.published_at ?? row.isodate ?? null,
    publishedAt: resolveTs(row),
  }
}

function setCaching(res: NextApiResponse, forceFresh: boolean) {
  if (forceFresh) {
    res.setHeader('Cache-Control', 'no-store, must-revalidate')
  } else {
    // short edge cache, safe because client uses cache: 'no-store' for freshness checks
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30')
  }
}

// --- Handler ----------------------------------------------------------------
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PagedOk | ListOk | ApiErr>,
) {
  const isPaged = typeof req.query.paged !== 'undefined'
  const forceFresh = String(req.query.forceFresh || '') === '1'

  try {
    // common SELECT
    let q = supabase
      .from('news')
      .select('id, link, title, source, image, contentsnippet, summary, isodate, published_at, publishedat')

    // optional source filter (ignore "Vse")
    const source = (req.query.source as string) || ''
    if (source && source !== 'Vse') q = q.eq('source', source)

    // paging branch ----------------------------------------------------------
    if (isPaged) {
      const limitParam = parseInt(String(req.query.limit ?? '40'), 10)
      const limit = clamp(Number.isFinite(limitParam) ? limitParam : 40, 1, 200)

      const cursorMs = req.query.cursor != null ? Number(req.query.cursor) : null

      // strict ordering: first by time, then by id (deterministic)
      q = q.order('published_at', { ascending: false })
           .order('id', { ascending: false })
           .limit(limit)

      // keyset: fetch strictly older than the cursor timestamp if provided
      if (cursorMs != null && Number.isFinite(cursorMs)) {
        const iso = new Date(cursorMs).toISOString()
        q = q.lt('published_at', iso)
      }

      const { data: rows, error } = await q
      if (error) {
        setCaching(res, true)
        return res.status(500).json({ error: `DB error: ${error.message}` })
      }

      const items = (rows ?? []).map(mapRow)
      const nextCursor =
        items.length === limit ? items[items.length - 1].publishedAt : null

      setCaching(res, forceFresh)
      return res.status(200).json({ items, nextCursor })
    }

    // non-paged: latest batch for the homepage --------------------------------
    const LIMIT = 120
    q = q.order('published_at', { ascending: false })
         .order('id', { ascending: false })
         .limit(LIMIT)

    const { data: rows, error } = await q
    if (error) {
      setCaching(res, true)
      return res.status(500).json({ error: `DB error: ${error.message}` })
    }

    const items = (rows ?? []).map(mapRow)
    setCaching(res, forceFresh)
    return res.status(200).json(items)
  } catch (e: any) {
    setCaching(res, true)
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
