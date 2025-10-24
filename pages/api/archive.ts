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
  nextCursor: string | null
  fallbackLive?: boolean
}
type ApiErr = { error: string }

// Lokalna polnoč izbranega dne → ISO v UTC (Postgres timestamptz-friendly)
function parseDateRange(dayISO?: string) {
  const today = new Date()
  const base = dayISO
    ? new Date(`${dayISO}T00:00:00`) // interpretira se kot lokalni čas
    : new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(base)
  const end = new Date(base)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

// Cursor v obliki "published_at__id"
function parseCursor(raw: string | null): { ts: string | null; id: number | null; legacy: boolean } {
  if (!raw) return { ts: null, id: null, legacy: false }
  const parts = String(raw).split('__')
  if (parts.length === 2) {
    const ts = parts[0]
    const id = Number(parts[1])
    if (ts && Number.isFinite(id)) return { ts, id, legacy: false }
  }
  // legacy: star format (samo published_at), še vedno podprto
  return { ts: raw, id: null, legacy: true }
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
    const rawCursor: string | null = (req.query.cursor as string) || null
    const { start, end } = parseDateRange(dateStr)
    const cur = parseCursor(rawCursor)

    // ------- ITEMS: keyset pagination (published_at DESC, id DESC) -------
    let q = supabase
      .from('news')
      .select('id, link, title, source, summary, contentsnippet, published_at, publishedat')
      .gte('published_at', start)
      .lt('published_at', end)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })

    if (cur.ts && cur.id != null && !cur.legacy) {
      // (published_at < ts) OR (published_at = ts AND id < lastId)
      const orExpr = `published_at.lt.${cur.ts},and(published_at.eq.${cur.ts},id.lt.${cur.id})`
      q = q.or(orExpr as any)
    } else if (cur.ts) {
      // legacy podpora: samo published_at < cursor
      q = q.lt('published_at', cur.ts)
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

    // naslednji cursor: vzemi zadnji zapis s strani
    let nextCursor: string | null = null
    if (rows && rows.length === limit) {
      const last = (rows as Row[])[rows.length - 1]
      if (last?.published_at && Number.isFinite(last?.id)) {
        nextCursor = `${last.published_at}__${last.id}`
      }
    }

    // ------- COUNTS (RPC ostane po published_at) -------
    const { data: rpcData, error: rpcError } = await supabase.rpc('counts_by_source', {
      start_iso: start,
      end_iso: end,
    })

    if (rpcError) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(500).json({ error: `RPC error: ${rpcError.message}` })
    }

    const counts: Record<string, number> = {}
    for (const row of (rpcData as any[]) || []) {
      counts[row.source] = Number(row.count)
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

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
