// pages/arhiv.tsx
'use client'

import React, {
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
  startTransition,
  useRef,
} from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeoHead from '@/components/SeoHead'
import { NewsItem } from '@/types'
import { sourceColors } from '@/lib/sources'

// ==== Types from API ====
type ApiItem = {
  id: string
  link: string
  title: string
  source: string
  published_at?: string | null   // ISO timestamptz
  publishedat?: number | null    // bigint (ms)
  summary?: string | null
  contentsnippet?: string | null
  description?: string | null
  content?: string | null
}
type ApiOk = {
  items: ApiItem[]
  counts: Record<string, number>
  total: number
  nextCursor: string | null      // ISO published_at
  fallbackLive?: boolean
}
type ApiPayload = ApiOk | { error: string }

// ==== helpers ====
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
  try {
    return new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms))
  } catch { return '' }
}
const norm = (s: string) => {
  try { return s.toLowerCase().normalize('NFD').replace(/\u0300-\u036f/g, '') } catch { return s.toLowerCase() }
}

// Highlight
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

// Resolve ms prioritizing published_at
function tsOf(a: ApiItem) {
  const t1 = a.published_at ? Date.parse(a.published_at) : NaN
  if (Number.isFinite(t1)) return t1
  const t2 = a.publishedat != null ? Number(a.publishedat) : NaN
  return Number.isFinite(t2) ? t2 : 0
}
function toNewsItem(a: ApiItem): NewsItem {
  return { title: a.title, link: a.link, source: a.source, publishedAt: tsOf(a) || Date.now() } as any
}

/* =============================================================================
   Minimalen, sodoben DatePicker (popover) z gumbom "Danes" znotraj koledarja
   – brez zunanjih knjižnic, podpora tipkovnici, SR oznake
============================================================================= */
function DatePicker({
  value,
  onChange,
  max,
}: {
  value: string
  onChange: (v: string) => void
  max?: string
}) {
  const [open, setOpen] = useState(false)
  const parsed = useMemo(() => new Date(value + 'T00:00:00'), [value])
  const [view, setView] = useState<{ y: number; m: number }>(() => ({ y: parsed.getFullYear(), m: parsed.getMonth() }))

  const btnRef = useRef<HTMLButtonElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)

  // close on click outside / esc
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!open) return
      if (popRef.current && !popRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  const weeks = useMemo(() => {
    const first = new Date(view.y, view.m, 1)
    const last = new Date(view.y, view.m + 1, 0)
    const startWeekday = (first.getDay() + 6) % 7 // ISO start Monday
    const daysInMonth = last.getDate()
    const cells: Array<{ d: number; inMonth: boolean; date: Date }> = []
    // leading
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(view.y, view.m, -i)
      cells.unshift({ d: d.getDate(), inMonth: false, date: d })
    }
    // month days
    for (let d = 1; d <= daysInMonth; d++) cells.push({ d, inMonth: true, date: new Date(view.y, view.m, d) })
    // trailing to full weeks
    while (cells.length % 7 !== 0) {
      const nextIndex = cells.length - startWeekday + 1
      const d = new Date(view.y, view.m, nextIndex)
      cells.push({ d: d.getDate(), inMonth: false, date: d })
    }
    // chunk 7
    const rows: typeof cells[] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [view])

  const weekdays = ['Po', 'To', 'Sr', 'Če', 'Pe', 'So', 'Ne']

  const todayStr = yyyymmdd(new Date())
  const maxStr = max || todayStr

  const isDisabled = (d: Date) => yyyymmdd(d) > maxStr

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur text-xs"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {value}
      </button>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Izberi datum"
          className="absolute z-50 mt-2 w-72 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white dark:bg-gray-900 shadow-xl p-3"
        >
          {/* header */}
          <div className="flex items-center justify-between mb-2">
            <button
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => setView((v) => ({ y: v.y, m: v.m - 1 }))}
              aria-label="Prejšnji mesec"
            >
              ‹
            </button>
            <div className="text-sm font-medium">
              {new Intl.DateTimeFormat('sl-SI', { month: 'long', year: 'numeric' }).format(new Date(view.y, view.m, 1))}
            </div>
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => { const t = new Date(); setView({ y: t.getFullYear(), m: t.getMonth() }); onChange(yyyymmdd(t)); setOpen(false) }}
              >
                Danes
              </button>
              <button
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => setView((v) => ({ y: v.y, m: v.m + 1 }))}
                aria-label="Naslednji mesec"
              >
                ›
              </button>
            </div>
          </div>

          {/* grid */}
          <div className="grid grid-cols-7 text-[11px] text-gray-500 dark:text-gray-400 mb-1">
            {weekdays.map((w) => <div key={w} className="text-center py-1">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((cell, idx) => {
              const dStr = yyyymmdd(cell.date)
              const selected = dStr === value
              const disabled = isDisabled(cell.date)
              return (
                <button
                  key={idx}
                  disabled={disabled}
                  onClick={() => { if (!disabled) { onChange(dStr); setOpen(false) } }}
                  className={[
                    'h-8 rounded-md text-sm',
                    cell.inMonth ? '' : 'text-gray-400 dark:text-gray-500',
                    selected ? 'bg-brand text-white' : 'hover:bg-black/5 dark:hover:bg-white/10',
                    disabled ? 'opacity-40 cursor-not-allowed' : ''
                  ].join(' ')}
                  aria-current={selected ? 'date' : undefined}
                >
                  {cell.d}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ==== Component ====
export default function ArchivePage() {
  const [date, setDate] = useState(() => yyyymmdd(new Date()))
  const [items, setItems] = useState<ApiItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)

  // tick for "posodobljeno"
  const [, setNowTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setNowTick(x => x + 1), 30_000); return () => clearInterval(t) }, [])

  // sorting
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

  // initial + date change
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

  // derived
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

  const goToday = () => {
    const today = yyyymmdd(new Date())
    startTransition(() => { setSourceFilter(null); setSearch(''); setItems([]); setDate(today) })
  }

  return (
    <>
      <Header />
      <SeoHead title="Križišče — Arhiv" description="Pregled novic po dnevih in medijih." />

      {/* Sticky-footer layout */}
      <main className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pb-8 pt-6">
        <section className="max-w-6xl mx-auto flex flex-col gap-5 min-h-[calc(100svh-var(--hdr-h))]">
          {/* Top controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs border border-gray-300/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/60 hover:bg-white/90 dark:hover:bg-gray-800/80 transition" title="Nazaj na naslovnico" aria-label="Nazaj na naslovnico">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M5 10v10h5v-6h4v6h5V10" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                Nazaj
              </Link>

              {/* NOV: sodoben DatePicker (z gumbom Danes v popoverju) */}
              <DatePicker
                value={date}
                onChange={(val) => startTransition(() => { setSourceFilter(null); setSearch(''); setItems([]); setDate(val) })}
                max={yyyymmdd(new Date())}
              />

              {/* fallback “Danes” tipka tudi zunaj (hitro dejanje na mobilnih) */}
              <button
                onClick={goToday}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border border-gray-300/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/60 hover:bg-white/90 dark:hover:bg-gray-800/80 transition"
                title="Skoči na današnji dan"
              >
                Danes
              </button>

              {/* Osveži */}
              <button
                onClick={() => fetchAll(date)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border border-gray-300/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/60 hover:bg-white/90 dark:hover:bg-gray-800/80 transition"
                title="Osveži dan"
                aria-label="Osveži dan"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 4v6h6M20 20v-6h-6" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M20 8a8 8 0 0 0-14-4M4 16a8 8 0 0 0 14 4" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                Osveži
              </button>

              {lastUpdatedMs && <span className="ml-2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Posodobljeno {relativeTime(lastUpdatedMs)}</span>}
            </div>

            {/* search */}
            <div className="relative w-full sm:w-96">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" />
              </svg>
              <input
                type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Išči po naslovu ali podnaslovu…"
                className="w-full pl-8 pr-3 py-2 rounded-md text-sm bg-white/80 dark:bg-gray-800/70 border border-gray-300/70 dark:border-gray-700/70 focus:outline-none focus:ring-2 focus:ring-brand/50"
              />
            </div>
          </div>

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
                <button onClick={() => setSourceFilter(null)}
                        className="text-xs text-gray-600 dark:text-gray-400 underline decoration-dotted hover:text-gray-800 dark:hover:text-gray-200">
                  počisti filter
                </button>
              </div>
            )}
          </div>

          {/* Seznam = flex-1, h-full scroll */}
          <div className="flex-1 flex flex-col">
            <h3 className="mt-1 mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">Zadnje novice</h3>
            <div className="rounded-md border border-gray-200/70 dark:border-gray-800/70 bg-white/50 dark:bg-gray-900/40 flex-1 min-h-[260px]">
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
                          <button className="inline-flex items-center gap-1 min-w-0"
                                  onClick={() => setSourceFilter(curr => (curr === src ? null : src))}
                                  title={sourceFilter === src ? 'Počisti filter' : `Prikaži samo: ${src}`}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hex }} aria-hidden />
                            <span className="truncate text-[10px] text-gray-600 dark:text-gray-400">{src}</span>
                          </button>

                          <span className="text-right sm:text-left text-[10px] text-gray-500 dark:text-gray-400 tabular-nums"
                                title={fmtClock((n as any).publishedAt ?? Date.now())}>
                            {relativeTime((n as any).publishedAt ?? Date.now())}
                          </span>

                          <div className="relative">
                            <a href={link} target="_blank" rel="noopener noreferrer"
                              className="peer block text-[13px] leading-tight text-gray-900 dark:text-gray-100 hover:underline truncate">
                              {search.trim() ? highlight((n as any).title, search) : (n as any).title}
                            </a>
                            {summary && (
                              <div className="pointer-events-none absolute left-0 top-full mt-1 z-50 max-w-[60ch] rounded-md bg-gray-900 text-white text-[12px] leading-snug px-2.5 py-2 shadow-lg ring-1 ring-black/20 opacity-0 invisible translate-y-1 transition peer-hover:opacity-100 peer-hover:visible peer-hover:translate-y-0 peer-focus-visible:opacity-100 peer-focus-visible:visible peer-focus-visible:translate-y-0" role="tooltip">
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

          {/* Subtilen separator z varnim razmakom */}
          <div className="my-6 h-px bg-gray-200/70 dark:bg-gray-700/50 rounded-full" />
        </section>
      </main>

      <Footer />
    </>
  )
}
