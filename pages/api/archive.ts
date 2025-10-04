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
  published_at: string | null   // timestamptz (ISO)
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
  nextCursorTs: string | null
  nextCursorId: number | null
  // za hiter “sanity check”
  windowStart: string
  windowEnd: string
}
type ApiErr = { error: string }

/** Lokalni dan → UTC ISO okno [start, nextStart) */
function dayWindowISO(dayISO?: string) {
  const now = new Date()
  const [y, m, d] = dayISO
    ? dayISO.split('-').map(n => parseInt(n, 10))
    : [now.getFullYear(), now.getMonth() + 1, now.getDate()]

  const startLocal = new Date(y, m - 1, d, 0, 0, 0, 0)       // 00:00 lokalno
  const nextStartLocal = new Date(y, m - 1, d + 1, 0, 0, 0)  // naslednji dan 00:00 lokalno

  return {
    start: startLocal.toISOString(),        // npr. 2025-10-01T22:00:00.000Z (CEST)
    nextStart: nextStartLocal.toISOString() // npr. 2025-10-02T22:00:00.000Z
  }
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

    // kursor: kombinacija (published_at, id)
    const cursorTs: string | null = (req.query.cursor_ts as string) || null
    const cursorId: number | null = req.query.cursor_id
      ? Number(req.query.cursor_id)
      : null

    const { start, nextStart } = dayWindowISO(dateStr)

    /* === ITEMS (DESC po published_at, potem id) === */
    let q = supabase
      .from('news')
      .select('id, link, title, source, summary, contentsnippet, published_at, publishedat')
      .gte('published_at', start)
      .lt('published_at', nextStart)              // << polodprto okno – ničesar po 00:00 naslednjega dne
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })

    if (cursorTs && cursorId != null) {
      // (ts < cursorTs) OR (ts = cursorTs AND id < cursorId)
      q = q.or(
        `published_at.lt.${cursorTs},and(published_at.eq.${cursorTs},id.lt.${cursorId})`,
      )
    }

    q = q.limit(limit)

    const { data: rows, error } = await q
    if (error) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(500).json({ error: `DB error: ${error.message}` })
    }

    const items: ApiItem[] = (rows as Row[]).map(r => ({
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

    // naslednji kursor
    const last = (rows as Row[])[(rows || []).length - 1]
    const nextCursorTs = rows && rows.length === limit ? (last?.published_at || null) : null
    const nextCursorId = rows && rows.length === limit ? (last?.id ?? null) : null

    /* === COUNTS po virih (brez .group()) === */
    const { data: srcRows, error: countsErr } = await supabase
      .from('news')
      .select('source')
      .gte('published_at', start)
      .lt('published_at', nextStart)

    if (countsErr) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(500).json({ error: `DB error: ${countsErr.message}` })
    }

    const counts: Record<string, number> = {}
    for (const r of srcRows || []) {
      const s = (r as any).source as string
      if (!s) continue
      counts[s] = (counts[s] || 0) + 1
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      items,
      counts,
      total,
      nextCursorTs,
      nextCursorId,
      windowStart: start,
      windowEnd: nextStart,
    })
  } catch (e: any) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
