// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

/**
 * Stable "freshest-first" news API.
 * - Sorts by `published_at DESC` on the DB (single source of truth).
 * - Falls back to `publishedat` (ms), then `isodate/pubdate`, finally `created_at`.
 * - Supports paging with cursor = ISO timestamp string (published_at of last item).
 * - Optional filtering by source.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })

type Row = {
  id: number
  link: string
  title: string
  source: string
  image: string | null
  contentsnippet: string | null
  summary: string | null
  isodate: string | null
  pubdate: string | null
  published_at: string | null          // timestamptz
  publishedat: number | null           // bigint ms
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

type PagedOk = { items: NewsItem[]; nextCursor: string | null }
type ListOk = NewsItem[]
type Err = { error: string }

function toMs(s?: string | null): number {
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
    link: r.link,
    source: r.source,
    image: r.image || null,
    contentSnippet: r.summary?.trim() || r.contentsnippet?.trim() || null,
    publishedAt: ms,
    isoDate: r.published_at || r.isodate || r.pubdate || null,
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<PagedOk | ListOk | Err>) {
  try {
    const paged = req.query.paged === '1'
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? (paged ? 40 : 60)), 10) || (paged ? 40 : 60), 1), 200)
    const cursor = (req.query.cursor as string) || null        // ISO string (published_at of last item)
    const source = (req.query.source as string) || null

    // Base select
    let q = supabase
      .from('news')
      .select('id, link, title, source, image, contentsnippet, summary, isodate, pubdate, published_at, publishedat, created_at')
      .order('published_at', { ascending: false })  // relies on trigger keeping it non-null
      .order('id', { ascending: false })            // tie-breaker for same second

    if (source && source !== 'Vse') q = q.eq('source', source)

    if (cursor) {
      // fetch strictly older than last published_at on the client
      q = q.lt('published_at', cursor)
    }

    q = q.limit(limit)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: `DB: ${error.message}` })

    const rows = (data || []) as Row[]
    const items = rows.map(rowToItem)

    const nextCursor = rows.length === limit ? (rows[rows.length - 1].published_at || null) : null

    if (paged) {
      const payload: PagedOk = { items, nextCursor }
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(payload)
    } else {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(items)
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
