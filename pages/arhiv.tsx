// pages/arhiv.tsx
'use client'

import React, {
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
  startTransition,
  useRef,
  useLayoutEffect,
} from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeoHead from '@/components/SeoHead'
import { sourceColors } from '@/lib/sources'

type ApiItem = {
  id: string
  link: string
  title: string
  source: string
  published_at?: string | null
  publishedat?: number | null
  summary?: string | null
  contentsnippet?: string | null
  description?: string | null
  content?: string | null
}
type ApiOk = {
  items: ApiItem[]
  counts: Record<string, number>
  total: number
  nextCursor: string | null
  fallbackLive?: boolean
}
type ApiPayload = ApiOk | { error: string }

const yyyymmdd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const fmtDDMMYYYY = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** DST-safe premik po lokalnih dnevih */
const isoPlusDays = (iso: string, delta: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const nd = new Date(y, (m ?? 1) - 1, (d ?? 1) + delta, 0, 0, 0, 0)
  return yyyymmdd(nd)
}

const norm = (s: string) => {
  try { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') } catch { return s.toLowerCase() }
}
const highlight = (txt: string, q: string) => {
  if (!q) return txt
  const t = txt ?? ''
  const nn = norm(t), nq = norm(q).trim()
  if (!nq) return t
  const parts = nq.split(/\s+/).filter(w => w.length >= 2)
  if (!parts.length) return t
  const ranges: Array<[number, number]> = []
  parts.forEach(tok => {
    let i = 0
    while (true) {
      const k = nn.indexOf(tok, i)
      if (k === -1) break
      ranges.push([k, k + tok.length]); i = k + tok.length
    }
  })
  if (!ranges.length) return t
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const r of ranges) {
    if (!merged.length || r[0] > merged[merged.length - 1][1]) merged.push([...r] as [number, number])
    else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], r[1])
  }
  const out: React.ReactNode[] = []
  let last = 0
  merged.forEach(([a, b], idx) => {
    if (a > last) out.push(t.slice(last, a))
    out.push(<mark key={`${a}-${b}-${idx}`} className="bg-yellow-200 dark:bg-yellow-600/60 rounded px-0.5">{t.slice(a, b)}</mark>)
    last = b
  })
  if (last < t.length) out.push(t.slice(last))
  return <>{out}</>
}

const tsOf = (a: ApiItem) => {
  const t1 = a.published_at ? Date.parse(a.published_at) : NaN
  if (Number.isFinite(t1)) return t1
  const t2 = a.publishedat != null ? Number(a.publishedat) : NaN
  return Number.isFinite(t2) ? t2 : 0
}

// ---- TIME HELPERS (DST-safe lokalni dan) ----
const dayBoundsLocal = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const start = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0).getTime()
  const end   = new Date(y, (m ?? 1) - 1, (d ?? 1) + 1, 0, 0, 0, 0).getTime()
  return { start, end }
}

/** Normalizira epoch – če bi kdaj dobil sekunde, pretvori v ms. */
const epochMsOf = (x: number) => (x < 1e11 ? x * 1000 : x)

/** Trdo filtriranje elementov na lokalni dan [start, end). */
const filterToLocalDay = (items: ApiItem[], iso: string) => {
  const { start, end } = dayBoundsLocal(iso)
  return items.filter(it => {
    const t = tsOf(it)
    const ms = epochMsOf(t)
    return ms >= start && ms < end
  })
}

const relativeTime = (ms: number) => {
  const diff = Math.max(0, Date.now() - ms)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'pred <1 min'
  if (m < 60) return `pred ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `pred ${h} h`
  const d = Math.floor(h / 24)
  return `pred ${d} d`
}
const fmtClock = (ms: number) => {
  try {
    return new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms))
  } catch { return '' }
}

/* ---------- Fallback: Supabase ---------- */

async function supabaseFetchDay(iso: string, limit = 250, cursor?: number | null) {
  const { createClient } = await import('@supabase/supabase-js')
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })

  const { start, end } = dayBoundsLocal(iso)

  let q = supabase
    .from('news')
    .select('id, link, title, source, published_at, publishedat, summary, contentsnippet, description, content')
    .gte('publishedat', start)
    .lt('publishedat', end)
    .order('publishedat', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)

  if (cursor && Number.isFinite(cursor)) q = q.lt('publishedat', cursor)

  const { data, error } = await q
  if (error) throw error

  const items = (data ?? []) as ApiItem[]
  const nextCursor =
    items.length === limit
      ? Number(items[items.length - 1]?.publishedat) || null
      : null

  return { items, nextCursor }
}

/* ======================== Calendar popover (nespremenjeno) ======================== */

type CalProps = {
  open: boolean
  anchorRef: React.RefObject<HTMLDivElement>
  valueISO: string
  onClose: () => void
  onPickISO: (iso: string) => void
}
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const addMonths = (d: Date, m: number) => new Date(d.getFullYear(), d.getMonth() + m, 1)

function CalendarPopover({ open, anchorRef, valueISO, onClose, onPickISO }: CalProps) {
  const popRef = useRef<HTMLDivElement | null>(null)
  const [view, setView] = useState<Date>(() => startOfMonth(new Date(valueISO)))
  const todayISO = yyyymmdd(new Date())

  useEffect(() => { if (open) setView(startOfMonth(new Date(valueISO))) }, [open, valueISO])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => {
      if (!popRef.current) return
      if (popRef.current.contains(e.target as Node)) return
      if (anchorRef.current?.contains(e.target as Node)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, onClose, anchorRef])

  const [pos, setPos] = useState<{top:number;left:number} | null>(null)
  useLayoutEffect(() => {
    if (!open) return
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ top: r.bottom + 6 + window.scrollY, left: r.left + window.scrollX })
  }, [open, anchorRef])

  const todayISO2 = todayISO // samo, da lint ne teži

  if (!open || !pos) return null
  return (
    <div
      ref={popRef}
      role="dialog"
      aria-label="Izberi datum"
      className="fixed z-50 rounded-lg border border-gray-300/70 dark:border-gray-700/70
                 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-3 shadow-xl w-[280px]"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="flex items-center justify-between mb-2">
        <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg:black/5 dark:hover:bg:white/5"
                onClick={() => setView(v => addMonths(v, -1))}
                aria-label="Prejšnji mesec">‹</button>
        <div className="text-sm font-medium">
          {new Intl.DateTimeFormat('sl-SI', { month: 'long', year: 'numeric' }).format(view)}
        </div>
        <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg:black/5 dark:hover:bg:white/5"
                onClick={() => setView(v => addMonths(v, +1))}
                aria-label="Naslednji mesec">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-500 dark:text-gray-400 mb-1">
        {['Po','To','Sr','Če','Pe','So','Ne'].map((d) => <div key={d} className="text-center">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {(() => {
          const out: JSX.Element[] = []
          const first = startOfMonth(view)
          const firstDow = (first.getDay() + 6) % 7
          const start = new Date(first); start.setDate(first.getDate() - firstDow)
          for (let i = 0; i < 42; i++) {
            const d = new Date(start); d.setDate(start.getDate() + i)
            const iso = yyyymmdd(d)
            const dim: 'prev'|'curr'|'next' =
              d.getMonth() < view.getMonth() ? 'prev' :
              d.getMonth() > view.getMonth() ? 'next' : 'curr'
            const isToday = iso === todayISO2
            const isFuture = iso > todayISO2
            const active = iso === valueISO
            const disabled = isFuture
            const base =
              disabled
                ? 'opacity-40 cursor-not-allowed pointer-events-none'
                : active
                  ? 'bg-brand text-white'
                  : isToday
                    ? 'ring-1 ring-brand/60'
                    : 'hover:bg-black/5 dark:hover:bg:white/5'
            out.push(
              <button
                key={iso}
                onClick={() => !disabled && onPickISO(iso)}
                aria-disabled={disabled}
                className={`h-8 rounded-md text-sm text-center ${dim !== 'curr' ? 'text-gray-400 dark:text-gray-600' : ''} ${base}`}
              >
                {d.getDate()}
              </button>
            )
          }
          return out
        })()}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button onClick={() => onPickISO(yyyymmdd(new Date()))} className="text-xs underline hover:opacity-80">
          Danes
        </button>
        <button onClick={onClose}
                className="text-xs px-2 py-1 rounded-md border border-gray-300/70 dark:border-gray-700/70 hover:bg-black/5 dark:hover:bg:white/5">
          Zapri
        </button>
      </div>
    </div>
  )
}

/* ======================== Page ======================== */

export default function ArchivePage() {
  const [date, setDate] = useState(() => yyyymmdd(new Date()))
  const [items, setItems] = useState<ApiItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)

  const [isDateOpen, setIsDateOpen] = useState(false)
  const dateWrapRef = useRef<HTMLDivElement | null>(null)

  const sortDesc = (a: ApiItem, b: ApiItem) => tsOf(b) - tsOf(a) || Number(a.id) - Number(b.id)

  // full-day fetch with cursor paging (API -> fallback Supabase)
  const abortRef = useRef<AbortController | null>(null)
  async function fetchAll(d: string) {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController(); abortRef.current = ctrl
    setLoading(true); setErrorMsg(null)

    const LIMIT = 250

    // 1) API (Vercel)
    try {
      let cursor: string | null = null
      let acc: ApiItem[] = []
      const seen = new Set<string>()
      while (true) {
        const qs = new URLSearchParams({ date: d, limit: String(LIMIT) })
        if (cursor) qs.set('cursor', cursor)
        qs.set('_t', String(Date.now()))
        const res = await fetch(`/api/archive?${qs.toString()}`, { cache: 'no-store', signal: ctrl.signal })
        const data: ApiPayload = await res.json().catch(() => ({ error: 'Neveljaven odgovor' }))
        if (!res.ok || 'error' in data) throw new Error('Napaka pri nalaganju arhiva')

        for (const it of data.items) if (!seen.has(it.link)) { seen.add(it.link); acc.push(it) }
        // TRDO FILTRIRAJ NA LOKALNI DAN
        const clamped = filterToLocalDay(acc, d)
        setItems([...clamped].sort(sortDesc))

        // counts iz filtriranih
        const c: Record<string, number> = {}
        for (const it of clamped) c[it.source] = (c[it.source] || 0) + 1
        setCounts(c)

        if (!data.nextCursor) break
        cursor = data.nextCursor
        await new Promise(r => setTimeout(r, 0))
      }
      setLoading(false)
      return
    } catch {
      // nadaljuj na Supabase fallback
    }

    // 2) Fallback: Supabase (anon)
    try {
      let cursor: number | null = null
      let acc: ApiItem[] = []
      const seen = new Set<string>()
      while (true) {
        const { items, nextCursor } = await supabaseFetchDay(d, LIMIT, cursor)

        for (const it of items) if (!seen.has(it.link)) { seen.add(it.link); acc.push(it) }
        const clamped = filterToLocalDay(acc, d)
        setItems([...clamped].sort(sortDesc))

        const c: Record<string, number> = {}
        for (const it of clamped) c[it.source] = (c[it.source] || 0) + 1
        setCounts(c)

        if (!nextCursor) break
        cursor = nextCursor
        await new Promise(r => setTimeout(r, 0))
      }
    } catch (e) {
      if (!(abortRef.current?.signal.aborted)) setErrorMsg('Arhiva trenutno ni mogoče naložiti.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll(date)
    return () => abortRef.current?.abort()
  }, [date])

  // auto-refresh for today
  const todayStr = useMemo(() => yyyymmdd(new Date()), [])
  const latestTsRef = useRef<number>(0)
  useEffect(() => { latestTsRef.current = items.length ? tsOf(items[0]) : 0 }, [items])
  useEffect(() => {
    if (date !== todayStr) return
    const t = setInterval(async () => {
      if (document.hidden || !latestTsRef.current) return
      try {
        const res = await fetch(`/api/archive?date=${encodeURIComponent(date)}&limit=1&_t=${Date.now()}`, { cache: 'no-store' })
        const data: any = await res.json()
        const newest = (data?.items?.length ? tsOf(data.items[0]) : 0) || 0
        if (newest > latestTsRef.current) await fetchAll(date)
      } catch {}
    }, 60_000)
    return () => clearInterval(t)
  }, [date, todayStr])

  const deferredSearch = useDeferredValue(search)

  const filtered = useMemo(() => {
    const q = norm(deferredSearch.trim())
    return items
      .filter((it) => !sourceFilter || it.source === sourceFilter)
      .filter((it) => {
        if (!q) return true
        const summary = (it.summary ?? it.contentsnippet ?? it.description ?? it.content ?? '') || ''
        return norm(`${it.title} ${summary} ${it.source}`).includes(q)
      })
      .sort(sortDesc)
  }, [items, deferredSearch, sourceFilter])

  const displayCounts = useMemo(
    () => Object.fromEntries(Object.entries(counts).filter(([k]) => k !== 'TestVir')),
    [counts],
  )
  const total = useMemo(() => Object.values(displayCounts).reduce((a, b) => a + b, 0), [displayCounts])
  const maxCount = useMemo(() => Math.max(1, ...Object.values(displayCounts)), [displayCounts])

  const onPickDate = (iso: string) => {
    startTransition(() => { setSourceFilter(null); setSearch(''); setItems([]); setDate(iso) })
  }

  const isSelectedToday = date === todayStr
  const timeForRow = (ms: number) => {
    if (!isSelectedToday) return fmtClock(ms)
    const rowDay = yyyymmdd(new Date(ms))
    return rowDay === date ? relativeTime(ms) : fmtClock(ms)
  }

  // Handlers za –1 / +1 dan
  const goPrevDay = () => onPickDate(isoPlusDays(date, -1))
  const goNextDay = () => {
    const next = isoPlusDays(date, +1)
    if (next > todayStr) return
    onPickDate(next)
  }
  const nextDisabled = useMemo(() => isoPlusDays(date, +1) > todayStr, [date, todayStr])

  return (
    <>
      <Header />
      <SeoHead title="Križišče — Arhiv" description="Pregled novic po dnevih in medijih." />

      <main className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-6 pb-6">
        <section className="max-w-6xl mx-auto flex flex-col gap-5">
          {/* Orodna vrstica */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs border border-gray-300/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/60 hover:bg-white/90 dark:hover:bg-gray-800/80 transition" title="Nazaj na naslovnico" aria-label="Nazaj na naslovnico">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M5 10v10h5v-6h4v6h5V10" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                Nazaj
              </Link>

              {/* –1 dan */}
              <button
                onClick={goPrevDay}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-xs border border-gray-300/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/60 hover:bg-white/90 dark:hover:bg-gray-800/80 transition"
                title="Prejšnji dan"
                aria-label="Prejšnji dan"
              >
                ‹
              </button>

              {/* Date input (readOnly) */}
              <div ref={dateWrapRef} className="relative">
                <input
                  type="text"
                  value={fmtDDMMYYYY(date)}
                  readOnly
                  inputMode="none"
                  role="button"
                  aria-haspopup="dialog"
                  aria-expanded={isDateOpen ? 'true' : 'false'}
                  onFocus={() => setIsDateOpen(true)}
                  onClick={() => setIsDateOpen(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsDateOpen(true) } }}
                  className="px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/50 select-none w-[140px] text-center"
                  aria-label="Izberi datum"
                />
              </div>

              {/* +1 dan */}
              <button
                onClick={goNextDay}
                disabled={nextDisabled}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-xs border border-gray-300/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/60 hover:bg-white/90 dark:hover:bg-gray-800/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Naslednji dan"
                aria-label="Naslednji dan"
              >
                ›
              </button>

              <button onClick={() => fetchAll(date)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border border-gray-300/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/60 hover:bg-white/90 dark:hover:bg-gray-800/80 transition" title="Osveži dan" aria-label="Osveži dan">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 4v6h6M20 20v-6h-6" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M20 8a8 8 0 0 0-14-4M4 16a8 8 0 0 0 14 4" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                Osveži
              </button>
            </div>

            {/* search */}
            <div className="relative w-full sm:w-96">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" />
              </svg>
              <input
                type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Išči po naslovu ali podnaslovu …"
                className="w-full pl-8 pr-3 py-2 rounded-md text-sm bg-white/80 dark:bg-gray-800/70 border border-gray-300/70 dark:border-gray-700/70 focus:outline-none focus:ring-2 focus:ring-brand/50"
              />
            </div>
          </div>

          <CalendarPopover open={isDateOpen} anchorRef={dateWrapRef} valueISO={date} onClose={() => setIsDateOpen(false)} onPickISO={iso => { setIsDateOpen(false); onPickDate(iso) }} />

          {/* Graf */}
          <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-900/70 backdrop-blur p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">
                Objave po medijih
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">(klikni stolpec za filtriranje)</span>
              </h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">Skupaj: {total}</span>
            </div>

            <div className="mt-3 space-y-2">
              {Object.entries(displayCounts).sort((a, b) => b[1] - a[1]).map(([source, count]) => {
                const active = sourceFilter === source
                return (
                  <button key={source} onClick={() => setSourceFilter(curr => (curr === source ? null : source))}
                          className="w-full text-left group" title={active ? 'Počisti filter' : `Prikaži samo: ${source}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-32 shrink-0 text-sm ${active ? 'text-brand' : 'text-gray-700 dark:text-gray-300'}`}>{source}</div>
                      <div className={`flex-1 h-3 rounded-full overflow-hidden ${active ? 'bg-brand/20 dark:bg-brand/30' : 'bg-gray-200 dark:bg-gray-800'}`}>
                        <div className="h-full bg-brand dark:bg-brand" style={{ width: `${(count / maxCount) * 100}%` }} aria-hidden />
                      </div>
                      <div className={`w-12 text-right text-sm tabular-nums ${active ? 'text-brand' : ''}`}>{count}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {sourceFilter && (
              <div className="mt-2">
                <button onClick={() => setSourceFilter(null)} className="text-xs text-gray-600 dark:text-gray-400 underline decoration-dotted hover:text-gray-800 dark:hover:text-gray-200">
                  Počisti filter
                </button>
              </div>
            )}
          </div>

          {/* Seznam novic */}
          <div>
            <h3 className="mt-1 mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">Zadnje novice</h3>

            <div className="hidden md:grid grid-cols-[90px_1fr_160px] text-[12px] text-gray-500 dark:text-gray-400 px-3">
              <div className="sticky top-[calc(var(--hdr-h)+8px)] bg-transparent backdrop-blur pt-1 pb-1">Čas</div>
              <div className="sticky top-[calc(var(--hdr-h)+8px)] bg-transparent backdrop-blur pt-1 pb-1">Naslov</div>
              <div className="sticky top-[calc(var(--hdr-h)+8px)] bg-transparent backdrop-blur pt-1 pb-1 text-right pr-2">Vir</div>
            </div>

            <div className="rounded-md border border-gray-200/70 dark:border-gray-800/70 bg-white/50 dark:bg-gray-900/40">
              <div className="relative max-h=[56svh] max-h-[56svh] overflow-y-auto pb-3">
                {loading ? (
                  <p className="p-3 text-sm text-gray-500 dark:text-gray-400">Nalagam…</p>
                ) : errorMsg ? (
                  <p className="p-3 text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
                ) : (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filtered.map((it, i) => {
                      const link = it.link
                      const src = it.source
                      const hex = sourceColors[src] || '#7c7c7c'
                      const ts = tsOf(it)
                      const summary = (it.summary ?? it.contentsnippet ?? it.description ?? it.content ?? '').trim()

                      return (
                        <li key={`${link}-${i}`} className="px-2 sm:px-3 py-1">
                          {/* mobile */}
                          <div className="md:hidden">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">{timeForRow(ts)}</span>
                              <button
                                className="inline-flex items-center gap-1 text-[11px] text-gray-700 dark:text-gray-200 hover:opacity-80"
                                onClick={() => setSourceFilter(curr => (curr === src ? null : src))}
                                title={sourceFilter === src ? 'Počisti filter' : `Prikaži samo: ${src}`}
                              >
                                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hex }} aria-hidden />
                                {src}
                              </button>
                            </div>
                            <a href={link} target="_blank" rel="noopener noreferrer" className="block text-[13.5px] leading-tight text-gray-900 dark:text-gray-100 hover:underline mt-0.5">
                              {search.trim() ? highlight(it.title, search) : it.title}
                            </a>
                          </div>

                          {/* desktop */}
                          <div className="hidden md:grid grid-cols-[90px_1fr_160px] items-center gap-x-3">
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums text-right">{timeForRow(ts)}</span>
                            <div className="relative">
                              <a href={link} target="_blank" rel="noopener noreferrer" className="peer block text-[13px] leading-tight text-gray-900 dark:text-gray-100 hover:underline truncate">
                                {search.trim() ? highlight(it.title, search) : it.title}
                              </a>
                              {summary && (
                                <div className="pointer-events-none absolute left-0 top-full mt-1 z-50 max-w-[60ch] rounded-md bg-gray-900 text-white text-[12px] leading-snug px-2.5 py-2 shadow-lg ring-1 ring-black/20 opacity-0 invisible translate-y-1 transition peer-hover:opacity-100 peer-hover:visible peer-hover:translate-y-0">
                                  {search.trim() ? highlight(summary, search) : summary}
                                </div>
                              )}
                            </div>
                            <button
                              className="justify-self-end inline-flex items-center gap-1 text-[11px] text-gray-700 dark:text-gray-200 hover:opacity-80"
                              onClick={() => setSourceFilter(curr => (curr === src ? null : src))}
                              title={sourceFilter === src ? 'Počisti filter' : `Prikaži samo: ${src}`}
                            >
                              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hex }} aria-hidden />
                              {src}
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 h-px bg-gray-200/70 dark:bg-gray-700/50 rounded-full" />
        </section>
      </main>

      <Footer />
    </>
  )
}
