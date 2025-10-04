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
  published_at: string | null   // timestamptz (ISO v bazi)
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
  nextCursorTs: string | null
  nextCursorId: number | null
  windowStart: string
  windowEnd: string
}
type ApiErr = { error: string }

/** Vrne [startUTC, nextStartUTC] za dan v lokalnem času Europe/Ljubljana (polodprto okno [start, nextStart)) */
function dayWindowUTC(dayISO?: string) {
  const tz = 'Europe/Ljubljana'
  const base = dayISO ? new Date(`${dayISO}T00:00:00`) : new Date()
  // lokalni 00:00 → ISO v tem časovnem pasu
  const fmt = new Intl.DateTimeFormat('sl-SI', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  // iz base vzemi Y-M-D v lokalnem TZ in sestavi "YYYY-MM-DDT00:00:00" lokalno
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(base) // YYYY
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(base) // MM
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(base) // DD

  const startLocal = new Date(`${y}-${m}-${d}T00:00:00`)
  const nextStartLocal = new Date(`${y}-${m}-${d}T00:00:00`)
  nextStartLocal.setDate(nextStartLocal.getDate() + 1)

  // Pretvori “lokalno” na UTC tako, da odšteješ zamik TZ:
  const startUTC = new Date(startLocal.getTime() - tzOffsetMs(startLocal, tz))
  const nextStartUTC = new Date(nextStartLocal.getTime() - tzOffsetMs(nextStartLocal, tz))

  return { start: startUTC.toISOString(), nextStart: nextStartUTC.toISOString() }
}

/** Zamika trenutka v danem TZ (v ms), uporaben za robustno pretvorbo lokalno → UTC */
function tzOffsetMs(d: Date, timeZone: string) {
  // izračun preko formatiranja – ne uporablja zalednih APIjev bazo
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(d)

  const get = (type: string) => Number(part.find(p => p.type === type)?.value || '0')
  const yyyy = get('year')
  const MM = get('month')
  const dd = get('day')
  const HH = get('hour')
  const mm = get('minute')
  const ss = get('second')

  // čas “kot da” je v UTC (ker Date.parse bere kot lokalno, uporabimo Date.UTC)
  const utcTS = Date.UTC(yyyy, MM - 1, dd, HH, mm, ss)
  return utcTS - d.getTime()
}

/** Vrne YYYY-MM-DD za podani ISO timestamp v Europe/Ljubljana */
function localDateISO(iso: string | null, tz = 'Europe/Ljubljana') {
  if (!iso) return ''
  const date = new Date(iso)
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(date)
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(date)
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(date)
  return `${y}-${m}-${d}`
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

    // kursor: (published_at, id)
    const cursorTs: string | null = (req.query.cursor_ts as string) || null
    const cursorId: number | null = req.query.cursor_id ? Number(req.query.cursor_id) : null

    const { start, nextStart } = dayWindowUTC(dateStr)

    // 1) Povleci UTC okno – super hitro na indeksu
    let q = supabase
      .from('news')
      .select('id, link, title, source, summary, contentsnippet, published_at, publishedat')
      .gte('published_at', start)
      .lt('published_at', nextStart)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })

    if (cursorTs && cursorId != null) {
      q = q.or(
        `published_at.lt.${cursorTs},and(published_at.eq.${cursorTs},id.lt.${cursorId})`,
      )
    }

    q = q.limit(limit)

    const { data: rows, error } = await q
    if (error) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(500).json({ error: `DB error: ${error.message}` })
    }

    // 2) STROGO odfiltriraj po lokalnem dnevu Europe/Ljubljana
    const wantedDay = dateStr
      ? dateStr
      : localDateISO(new Date().toISOString(), 'Europe/Ljubljana')

    const filtered = (rows as Row[]).filter(r => localDateISO(r.published_at) === wantedDay)

    const items: ApiItem[] = filtered.map(r => ({
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

    // 3) Kursor ostane stabilen – uporabljamo zadnjo VRSTICO iz “rows” (ne iz filtered),
    //    da paginacija ostane monotona in ne preskoči rezultatov, ki jih client potem
    //    v naslednjih krogih še vedno filtrira po lokalnem dnevu.
    const last = (rows as Row[])[(rows || []).length - 1]
    const nextCursorTs = rows && rows.length === limit ? (last?.published_at || null) : null
    const nextCursorId = rows && rows.length === limit ? (last?.id ?? null) : null

    // 4) Counts/total iz filtriranega (točno tisto, kar uporabnik vidi)
    const counts: Record<string, number> = {}
    for (const r of items) counts[r.source] = (counts[r.source] || 0) + 1
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      items,
      counts,
      total,
      nextCursorTs,
      nextCursorId,
      windowStart: start,
      windowEnd: nextStart,
    })
  } catch (e: any) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
