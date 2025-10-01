// pages/api/archive.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '@/lib/supabase'
import { PostgrestSingleResponse } from '@supabase/supabase-js'

type DbRow = {
  id: string
  source: string
  title: string
  link: string
  summary: string | null
  published_at: string | null
}

type Payload = {
  items: DbRow[]
  counts: Record<string, number>
  total: number
  nextCursor: string | null
  fallbackLive?: boolean
}

function startEndOfDay(dateISO: string) {
  const d = new Date(dateISO)
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999))
  return { start: start.toISOString(), end: end.toISOString() }
}

function isToday(dateISO: string) {
  const now = new Date()
  const ymd = (n: Date) => `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}-${String(n.getUTCDate()).padStart(2, '0')}`
  return ymd(new Date(dateISO)) === ymd(now)
}

async function fetchDayFromSupabase(dateISO: string, limit: number, cursorISO?: string | null) {
  const { start, end } = startEndOfDay(dateISO)

  let q = supabase
    .from('news')
    .select('id,source,title,link,summary,published_at', { head: false })
    .gte('published_at', start)
    .lte('published_at', end)
    .order('published_at', { ascending: false })

  if (cursorISO) {
    q = q.lt('published_at', cursorISO)
  }

  const res: PostgrestSingleResponse<DbRow[]> = await q.limit(limit)
  if (res.error) throw res.error

  const items = (res.data ?? []).filter((x) => !!x.link && !!x.published_at)
  return { items }
}

async function fetchCountsForDay(dateISO: string) {
  const { start, end } = startEndOfDay(dateISO)
  const res: PostgrestSingleResponse<{ source?: string }[]> = await supabase
    .from('news')
    .select('source', { head: false })
    .gte('published_at', start)
    .lte('published_at', end)

  if (res.error) throw res.error
  const counts: Record<string, number> = {}
  for (const row of res.data ?? []) {
    const key = String(row.source ?? 'Neznano')
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Payload | { error: string }>) {
  try {
    const { date, cursor, limit: rawLimit } = req.query
    if (!date || typeof date !== 'string') return res.status(400).json({ error: 'Missing ?date=YYYY-MM-DD' })

    const limit = Math.min(Math.max(parseInt(String(rawLimit ?? '40'), 10) || 40, 10), 200)

    // 1) Preberi iz Supabase (samo published_at)
    const { items } = await fetchDayFromSupabase(date, limit, typeof cursor === 'string' ? cursor : null)
    const nextCursor = items.length ? items[items.length - 1].published_at : null
    const counts = await fetchCountsForDay(date)
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    // 2) fallback: če danes in prazno → pokliči /api/news
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
        const filtered = (Array.isArray(arr) ? arr : [])
          .map((n) => ({
            id: String(n.link ?? n.id ?? ''),
            source: String(n.source ?? 'Neznano'),
            title: String(n.title ?? '(brez naslova)'),
            link: String(n.link ?? ''),
            summary: (n.summary as string | null) ?? null,
            published_at: new Date(n.published_at ?? n.publishedAt ?? Date.now()).toISOString(),
          }))
          .filter((x) => !!x.link && !!x.published_at)

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
    console.error('archive.ts error:', e)
    return res.status(200).json({ items: [], counts: {}, total: 0, nextCursor: null })
  }
}
