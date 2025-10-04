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
  published_at: string | null        // timestamptz (ISO iz baze, vedno UTC)
  publishedat: number | null         // bigint (ms), opcionalno
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
  // NOVO: kompozitni kurzor (published_at, id) – stabilno straničenje
  nextCursorTs: string | null
  nextCursorId: number | null
  // BACK-COMPAT: staro ime, da stari frontend (če kje ostal) še dela
  nextCursor?: string | null
  // info (debug/trace)
  windowStart: string
  windowEnd: string
}

type ApiErr = { error: string }

// ------- helpers: lokalni dan (Europe/Ljubljana) → UTC okno [start, nextStart) -------

/** Zamika trenutka v danem TZ (ms) – “local → UTC” helper */
function tzOffsetMs(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d)

  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? '0')
  const yyyy = get('year'), MM = get('month'), dd = get('day')
  const HH = get('hour'), mm = get('minute'), ss = get('second')
  const utcTS = Date.UTC(yyyy, MM - 1, dd, HH, mm, ss)
  return utcTS - d.getTime()
}

/** Vrni [startUTC, nextStartUTC] za izbran lokalni dan (Europe/Ljubljana) */
function dayWindowUTC(dayISO?: string) {
  const tz = 'Europe/Ljubljana'
  const base = dayISO ? new Date(`${dayISO}T00:00:00`) : new Date()
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(base)
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(base)
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(base)

  const startLocal = new Date(`${y}-${m}-${d}T00:00:00`)
  const nextLocal = new Date(`${y}-${m}-${d}T00:00:00`)
  nextLocal.setDate(nextLocal.getDate() + 1)

  const startUTC = new Date(startLocal.getTime() - tzOffsetMs(startLocal, tz))
  const nextUTC  = new Date(nextLocal.getTime() - tzOffsetMs(nextLocal, tz))
  return { start: startUTC.toISOString(), nextStart: nextUTC.toISOString() }
}

/** YYYY-MM-DD (lokalni dan iz timestampa) */
function localDateISO(iso: string | null, tz = 'Europe/Ljubljana') {
  if (!iso) return ''
  const d = new Date(iso)
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(d)
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(d)
  const da = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(d)
  return `${y}-${m}-${da}`
}

// -------------------------------- handler --------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>,
) {
  try {
    const dateStr = (req.query.date as string) || undefined
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '250'), 10) || 250, 1), 500)

    // kompozitni kurzor: published_at + id
    const cursorTs: string | null  = (req.query.cursor_ts as string) || null
    const cursorId: number | null  = req.query.cursor_id ? Number(req.query.cursor_id) : null

    const { start, nextStart } = dayWindowUTC(dateStr)

    // 1) povleci okno po UTC
    let q = supabase
      .from('news')
      .select('id, link, title, source, summary, contentsnippet, published_at, publishedat')
      .gte('published_at', start)
      .lt('published_at', nextStart)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })

    if (cursorTs && cursorId != null) {
      // striktno starejše: (published_at < ts) OR (published_at = ts AND id < id)
      q = q.or(`published_at.lt.${cursorTs},and(published_at.eq.${cursorTs},id.lt.${cursorId})`)
    }

    q = q.limit(limit)

    const { data: rows, error } = await q
    if (error) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(500).json({ error: `DB error: ${error.message}` })
    }

    // 2) strogo filtriraj na točen lokalni dan (varno čez prehode DST)
    const wantedDay = dateStr || localDateISO(new Date().toISOString(), 'Europe/Ljubljana')
    const filtered = (rows as Row[]).filter(r => localDateISO(r.published_at) === wantedDay)

    const items: ApiItem[] = filtered.map(r => ({
      id: String(r.id),
      link: r.link,
      title: r.title,
      source: r.source,
      summary:
        r.summary?.trim()
          ? r.summary
          : r.contentsnippet?.trim()
          ? r.contentsnippet
          : null,
      contentsnippet: r.contentsnippet,
      published_at: r.published_at,
      publishedat: r.publishedat,
    }))

    // 3) kurzor iz zadnje VRSTICE “rows” (ne filtered), da paginacija ostane monotona
    const last = (rows as Row[])[(rows || []).length - 1]
    const nextCursorTs = rows && rows.length === limit ? (last?.published_at || null) : null
    const nextCursorId = rows && rows.length === limit ? (last?.id ?? null) : null

    // 4) counts iz VIDLJIVIH itemov
    const counts: Record<string, number> = {}
    for (const it of items) counts[it.source] = (counts[it.source] || 0) + 1
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      items,
      counts,
      total,
      nextCursorTs,
      nextCursorId,
      nextCursor: nextCursorTs, // back-compat
      windowStart: start,
      windowEnd: nextStart,
    })
  } catch (e: any) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
