// pages/api/archive.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '@/lib/supabase'
import { PostgrestSingleResponse } from '@supabase/supabase-js'

type DbRow = {
  id?: string
  source?: string
  title?: string
  link?: string
  summary?: string | null
  published_at?: string | null
  publishedAt?: number | string | null
  timestamp?: number | string | null
  created_at?: string | null
  createdAt?: number | string | null
}

type CleanRow = {
  id: string
  source: string
  title: string
  link: string
  summary: string | null
  published_at: string // ISO
}

type Payload = {
  items: CleanRow[]
  counts: Record<string, number>
  total: number
  nextCursor: string | null
  fallbackLive?: boolean
}

function startEndOfDay(dateISO: string) {
  const d = new Date(dateISO)
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999))
  return { start: start.toISOString(), end: end.toISOString(), startMs: +start, endMs: +end }
}

function isToday(dateISO: string) {
  const now = new Date()
  const ymd = (n: Date) => `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}-${String(n.getUTCDate()).padStart(2, '0')}`
  return ymd(new Date(dateISO)) === ymd(now)
}

function toISO(v: unknown): string | null {
  if (typeof v === 'string' && v) {
    const t = new Date(v)
    return isNaN(+t) ? null : t.toISOString()
  }
  if (typeof v === 'number' && v > 0) {
    const t = new Date(v)
    return isNaN(+t) ? null : t.toISOString()
  }
  return null
}

function normalizeRow(r: DbRow): CleanRow | null {
  if (!r) return null
  const id = String(r.id ?? r.link ?? '')
  const source = String(r.source ?? 'Neznano')
  const title = String(r.title ?? '(brez naslova)')
  const link = String(r.link ?? '')
  const summary = r.summary ?? null

  const iso =
    toISO(r.published_at) ??
    toISO(r.publishedAt) ??
    toISO(r.timestamp) ??
    toISO(r.created_at) ??
    toISO(r.createdAt)

  if (!link || !iso) return null
  return { id, source, title, link, summary, published_at: iso }
}

async function tryColumnRange(
  col: string,
  from: string | number,
  to: string | number,
  limit: number,
  cursorISO?: string | null,
  orderAsc = false
): Promise<PostgrestSingleResponse<DbRow[]>> {
  let q = supabase
    .from('news')
    .select('id,source,title,link,summary,published_at,publishedAt,timestamp,created_at,createdAt', { head: false })
    .gte(col as any, from as any)
    .lte(col as any, to as any)
    .order(col as any, { ascending: orderAsc ? true : false })

  if (cursorISO) {
    // za ms stolpce pretvori v ms
    const c = +new Date(cursorISO)
    // poskusi oba scenarija (ISO in ms). PostgREST bo sprejel samo, če tip ustreza.
    let q2 = q.lt(col as any, cursorISO as any)
    let res = await q2.limit(limit)
    if (res.error) {
      q2 = supabase
        .from('news')
        .select('id,source,title,link,summary,published_at,publishedAt,timestamp,created_at,createdAt', { head: false })
        .gte(col as any, from as any)
        .lte(col as any, to as any)
        .lt(col as any, c as any)
        .order(col as any, { ascending: orderAsc ? true : false })
      res = await q2.limit(limit)
      return res
    }
    return res
  }

  return await q.limit(limit)
}

async function fetchDayFromSupabase(dateISO: string, limit: number, cursorISO?: string | null) {
  const { start, end, startMs, endMs } = startEndOfDay(dateISO)

  const candidates: Array<{ col: string; from: string | number; to: string | number }> = [
    { col: 'published_at', from: start, to: end },
    { col: 'publishedAt', from: startMs, to: endMs },
    { col: 'timestamp', from: startMs, to: endMs },
    { col: 'created_at', from: start, to: end },
    { col: 'createdAt', from: startMs, to: endMs },
  ]

  for (const c of candidates) {
    try {
      const res = await tryColumnRange(c.col, c.from, c.to, limit, cursorISO)
      if (!res.error) {
        const items = (res.data ?? []).map(normalizeRow).filter(Boolean) as CleanRow[]
        return { items, usedCol: c.col }
      }
    } catch {
      // ignore and try next column
    }
  }

  return { items: [] as CleanRow[], usedCol: null as string | null }
}

async function fetchCountsForDay(dateISO: string, usedCol: string | null) {
  const { start, end, startMs, endMs } = startEndOfDay(dateISO)

  const tryCounts = async (col: string, from: string | number, to: string | number) => {
    const r: PostgrestSingleResponse<{ source?: string }[]> = await supabase
      .from('news')
      .select('source', { head: false })
      .gte(col as any, from as any)
      .lte(col as any, to as any)
    if (r.error) throw r.error
    const counts: Record<string, number> = {}
    for (const row of r.data ?? []) {
      const key = String(row.source ?? 'Neznano')
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }

  const plans: Array<{ col: string; from: string | number; to: string | number }> = usedCol
    ? usedCol.endsWith('_at') || usedCol === 'published_at' || usedCol === 'created_at'
      ? [{ col: usedCol, from: start, to: end }]
      : [{ col: usedCol, from: startMs, to: endMs }]
    : [
        { col: 'published_at', from: start, to: end },
        { col: 'publishedAt', from: startMs, to: endMs },
        { col: 'timestamp', from: startMs, to: endMs },
        { col: 'created_at', from: start, to: end },
        { col: 'createdAt', from: startMs, to: endMs },
      ]

  for (const p of plans) {
    try {
      return await tryCounts(p.col, p.from, p.to)
    } catch {
      // continue
    }
  }
  return {}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Payload | { error: string }>) {
  try {
    const { date, cursor, limit: rawLimit } = req.query
    if (!date || typeof date !== 'string') return res.status(400).json({ error: 'Missing ?date=YYYY-MM-DD' })

    const limit = Math.min(Math.max(parseInt(String(rawLimit ?? '40'), 10) || 40, 10), 200)

    // 1) poskusi Supabase (avtodetekcija stolpca)
    const { items, usedCol } = await fetchDayFromSupabase(date, limit, typeof cursor === 'string' ? cursor : null)
    let nextCursor = items.length ? items[items.length - 1].published_at : null
    let counts = await fetchCountsForDay(date, usedCol)
    let total = Object.values(counts).reduce((a, b) => a + b, 0)

    // 2) fallback na današnji dan iz /api/news (če arhiv še prazen)
    if (items.length === 0 && isToday(date)) {
      const host =
        (req.headers['x-forwarded-host'] as string) ||
        (req.headers.host as string) ||
        (process.env.VERCEL_URL as string)
      const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
      const origin = host?.startsWith('http') ? host : `${proto}://${host}`
      const resp = await fetch(`${origin}/api/news?forceFresh=1`, { cache: 'no-store' }).catch(() => null)

      if (resp && resp.ok) {
        const arr = (await resp.json()) as any[]
        const normalized: CleanRow[] = (Array.isArray(arr) ? arr : [])
          .map((n) => ({
            id: String(n.link ?? n.id ?? ''),
            source: String(n.source ?? 'Neznano'),
            title: String(n.title ?? '(brez naslova)'),
            link: String(n.link ?? ''),
            summary: (n.summary as string | null) ?? null,
            published_at: toISO(n.publishedAt ?? n.published_at ?? Date.now())!,
          }))
          .filter((x) => !!x.link && !!x.published_at)

        // filtriraj strogo po dnevu (če /api/news vrne tudi starejše)
        const { start, end } = startEndOfDay(date)
        const filtered = normalized.filter((x) => {
          const t = +new Date(x.published_at)
          return t >= +new Date(start) && t <= +new Date(end)
        })

        const liveCounts: Record<string, number> = {}
        for (const r of filtered) liveCounts[r.source] = (liveCounts[r.source] ?? 0) + 1

        return res.status(200).json({
          items: filtered,
          counts: liveCounts,
          total: filtered.length,
          nextCursor: null,
          fallbackLive: true,
        })
      }
    }

    return res.status(200).json({ items, counts, total, nextCursor })
  } catch (e: any) {
    // raje prazno kot 500 (da se UI ne sesuje)
    return res.status(200).json({ items: [], counts: {}, total: 0, nextCursor: null })
  }
}
