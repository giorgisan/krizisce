// pages/api/archive.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

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
  published_at: string | null   // timestamptz
  publishedat: number | null    // bigint (ms)
}

type ApiItem = {
  id: string
  link: string
  title: string
  source: string
  summary: string | null
  contentsnippet: string | null
  published_at: string | null
  publishedat: number | null
}

type ApiOk = {
  items: ApiItem[]
  counts: Record<string, number>
  total: number
  nextCursor: string | null      // ISO timestamp (published_at of last item)
  fallbackLive?: boolean
}
type ApiErr = { error: string }

function parseDateRange(dayISO?: string) {
  // Lokalni dan → [start,end) v UTC
  const today = new Date()
  const base = dayISO
    ? new Date(`${dayISO}T00:00:00`)
    : new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(base)
  const end = new Date(base)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>,
) {
  try {
    const dateStr = (req.query.date as string) || undefined
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? '200'), 10) || 200, 1),
      500,
    )

    // cursor je ISO published_at (string)
    const cursor: string | null = (req.query.cursor as string) || null

    const { start, end } = parseDateRange(dateStr)

    /* === ITEMS (published_at DESC, id DESC) === */
    let q = supabase
      .from('news')
      .select(
        'id, link, title, source, summary, contentsnippet, published_at, publishedat',
      )
      .gte('published_at', start)
      .lt('published_at', end)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })

    if (cursor) {
      // strictly older than the last visible published_at
      q = q.lt('published_at', cursor)
    }

    q = q.limit(limit)

    const { data: rows, error } = await q
    if (error) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(500).json({ error: `DB error: ${error.message}` })
    }

    const items: ApiItem[] = (rows as Row[]).map((r) => ({
      id: String(r.id),
      link: r.link,
      title: r.title,
      source: r.source,
      summary:
        r.summary && r.summary.trim()
          ? r.summary
          : r.contentsnippet && r.contentsnippet.trim()
          ? r.contentsnippet
          : null,
      contentsnippet: r.contentsnippet,
      published_at: r.published_at,
      publishedat: r.publishedat,
    }))

    const nextCursor: string | null =
      rows && rows.length === limit
        ? ((rows as Row[])[rows.length - 1].published_at || null)
        : null

    /* === COUNTS po source: en sam agregatni query === */
    const { data: grouped, error: groupedErr } = await supabase
      .from('news')
      .select('source, count:count()') // PostgREST: count alias
      .gte('published_at', start)
      .lt('published_at', end)
      .group('source')

    if (groupedErr) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(500).json({ error: `DB error: ${groupedErr.message}` })
    }

    const countsEntries = (grouped || []).map((r: any) => [r.source, Number(r.count || 0)] as const)
    const counts = Object.fromEntries(countsEntries)
    const total = countsEntries.reduce((a, [, c]) => a + c, 0)

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      items,
      counts,
      total,
      nextCursor,
      fallbackLive: false,
    })
  } catch (e: any) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
