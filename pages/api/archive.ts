// pages/api/archive.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })

type Row = {
  id: number
  link: string
  title: string
  source: string
  summary: string | null
  contentsnippet: string | null
  published_at: string | null   // lahko NULL
  publishedat: number | null    // bigint (ms) — uporabljamo za filter/sort
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

// lokalna polnoč izbranega dne → [startISO,endISO] in [startMs,endMs]
function parseDateRange(dayISO?: string) {
  const today = new Date()
  const base = dayISO ? new Date(`${dayISO}T00:00:00`) : new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(base)
  const end = new Date(base); end.setDate(end.getDate() + 1)
  return { startISO: start.toISOString(), endISO: end.toISOString(), startMs: start.getTime(), endMs: end.getTime() }
}

// cursor: publishedat__id (npr. 1729730400000__123456)
function parseCursor(raw: string | null): { ms: number | null; id: number | null } {
  if (!raw) return { ms: null, id: null }
  const parts = String(raw).split('__')
  if (parts.length === 2) {
    const ms = Number(parts[0]); const id = Number(parts[1])
    if (Number.isFinite(ms) && Number.isFinite(id)) return { ms, id }
  }
  return { ms: null, id: null } // legacy ignoriramo
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiOk | ApiErr>) {
  try {
    const dateStr = (req.query.date as string) || undefined
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '200'), 10) || 200, 1), 500)
    const rawCursor: string | null = (req.query.cursor as string) || null
    const { startISO, endISO, startMs, endMs } = parseDateRange(dateStr)
    const cur = parseCursor(rawCursor)

    // ------- ITEMS po (publishedat DESC, id DESC) -------
    let q = supabase
      .from('news')
      .select('id, link, title, source, summary, contentsnippet, published_at, publishedat')
      .gte('publishedat', startMs)
      .lt('publishedat', endMs)
      .order('publishedat', { ascending: false })
      .order('id', { ascending: false })

    if (cur.ms != null && cur.id != null) {
      // (publishedat < ms) OR (publishedat = ms AND id < lastId)
      const orExpr = `publishedat.lt.${cur.ms},and(publishedat.eq.${cur.ms},id.lt.${cur.id})`
      q = q.or(orExpr as any)
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
      summary: r.summary?.trim() ? r.summary : (r.contentsnippet?.trim() ? r.contentsnippet : null),
      contentsnippet: r.contentsnippet,
      published_at: r.published_at,
      publishedat: r.publishedat,
    }))

    let nextCursor: string | null = null
    if (rows && rows.length === limit) {
      const last = (rows as Row[])[rows.length - 1]
      if (Number.isFinite(last?.publishedat) && Number.isFinite(last?.id)) {
        nextCursor = `${last.publishedat}__${last.id}`
      }
    }

    // ------- COUNTS – nazaj na tvoj RPC (zanesljivo) -------
    const { data: rpcData, error: rpcError } = await supabase.rpc('counts_by_source', {
      start_iso: startISO,
      end_iso: endISO,
    })
    if (rpcError) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(500).json({ error: `RPC error: ${rpcError.message}` })
    }

    const counts: Record<string, number> = {}
    for (const row of (rpcData as any[]) || []) counts[row.source] = Number(row.count)
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ items, counts, total, nextCursor, fallbackLive: false })
  } catch (e: any) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
