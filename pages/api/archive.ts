// pages/api/archive.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

/* ======================== Types ======================== */

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
  // robusten kursor: kombinacija (published_at, id)
  nextCursorTs: string | null
  nextCursorId: number | null
}

type ApiErr = { error: string }

/* ======================== Helpers ======================== */

/**
 * Pretvori YYYY-MM-DD (lokalni koledarski dan) v UTC ISO interval
 * [start, end], kjer je end = 23:59:59.999 lokalno.
 * Ne uporabljamo 'new Date("YYYY-MM-DDT00:00:00")' zaradi možnih razlik
 * v interpretaciji; raje sestavimo datum iz delov.
 */
function parseDateRange(dayISO?: string) {
  const today = new Date()

  let y: number, m: number, d: number
  if (dayISO) {
    const [yy, mm, dd] = dayISO.split('-').map(n => parseInt(n, 10))
    y = yy; m = mm; d = dd
  } else {
    y = today.getFullYear()
    m = today.getMonth() + 1
    d = today.getDate()
  }

  // Lokalna polnoč do lokalnega konca dneva
  const startLocal = new Date(y, m - 1, d, 0, 0, 0, 0)
  const endLocal   = new Date(y, m - 1, d, 23, 59, 59, 999)

  return {
    start: startLocal.toISOString(),
    end: endLocal.toISOString(),
  }
}

/* ======================== Handler ======================== */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>,
) {
  try {
    const dateStr = (req.query.date as string) || undefined

    // koliko vrstic na "stran"
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? '200'), 10) || 200, 1),
      500,
    )

    // robusten kursor: published_at + id (oba sta potrebna!)
    const cursorTs: string | null = (req.query.cursor_ts as string) || null
    const cursorId: number | null = req.query.cursor_id
      ? Number(req.query.cursor_id)
      : null

    // interval koledarskega dneva v lokalnem času → UTC ISO
    const { start, end } = parseDateRange(dateStr)

    /* ========== ITEMS (order: published_at DESC, id DESC) ========== */
    let q = supabase
      .from('news')
      .select(
        'id, link, title, source, summary, contentsnippet, published_at, publishedat',
      )
      .gte('published_at', start)   // znotraj lokalnega dneva
      .lte('published_at', end)     // do 23:59:59.999
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })

    if (cursorTs && cursorId != null) {
      // Strogo "starejše" kot trenutni konec: (ts < cursorTs) OR (ts = cursorTs AND id < cursorId)
      // Supabase PostgREST: .or() z and() pogojem
      q = q.or(`published_at.lt.${cursorTs},and(published_at.eq.${cursorTs},id.lt.${cursorId})`)
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

    // naslednji kursor (če imamo točno 'limit' rezultatov)
    const last = (rows as Row[])[(rows || []).length - 1]
    const nextCursorTs = rows && rows.length === limit ? (last?.published_at || null) : null
    const nextCursorId = rows && rows.length === limit ? (last?.id ?? null) : null

    /* ========== COUNTS po virih – en sam agregatni query ========== */
    const { data: countsRows, error: countsErr } = await supabase
      .from('news')
      .select('source, count:id', { head: false })
      .gte('published_at', start)
      .lte('published_at', end)
      .group('source')

    if (countsErr) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(500).json({ error: `DB error: ${countsErr.message}` })
    }

    const counts: Record<string, number> = {}
    for (const r of countsRows || []) {
      const src = (r as any).source as string
      const cnt = Number((r as any).count || 0)
      counts[src] = cnt
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    // Arhiv naj bo vedno svež
    res.setHeader('Cache-Control', 'no-store')

    return res.status(200).json({
      items,
      counts,
      total,
      nextCursorTs,
      nextCursorId,
    })
  } catch (e: any) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
