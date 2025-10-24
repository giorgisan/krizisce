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

/** Vrne offset v urah za podani datum v podanem časovnem pasu.
 *  Uporabimo poldne UTC, da zanesljivo dobimo pravilni offset (1 ali 2).
 */
function offsetHoursForDate(y: number, m: number, d: number, tz: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit'
  })
  // Poldne UTC istega koledarskega dne
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
  const parts = dtf.formatToParts(noonUtc)
  const hh = Number(parts.find(p => p.type === 'hour')?.value ?? '0')
  // Če je v Ljubljani 13:00, je offset +1; če 14:00, offset +2
  return hh - 12
}

/** Meje lokalnega dne (Europe/Ljubljana) kot UTC epoch ms + ISO (za RPC) */
function parseDateRangeTZ(dayISO?: string, tz = 'Europe/Ljubljana') {
  const base = dayISO ? new Date(dayISO + 'T00:00:00Z') : new Date()
  const y = base.getUTCFullYear()
  const m = base.getUTCMonth() + 1
  const d = base.getUTCDate()

  const offStart = offsetHoursForDate(y, m, d, tz)
  const offEnd   = offsetHoursForDate(y, m, d + 1, tz) // lahko drugačen ob prehodu DST

  const startMs = Date.UTC(y, m - 1, d, -offStart, 0, 0, 0)
  const endMs   = Date.UTC(y, m - 1, d + 1, -offEnd, 0, 0, 0)

  return {
    startISO: new Date(startMs).toISOString(),
    endISO:   new Date(endMs).toISOString(),
    startMs,
    endMs,
  }
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
    const { startISO, endISO, startMs, endMs } = parseDateRangeTZ(dateStr, 'Europe/Ljubljana')
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

    // ------- COUNTS – tvoj stabilni RPC (po istih mejah dneva) -------
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
