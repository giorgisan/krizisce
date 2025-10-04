[FILE: pages/arhiv.tsx]
<REPLACE THE WHOLE FILE WITH THIS CONTENT>

'use client'

import React, {
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
  startTransition,
  useRef,
  useCallback,
} from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeoHead from '@/components/SeoHead'
import { NewsItem } from '@/types'
import { sourceColors } from '@/lib/sources'

// ======================= Tiny, accessible DatePicker =========================
// - single popover (not native), closes on outside click / Escape
// - dd/MM/yyyy formatting in the input
// - "Danes" quick action inside the popover
// - max = today
// - mobile friendly (>44px targets)
// -----------------------------------------------------------------------------

type DatePickerProps = {
  value: string // YYYY-MM-DD
  onChange: (yyyy_mm_dd: string) => void
  max?: string // YYYY-MM-DD
  label?: string
}

function fmtDDMMYYYY(yyyy_mm_dd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyy_mm_dd)) return yyyy_mm_dd
  const [y, m, d] = yyyy_mm_dd.split('-')
  return `${d}/${m}/${y}`
}
function toYMD(d: Date) {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const dd = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${dd}`
}
function clampToMax(d: Date, max?: string) {
  if (!max) return d
  const m = new Date(`${max}T00:00:00`)
  return d > m ? m : d
}
const WEEKDAYS = ['Po', 'To', 'Sr', 'Če', 'Pe', 'So', 'Ne']

function DatePicker({ value, onChange, max, label = 'Izberi datum' }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const todayYMD = useMemo(() => toYMD(new Date()), [])
  const maxYMD = max ?? todayYMD

  const [view, setView] = useState(() => {
    const base = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date()
    const clamped = clampToMax(base, maxYMD)
    return new Date(clamped.getFullYear(), clamped.getMonth(), 1)
  })

  useEffect(() => {
    if (!value) return
    const d = new Date(`${value}T00:00:00`)
    if (!Number.isNaN(+d)) setView(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [value])

  const daysInGrid = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1)
    const startIdx = (first.getDay() + 6) % 7 // Monday-first
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    const cells: { ymd: string; day: number; disabled: boolean; isToday: boolean }[] = []
    for (let i = 0; i < startIdx; i++) cells.push({ ymd: '', day: 0, disabled: true, isToday: false })
    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = toYMD(new Date(view.getFullYear(), view.getMonth(), d))
      const disabled = ymd > maxYMD
      const isToday = ymd === todayYMD
      cells.push({ ymd, day: d, disabled, isToday })
    }
    while (cells.length % 7 !== 0) cells.push({ ymd: '', day: 0, disabled: true, isToday: false })
    return cells
  }, [view, maxYMD, todayYMD])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current || !anchorRef.current) return
      const t = e.target as Node
      if (panelRef.current.contains(t) || anchorRef.current.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = useCallback((ymd: string) => {
    if (!ymd) return
    onChange(ymd)
    setOpen(false)
  }, [onChange])

  const goMonth = (delta: number) => {
    setView(v => new Date(v.getFullYear(), v.getMonth() + delta, 1))
  }

  return (
    <div className="relative inline-block">
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs
                   border border-gray-300/60 dark:border-gray-700/60
                   bg-white/80 dark:bg-gray-800/80 backdrop-blur"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
      >
        {fmtDDMMYYYY(value)}
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          className="absolute z-40 mt-2 w-64 rounded-lg border border-gray-200/70 dark:border-gray-700/70
                     bg-white dark:bg-gray-900 shadow-lg p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => goMonth(-1)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Prejšnji mesec"
            >
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            </button>
            <div className="text-sm font-medium">
              {new Intl.DateTimeFormat('sl-SI', { month: 'long', year: 'numeric' }).format(view)}
            </div>
            <button
              onClick={() => goMonth(1)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
              aria-label="Naslednji mesec"
              disabled={toYMD(new Date(view.getFullYear(), view.getMonth() + 1, 1)) > maxYMD}
            >
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-600 dark:text-gray-400 mb-1">
            {WEEKDAYS.map(w => <div key={w} className="py-1">{w}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {daysInGrid.map((c, i) => c.ymd ? (
              <button
                key={c.ymd}
                onClick={() => !c.disabled && pick(c.ymd)}
                disabled={c.disabled}
                className={`h-9 rounded-md text-sm select-none
                            ${c.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/10'}
                            ${value === c.ymd ? 'bg-brand text-white hover:!bg-brand' : ''}
                            ${c.isToday && value !== c.ymd ? 'ring-1 ring-brand/60' : ''}`}
                aria-current={c.isToday ? 'date' : undefined}
              >
                {c.day}
              </button>
            ) : (
              <div key={`x-${i}`} className="h-9" />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => { pick(todayYMD) }}
              className="px-2.5 py-1.5 rounded-md text-xs border border-gray-300/70 dark:border-gray-700/70 hover:bg-black/5 dark:hover:bg-white/10"
            >
              Danes
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-2.5 py-1.5 rounded-md text-xs border border-gray-300/70 dark:border-gray-700/70 hover:bg-black/5 dark:hover:bg-white/10"
            >
              Zapri
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================== API types ====================================
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

// =============================== Helpers =====================================
const yyyymmdd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

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
  try { return new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms)) }
  catch { return '' }
}
const norm = (s: string) => { try { return s.toLowerCase().normalize('NFD').replace(/\u0300-\u036f/g, '') } catch { return s.toLowerCase() } }

function highlight(text: string, q: string) {
  if (!q) return text
  const t = text ?? ''
  const nn = norm(t), nq = norm(q).trim()
  if (!nq) return t
  const tokens = Array.from(new Set(nq.split(/\s+/).filter((w) => w.length >= 2)))
  if (!tokens.length) return t
  const ranges: Array<[number, number]> = []
  for (const tok of tokens) {
    let start = 0
    while (true) {
      const idx = nn.indexOf(tok, start)
      if (idx === -1) break
      ranges.push([idx, idx + tok.length]); start = idx + tok.length
    }
  }
  if (!ranges.length) return t
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const r of ranges) {
    if (!merged.length || r[0] > merged[merged.length - 1][1]) merged.push([...r] as [number, number])
    else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], r[1])
  }
  const out: React.ReactNode[] = []
  let last = 0
  for (const [a, b] of merged) {
    if (a > last) out.push(t.slice(last, a))
    out.push(<mark key={`${a}-${b}`} className="bg-yellow-200 dark:bg-yellow-600/60 rounded px-0.5">{t.slice(a, b)}</mark>)
    last = b
  }
  if (last < t.length) out.push(t.slice(last))
  return <>{out}</>
}

function tsOf(a: ApiItem) {
  const t1 = a.published_at ? Date.parse(a.published_at) : NaN
  if (Number.isFinite(t1)) return t1
  const t2 = a.publishedat != null ? Number(a.publishedat) : NaN
  return Number.isFinite(t2) ? t2 : 0
}
function toNewsItem(a: ApiItem): NewsItem {
  return { title: a.title, link: a.link, source: a.source, publishedAt: tsOf(a) || Date.now() } as any
}

// ============================= Page ==========================================
export default function ArchivePage() {
  const [date, setDate] = useState(() => yyyymmdd(new Date()))
  const [items, setItems] = useState<ApiItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)

  // fixed news window height (mobile friendly)
  const NEWS_WINDOW_CLASSES = 'h-[60svh] md:h-[58vh] lg:h-[60vh]'

  // tick for "posodobljeno"
  const [, setNowTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setNowTick(x => x + 1), 30_000); return () => clearInterval(t) }, [])

  const sortDesc = (a: ApiItem, b: ApiItem) => tsOf(b) - tsOf(a) || Number(b.id) - Number(a.id)

  // full fetch (loop cursors)
  const abortRef = useRef<AbortController | null>(null)
  async function fetchAll(d: string) {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController(); abortRef.current = ctrl
    setLoading(true); setErrorMsg(null)
    try {
      const LIMIT = 250
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
        setItems(acc = [...acc].sort(sortDesc))
        setCounts(data.counts || {})
        setLastUpdatedMs(Date.now())

        if (!data.nextCursor) break
        cursor = data.nextCursor
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

  const todayStr = useMemo(() => yyyymmdd(new Date()), [])
  const latestTsRef = useRef<number>(0)
  useEffect(() => { latestTsRef.current = items.length ? tsOf(items[0]) : 0 }, [items])
  useEffect(() => {
    if (date !== todayStr) return
    const timer = setInterval(async () => {
      if (document.hidden) return
      if (!latestTsRef.current) return
      try {
        const res = await fetch(`/api/archive?date=${encodeURIComponent(date)}&limit=1&_t=${Date.now()}`, { cache: 'no-store' })
        const data: any = await res.json()
        const newest = (data?.items?.length ? tsOf(data.items[0]) : 0) || 0
        if (newest > latestTsRef.current) await fetchAll(date)
      } catch {}
    }, 60_000)
    return () => clearInterval(timer)
  }, [date, todayStr])

  const updatedText = useMemo(() => lastUpdatedMs ? `Posodobljeno ${relativeTime(lastUpdatedMs)}` : '', [lastUpdatedMs])
  const deferredSearch = useDeferredValue(search)

  const filteredNews = useMemo(() => {
    const q = norm(deferredSearch.trim())
    return items
      .filter((it) => !sourceFilter || it.source === sourceFilter)
      .filter((it) => {
        if (!q) return true
        const summary = (it.summary ?? it.contentsnippet ?? it.description ?? it.content ?? '') || ''
        return norm(`${it.title} ${summary} ${it.source}`).includes(q)
      })
      .sort(sortDesc)
      .map(toNewsItem)
  }, [items, deferredSearch, sourceFilter])

  const displayCounts = useMemo(() => Object.fromEntries(Object.entries(counts).filter(([k]) => k !== 'TestVir')), [counts])
  const total = useMemo(() => Object.values(displayCounts).reduce((a, b) => a + b, 0), [displayCounts])
  const maxCount = useMemo(() => Math.max(1, ...Object.values(displayCounts)), [displayCounts])

  const onPickDate = (ymd: string) => {
    startTransition(() => { setSourceFilter(null); setSearch(''); setItems([]); setDate(ymd) })
  }

  return (
    <>
      <Header />
      <SeoHead title="Križišče — Arhiv" description="Pregled novic po dnevih in medijih." />

      <main className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pb-8 pt-6">
        <section className="max-w-6xl mx-auto flex flex-col gap-5 min-h-[calc(100svh-var(--hdr-h))]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs
                           border border-gray-300/60 dark:border-gray-700/60
                           bg-white/80 dark:bg-gray-800/80 backdrop-blur transition"
                title="Nazaj na naslovnico"
                aria-label="Nazaj na naslovnico"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M5 10v10h5v-6h4v6h5V10" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                Nazaj
              </Link>

              <DatePicker value={date} onChange={onPickDate} max={todayStr} />

              <button
                onClick={() => fetchAll(date)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border
                           border-gray-300/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/80
                           hover:bg-white/90 dark:hover:bg-gray-800/80 transition"
                title="Osveži dan"
                aria-label="Osveži dan"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M4 4v6h6M20 20v-6h-6" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M20 8a8 8 0 0 0-14-4M4 16a8 8 0 0 0 14 4" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                Osveži
              </button>

              {updatedText && (
                <span className="ml-2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {updatedText}
                </span>
              )}
            </div>

            <div className="relative w-full sm:w-96">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Išči po naslovu ali podnaslovu…"
                className="w-full pl-8 pr-3 py-2 rounded-md text-sm bg-white/80 dark:bg-gray-800/70
                           border border-gray-300/70 dark:border-gray-700/70 focus:outline-none
                           focus:ring-2 focus:ring-brand/50"
              />
            </div>
          </div>

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
                  <button
                    key={source}
                    onClick={() => setSourceFilter(curr => (curr === source ? null : source))}
                    className="w-full text-left group"
                    title={active ? 'Počisti filter' : `Prikaži samo: ${source}`}
                  >
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
                <button
                  onClick={() => setSourceFilter(null)}
                  className="text-xs text-gray-600 dark:text-gray-400 underline decoration-dotted hover:text-gray-800 dark:hover:text-gray-200"
                >
                  počisti filter
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <h3 className="mt-1 mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">Zadnje novice</h3>
            <div className={`rounded-md border border-gray-200/70 dark:border-gray-800/70 bg-white/50 dark:bg-gray-900/40 ${NEWS_WINDOW_CLASSES}`}>
              <div className="h-full overflow-y-auto pb-6">
                {loading ? (
                  <p className="p-3 text-sm text-gray-500 dark:text-gray-400">Nalagam…</p>
                ) : errorMsg ? (
                  <p className="p-3 text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
                ) : (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredNews.map((n, i) => {
                      const src = (n as any).source
                      const hex = sourceColors[src] || '#7c7c7c'
                      const link = (n as any).link as string
                      const it = items.find(it => it.link === link)
                      const summary = (it?.summary ?? it?.contentsnippet ?? (it as any)?.description ?? (it as any)?.content ?? '').trim()

                      return (
                        <li key={`${link}-${i}`} className="grid grid-cols-[92px_78px_1fr] sm:grid-cols-[100px_84px_1fr] gap-x-3 sm:gap-x-4 px-2 sm:px-3 py-1.5">
                          <button
                            className="inline-flex items-center gap-1 min-w-0"
                            onClick={() => setSourceFilter(curr => (curr === src ? null : src))}
                            title={sourceFilter === src ? 'Počisti filter' : `Prikaži samo: ${src}`}
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hex }} aria-hidden />
                            <span className="truncate text-[10px] text-gray-600 dark:text-gray-400">{src}</span>
                          </button>

                          <span
                            className="text-right sm:text-left text-[10px] text-gray-500 dark:text-gray-400 tabular-nums"
                            title={fmtClock((n as any).publishedAt ?? Date.now())}
                          >
                            {relativeTime((n as any).publishedAt ?? Date.now())}
                          </span>

                          <div className="relative">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="peer block text-[13px] leading-tight text-gray-900 dark:text-gray-100 hover:underline truncate"
                            >
                              {search.trim() ? highlight((n as any).title, search) : (n as any).title}
                            </a>
                            {summary && (
                              <div
                                className="pointer-events-none absolute left-0 top-full mt-1 z-50 max-w-[60ch]
                                           rounded-md bg-gray-900 text-white text-[12px] leading-snug
                                           px-2.5 py-2 shadow-lg ring-1 ring-black/20
                                           opacity-0 invisible translate-y-1 transition
                                           peer-hover:opacity-100 peer-hover:visible peer-hover:translate-y-0
                                           peer-focus-visible:opacity-100 peer-focus-visible:visible peer-focus-visible:translate-y-0"
                                role="tooltip"
                              >
                                {search.trim() ? highlight(summary, search) : summary}
                              </div>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="my-6 h-px bg-gray-200/70 dark:bg-gray-700/50 rounded-full" />
        </section>
      </main>

      <Footer />
    </>
  )
}
