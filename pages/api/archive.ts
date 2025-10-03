// pages/api/archive.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

// ---- DB Row shape (subset) ----
type Row = {
  id: number
  link: string
  title: string
  source: string
  image: string | null
  contentsnippet: string | null
  summary: string | null
  isodate: string | null                 // timestamptz
  pubdate: string | null                 // timestamptz
  published_at: string | null            // timestamptz (canonical, set by trigger)
  publishedat: number | null             // bigint ms
  created_at: string | null              // timestamptz
}

// ---- API item sent to client ----
export type ApiItem = {
  id: string
  link: string
  title: string
  source: string
  summary: string | null
  published_at: string | null
  publishedat?: number | null
}

type ApiOk = {
  items: ApiItem[]
  counts: Record<string, number>
  total: number
  nextCursor: string | null
  fallbackLive?: boolean
}
type ApiErr = { error: string }

// Helper: parse local YYYY-MM-DD to UTC day range
function parseDateRange(dayISO?: string) {
  // Expected YYYY-MM-DD in local tz; convert to [start,end) UTC
  const today = new Date()
  const base = dayISO ? new Date(`${dayISO}T00:00:00`) : new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(base)
  const end = new Date(base); end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

// Helper: compute publishedAt ms on the fly (robust to column changes)
function rowPublishedMs(r: Row): number {
  if (r.publishedat && Number.isFinite(Number(r.publishedat))) return Number(r.publishedat)
  const cands = [r.published_at, r.isodate, r.pubdate, r.created_at].filter(Boolean) as string[]
  for (const iso of cands) {
    const ms = Date.parse(iso)
    if (!Number.isNaN(ms)) return ms
  }
  return 0
}

// Serialize cursor as "<ms>_<id>" (keyset for ORDER BY published_at DESC, id DESC)
function encodeCursor(ms: number, id: number) {
  return `${ms}_${id}`
}
function decodeCursor(s: string | null): { ms: number, id: number } | null {
  if (!s) return null
  const m = String(s).match(/^(\d+)_(\d+)$/)
  if (!m) return null
  return { ms: Number(m[1]), id: Number(m[2]) }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiOk | ApiErr>) {
  try {
    const dateStr = (req.query.date as string) || undefined
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '200'), 10) || 200, 1), 500)
    // Composite cursor: "<ms>_<id>"
    const cursorRaw = (req.query.cursor as string) || null
    const cursor = decodeCursor(cursorRaw)

    const { start, end } = parseDateRange(dateStr)

    // === ITEMS ===
    let q = supabase
      .from('news')
      .select('id, link, title, source, summary, contentsnippet, isodate, pubdate, published_at, publishedat, created_at')
      .gte('published_at', start)
      .lt('published_at', end)
      // Order by our canonical timestamp desc, then id desc (stable)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })

    if (cursor) {
      // WHERE (published_at < cursor.ms) OR (published_at = cursor.ms AND id < cursor.id)
      // PostgREST or() syntax
      const iso = new Date(cursor.ms).toISOString()
      const or = `and(published_at.eq.${iso},id.lt.${cursor.id}),published_at.lt.${iso}`
      q = q.or(or)
    }

    q = q.limit(limit)

    const { data: rows, error } = await q
    if (error) return res.status(500).json({ error: `DB error: ${error.message}` })

    const items: ApiItem[] = (rows as Row[]).map(r => ({
      id: String(r.id),
      link: r.link,
      title: r.title,
      source: r.source,
      summary: (r.summary && r.summary.trim())
        ? r.summary
        : ((r.contentsnippet && r.contentsnippet.trim()) ? r.contentsnippet : null),
      published_at: r.published_at,
      publishedat: r.publishedat ?? rowPublishedMs(r), // keep for client-side helpers
    }))

    let nextCursor: string | null = null
    if (rows && rows.length === limit) {
      const last = rows[rows.length - 1] as Row
      const ms = rowPublishedMs(last)
      nextCursor = encodeCursor(ms, last.id)
    }

    // === COUNTS by source ===
    const { data: distinctRows, error: distinctErr } = await supabase
      .from('news')
      .select('source')
      .gte('published_at', start)
      .lt('published_at', end)

    if (distinctErr) return res.status(500).json({ error: `DB error: ${distinctErr.message}` })

    const distinctSources = Array.from(new Set((distinctRows || []).map((r: any) => r.source).filter(Boolean)))

    const entries = await Promise.all(
      distinctSources.map(async (src) => {
        const { count, error: cntErr } = await supabase
          .from('news')
          .select('id', { count: 'exact', head: true })
          .gte('published_at', start)
          .lt('published_at', end)
          .eq('source', src)
        if (cntErr) return [src, 0] as const
        return [src, Number(count || 0)] as const
      })
    )

    const counts: Record<string, number> = {}
    for (const [src, c] of entries) counts[src] = c
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30')
    return res.status(200).json({ items, counts, total, nextCursor, fallbackLive: false })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
