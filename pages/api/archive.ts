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
  published_at?: string | null // ISO v bazi
  publishedAt?: number | string | null // včasih number ms ali ISO string
}

type CleanRow = {
  id: string
  source: string
  title: string
  link: string
  summary: string | null
  published_at: string // vedno ISO
}

type Payload = {
  items: CleanRow[]
  counts: Record<string, number>
  total: number
  nextCursor: string | null
}

function startEndOfDay(dateISO: string) {
  const d = new Date(dateISO)
  if (Number.isNaN(d.getTime())) {
    // fallback: poskusi kot YYYY-MM-DD ročno
    const [y, m, dd] = dateISO.split('-').map((n) => parseInt(n, 10))
    const start = new Date(Date.UTC(y, (m || 1) - 1, dd || 1, 0, 0, 0))
    const end = new Date(Date.UTC(y, (m || 1) - 1, dd || 1, 23, 59, 59, 999))
    return { start: start.toISOString(), end: end.toISOString() }
  }
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999))
  return { start: start.toISOString(), end: end.toISOString() }
}

function normalizeRow(r: DbRow): CleanRow | null {
  if (!r) return null
  const id = String(r.id ?? r.link ?? '')
  const source = String(r.source ?? 'Neznano')
  const title = String(r.title ?? '(brez naslova)')
  const link = String(r.link ?? '')
  const summary = r.summary ?? null

  // published_at iz različnih virov
  let iso: string | null = null
  if (typeof r.published_at === 'string' && r.published_at) {
    iso = new Date(r.published_at).toISOString()
  } else if (typeof r.publishedAt === 'number' && r.publishedAt > 0) {
    iso = new Date(r.publishedAt).toISOString()
  } else if (typeof r.publishedAt === 'string' && r.publishedAt) {
    const t = new Date(r.publishedAt).toISOString()
    iso = t
  }
  if (!iso) return null
  if (!link) return null

  return { id, source, title, link, summary, published_at: iso }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Payload | { error: string }>
) {
  try {
    const { date, cursor, limit: rawLimit } = req.query
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Missing ?date=YYYY-MM-DD' })
    }

    const limit = Math.min(Math.max(parseInt(String(rawLimit ?? '40'), 10) || 40, 10), 200)
    const { start, end } = startEndOfDay(date)

    // 1) seznam za dan (skušamo prebrati obe možni shemi)
    let q = supabase
      .from('news')
      .select('id,source,title,link,summary,published_at,publishedAt', { head: false })
      .gte('published_at', start)
      .lte('published_at', end)
      .order('published_at', { ascending: false })

    // Če stolpec published_at ne obstaja in uporabljaš publishedAt (ms), poskusimo fallback po drugem filtru:
    // Opomba: PostgREST ne podpira "OR" v istem klicu elegantno; zato poskusimo najprej zgoraj.
    // Če vrne napako, naredimo fallback spodaj.
    let listRes: PostgrestSingleResponse<DbRow[] | null> = await q.limit(limit)

    // Fallback: poskusi z "publishedAt" (če je number ms, filtriramo čez epoch interval)
    if (listRes.error) {
      const startMs = Date.parse(start)
      const endMs = Date.parse(end)
      let q2 = supabase
        .from('news')
        .select('id,source,title,link,summary,publishedAt', { head: false })
        .gte('publishedAt', startMs)
        .lte('publishedAt', endMs)
        .order('publishedAt', { ascending: false })
      if (cursor && typeof cursor === 'string') {
        // cursor je ISO; pretvori v ms
        const cMs = Date.parse(cursor)
        q2 = q2.lt('publishedAt', cMs)
      }
      listRes = await q2.limit(limit)
    } else {
      // standardni kurzor (ISO)
      if (cursor && typeof cursor === 'string') {
        const q3 = supabase
          .from('news')
          .select('id,source,title,link,summary,published_at', { head: false })
          .gte('published_at', start)
          .lte('published_at', end)
          .lt('published_at', cursor)
          .order('published_at', { ascending: false })
        const res2: PostgrestSingleResponse<DbRow[] | null> = await q3.limit(limit)
        if (!res2.error) listRes = res2
      }
    }

    if (listRes.error) throw listRes.error
    const rawItems = (listRes.data ?? []) as DbRow[]
    const normalized = rawItems.map(normalizeRow).filter(Boolean) as CleanRow[]

    const nextCursor = normalized.length ? normalized[normalized.length - 1].published_at : null

    // 2) counts po virih za cel dan (poskusimo published_at, potem fallback publishedAt)
    let counts: Record<string, number> = {}
    {
      const countsRes: PostgrestSingleResponse<Pick<DbRow, 'source'>[] | null> = await supabase
        .from('news')
        .select('source', { head: false })
        .gte('published_at', start)
        .lte('published_at', end)

      if (countsRes.error) {
        const startMs = Date.parse(start)
        const endMs = Date.parse(end)
        const countsRes2: PostgrestSingleResponse<Pick<DbRow, 'source'>[] | null> = await supabase
          .from('news')
          .select('source', { head: false })
          .gte('publishedAt', startMs)
          .lte('publishedAt', endMs)
        if (countsRes2.error) throw countsRes2.error
        for (const r of countsRes2.data ?? []) {
          const key = String(r.source ?? 'Neznano')
          counts[key] = (counts[key] ?? 0) + 1
        }
      } else {
        for (const r of countsRes.data ?? []) {
          const key = String(r.source ?? 'Neznano')
          counts[key] = (counts[key] ?? 0) + 1
        }
      }
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    return res.status(200).json({ items: normalized, counts, total, nextCursor })
  } catch (e: any) {
    return res.status(200).json({ items: [], counts: {}, total: 0, nextCursor: null }) // raje prazno kot 500
  }
}
