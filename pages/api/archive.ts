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
  summary?: string | null
  published_at: string | null
}

type ApiOk = {
  items: ApiItem[]
  counts: Record<string, number>
  total: number
  nextCursor: string | null
  fallbackLive?: boolean
}
type ApiErr = { error: string }

function parseDateRange(dayISO?: string) {
  // pričakujemo YYYY-MM-DD (lokalno). Pretvorimo v UTC interval [start, end)
  const today = new Date()
  const base = dayISO ? new Date(`${dayISO}T00:00:00`) : new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(base)
  const end = new Date(base)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiOk | ApiErr>) {
  try {
    const dateStr = (req.query.date as string) || undefined
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '200'), 10) || 200, 1), 500)
    const cursor = req.query.cursor ? Number(req.query.cursor) : null // keyset po `id` (manjši = starejši)

    const { start, end } = parseDateRange(dateStr)

    // === ITEMS (keyset pagination by id DESC) ===
    // izbiramo samo potrebna polja; summary poenotimo kasneje
    let q = supabase
      .from('news')
      .select('id, link, title, source, summary, contentsnippet, published_at, publishedat')
      .gte('published_at', start)
      .lt('published_at', end)
      .order('id', { ascending: false })

    if (cursor) q = q.lt('id', cursor)
    q = q.limit(limit)

    const { data: rows, error } = await q
    if (error) return res.status(500).json({ error: `DB error: ${error.message}` })

    const items: ApiItem[] = (rows as Row[]).map(r => ({
      id: String(r.id),
      link: r.link,
      title: r.title,
      source: r.source,
      // POENOTENO: vzemi summary ali contentsnippet (prazen string -> null)
      summary: (r.summary && r.summary.trim()) ? r.summary : ((r.contentsnippet && r.contentsnippet.trim()) ? r.contentsnippet : null),
      // ohranimo ISO (frontend ima že helperje)
      published_at: r.published_at,
    }))

    const nextCursor = rows && rows.length === limit ? String(rows[rows.length - 1].id) : null

    // === COUNTS po source ===
    // (Supabase REST podpira group; če bi kdaj nagajal, lahko to nadomestimo z RPC)
    const { data: countRows, error: countErr } = await supabase
      .from('news')
      .select('source, count:count(*)')
      .gte('published_at', start)
      .lt('published_at', end)
      .group('source')

    if (countErr) return res.status(500).json({ error: `DB error: ${countErr.message}` })

    const counts: Record<string, number> = {}
    let total = 0
    for (const r of (countRows as any[]) || []) {
      const c = Number(r.count) || 0
      counts[r.source] = c
      total += c
    }

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({
      items,
      counts,
      total,
      nextCursor,
      fallbackLive: false,
    })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
