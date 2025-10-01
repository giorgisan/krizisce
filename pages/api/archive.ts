// pages/api/archive.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase' // uporablja tvoj obstoječi klient
import { PostgrestSingleResponse } from '@supabase/supabase-js'

type NewsRow = {
  id: string
  source: string
  title: string
  link: string
  summary?: string | null
  published_at: string // ISO v bazi
}

type Payload = {
  items: NewsRow[]
  counts: Record<string, number>
  total: number
  nextCursor: string | null // ISO za naslednji klic (starejši od)
}

function startEndOfDay(dateISO: string) {
  const d = new Date(dateISO) // pričakujemo YYYY-MM-DD
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999))
  return { start: start.toISOString(), end: end.toISOString() }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Payload | { error: string }>) {
  try {
    const { date, cursor, limit: rawLimit } = req.query
    if (!date || typeof date !== 'string') return res.status(400).json({ error: 'Missing ?date=YYYY-MM-DD' })

    const limit = Math.min(Math.max(parseInt(String(rawLimit ?? '40'), 10) || 40, 10), 200)
    const { start, end } = startEndOfDay(date)

    // osnovni filter za dan
    let q = supabase
      .from('news')
      .select('id,source,title,link,summary,published_at', { head: false })
      .gte('published_at', start)
      .lte('published_at', end)
      .order('published_at', { ascending: false })

    // cursor = ISO published_at; vrnemo STAREJŠE (strict)
    if (cursor && typeof cursor === 'string') {
      q = q.lt('published_at', cursor)
    }

    const listRes: PostgrestSingleResponse<NewsRow[]> = await q.limit(limit)
    if (listRes.error) throw listRes.error

    const items = listRes.data ?? []

    // nasl. kurzor = published_at zadnjega
    const nextCursor = items.length ? items[items.length - 1].published_at : null

    // counts po virih za cel dan (brez kurzorja, da dobiš total)
    const countsRes: PostgrestSingleResponse<Pick<NewsRow, 'source'>[]> = await supabase
      .from('news')
      .select('source', { head: false })
      .gte('published_at', start)
      .lte('published_at', end)

    if (countsRes.error) throw countsRes.error

    const counts: Record<string, number> = {}
    for (const r of countsRes.data ?? []) counts[r.source] = (counts[r.source] ?? 0) + 1
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    return res.status(200).json({ items, counts, total, nextCursor })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Archive API error' })
  }
}
