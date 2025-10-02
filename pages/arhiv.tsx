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
type ApiPayload =
  | { items: ApiItem[]; counts: Record<string, number>; total: number; nextCursor: string | null; fallbackLive?: boolean }
  | { error: string }

// helpers
function tsOf(a: ApiItem) {
  const t = (a.publishedat && Number(a.publishedat)) || (a.published_at ? Date.parse(a.published_at) : NaN)
  return Number.isFinite(t) ? Number(t) : 0
}
function toNewsItem(a: ApiItem): NewsItem {
  const ts = tsOf(a)
  return { title: a.title, link: a.link, source: a.source, publishedAt: ts || Date.now() } as unknown as NewsItem
}
function yyyymmdd(d: Date) {
  const y = d.getFullYear(), m = `${d.getMonth() + 1}`.padStart(2, '0'), dd = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${dd}`
}
function relativeTime(ms: number) {
  const diff = Math.max(0, Date.now() - ms), m = Math.floor(diff / 60000)
  if (m < 1) return 'pred <1 min'
  if (m < 60) return `pred ${m} min`
  const h = Math.floor(m / 60); if (h < 24) return `pred ${h} h`
  const d = Math.floor(h / 24); return `pred ${d} d`
}
function fmtClock(ms: number) {
  try { return new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms)) } catch { return '' }
}
function norm(s: string) {
  try { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') } catch { return s.toLowerCase() }
}

// session cache
const CACHE_KEY = (date: string) => `krizisce:archive:${date}`
const CACHE_TTL_MS = 10 * 60 * 1000
type CacheShape = { at: number; items: ApiItem[]; counts: Record<string, number>; fallbackLive: boolean }
function readCache(date: string): CacheShape | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY(date)); if (!raw) return null
    const parsed = JSON.parse(raw) as CacheShape
    if (!parsed?.at || Date.now() - parsed.at > CACHE_TTL_MS) return null
    if (!Array.isArray(parsed.items)) return null
    return parsed
  } catch { return null }
}
function writeCache(date: string, data: CacheShape) {
  try { sessionStorage.setItem(CACHE_KEY(date), JSON.stringify(data)) } catch {}
}

// page
export default function ArchivePage() {
  const [date, setDate] = useState<string>(() => yyyymmdd(new Date()))
  const [search, setSearch] = useState<string>('')

  const [items, setItems] = useState<ApiItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fallbackLive, setFallbackLive] = useState(false)

  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadedAll, setLoadedAll] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const [showAll, setShowAll] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  const news = useMemo(() => items.map(toNewsItem), [items])
  const displayCounts = useMemo(() => Object.fromEntries(Object.entries(counts).filter(([k]) => k !== 'TestVir')), [counts])
  const total = useMemo(() => Object.values(displayCounts).reduce((a, b) => a + b, 0), [displayCounts])
  const maxCount = useMemo(() => Math.max(1, ...Object.values(displayCounts)), [displayCounts])

  const itemByLink = useMemo(() => {
    const m = new Map<string, ApiItem>(); for (const it of items) m.set(it.link, it); return m
  }, [items])

  const deferredSearch = useDeferredValue(search)
  const filteredNews = useMemo(() => {
    const q = norm(deferredSearch.trim()); if (!q) return news
    return news.filter(n => {
      const link = (n as any).link as string
      const it = itemByLink.get(link)
      const title = (n as any).title ?? '', src = (n as any).source ?? ''
      const summary = (it?.summary ?? it?.contentsnippet ?? (it as any)?.description ?? (it as any)?.content ?? '') || ''
      return norm(`${title} ${summary} ${src}`).includes(q)
    })
  }, [news, deferredSearch, itemByLink])

  const visibleNews = useMemo(() => (showAll ? filteredNews : filteredNews.slice(0, 15)), [filteredNews, showAll])

  function sortDesc(a: ApiItem, b: ApiItem) { return tsOf(b) - tsOf(a) || String(b.id).localeCompare(String(a.id)) }

  async function fetchFirstPage(d: string, useCache = true) {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController(); abortRef.current = controller

    setErrorMsg(null); setShowAll(false); setLoadedAll(false); setNextCursor(null)

    let servedFromCache = false
    if (useCache) {
      const cached = readCache(d)
      if (cached) {
        setItems([...cached.items].sort(sortDesc))
        setCounts(cached.counts); setFallbackLive(cached.fallbackLive)
        servedFromCache = true
      }
    }

    setLoading(!servedFromCache)
    try {
      const LIMIT_FIRST = 40
      const url = `/api/archive?date=${encodeURIComponent(d)}&limit=${LIMIT_FIRST}`
      const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
      const data: ApiPayload = await res.json().catch(() => ({ error: 'Neveljaven odgovor strežnika.' }))

      if (controller.signal.aborted) return
      if (!res.ok || 'error' in data) {
        if (!servedFromCache) { setItems([]); setCounts({}); setFallbackLive(false) }
        setErrorMsg('Arhiva trenutno ni mogoče naložiti.'); setLoading(false); return
      }

      const sorted = [...(data.items ?? [])].sort(sortDesc)
      setItems(sorted); setCounts(data.counts ?? {}); setNextCursor(data.nextCursor ?? null); setFallbackLive(Boolean((data as any).fallbackLive))
      setLoading(false)
      writeCache(d, { at: Date.now(), items: sorted, counts: data.counts ?? {}, fallbackLive: Boolean((data as any).fallbackLive) })
    } catch {
      if (!servedFromCache) { setItems([]); setCounts({}); setFallbackLive(false) }
      if (!controller.signal.aborted) setErrorMsg('Napaka pri povezavi do arhiva.')
      setLoading(false)
    }
  }

  async function loadRestOfDay() {
    if (loadedAll || !nextCursor || loadingMore) { setShowAll(true); return }
    setLoadingMore(true); setErrorMsg(null)
    try {
      let cursor: string | null = nextCursor
      const LIMIT = 250
      const seen = new Set(items.map(i => i.link))
      let acc = [...items]

      while (cursor) {
        const url = `/api/archive?date=${encodeURIComponent(date)}&cursor=${encodeURIComponent(cursor)}&limit=${LIMIT}`
        const res = await fetch(url, { cache: 'no-store' })
        const data: ApiPayload = await res.json().catch(() => ({ error: 'Neveljaven odgovor strežnika.' }))
        if (!res.ok || 'error' in data) break

        const fresh = (data.items ?? []).filter(i => !seen.has(i.link))
        for (const f of fresh) seen.add(f.link)
        if (fresh.length) acc = [...acc, ...fresh]
        cursor = data.nextCursor ?? null
      }

      acc.sort(sortDesc)
      setItems(acc); setNextCursor(null); setLoadedAll(true); setShowAll(true)
    } catch {
      setErrorMsg('Nalaganje vseh novic ni uspelo.')
    } finally {
      setLoadingMore(false)
    }
  }

  function refreshNow() { fetchFirstPage(date, false) }

  useEffect(() => {
    fetchFirstPage(date, true)
    return () => { if (abortRef.current) abortRef.current.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  return (
    <>
      <Header />
      <SeoHead title="Križišče — Arhiv" description="Pregled novic po dnevih in medijih." />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pb-20 pt-6">
        <section className="max-w-6xl mx-auto">
          {/* orodna vrstica */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs
                           border border-gray-300/60 dark:border-gray-700/60
                           bg-white/70 dark:bg-gray-800/60 hover:bg-white/90 dark:hover:bg-gray-800/80 transition"
                title="Nazaj na naslovnico"
                aria-label="Nazaj na naslovnico"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M5 10v10h5v-6h4v6h5V10" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                Nazaj
              </Link>

              <label htmlFor="date" className="sr-only">Izberi dan</label>
              <input
                id="date"
                type="date"
                value={date}
                max={yyyymmdd(new Date())}
                onChange={(e) => startTransition(() => setDate(e.target.value))}
                className="px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur text-xs"
              />

              {/* OSVEŽI */}
              <button
                onClick={refreshNow}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border
                           border-gray-300/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/60
                           hover:bg-white/90 dark:hover:bg-gray-800/80 transition"
                title="Osveži dan"
                aria-label="Osveži dan"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M4 4v6h6M20 20v-6h-6" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M20 8a8 8 0 0 0-14-4M4 16a8 8 0 0 0 14 4" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
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
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Išči po naslovu, viru ali podnaslovu…"
                className="w-full pl-8 pr-3 py-2 rounded-md text-sm bg-white/80 dark:bg-gray-800/70
                           border border-gray-300/70 dark:border-gray-700/70 focus:outline-none
                           focus:ring-2 focus:ring-brand/50"
              />
            </div>
          </div>

          {/* GRAF */}
          <div className="mt-5 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-900/70 backdrop-blur p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Objave po medijih</h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">Skupaj: {total}</span>
            </div>

            <div className="mt-3 space-y-2">
              {Object.entries(displayCounts).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
                <div key={source} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 text-sm text-gray-700 dark:text-gray-300">{source}</div>
                  <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full bg-brand dark:bg-brand" style={{ width: `${(count / maxCount) * 100}%` }} aria-hidden />
                  </div>
                  <div className="w-12 text-right text-sm tabular-nums">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* NASLOV IZVEN ŠKATLE */}
          <h3 className="mt-5 mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">Zadnje novice</h3>

          {/* SEZNAM – nižje okno; notranji scroll; “leteči” sticky gumb; brez nativnega title na <a> */}
          <div className="rounded-md border border-gray-200/70 dark:border-gray-800/70 bg-white/50 dark:bg-gray-900/40">
            {/* scroll območje – malo dodatnega spodnjega paddiga, da gumb ne pokrije zadnjih vrstic */}
            <div className="relative h-[44vh] overflow-y-auto pb-12">
              {loading ? (
                <p className="p-3 text-sm text-gray-500 dark:text-gray-400">Nalagam…</p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                  {visibleNews.map((n, i) => {
                    const src = (n as any).source
                    const hex = sourceColors[src] || '#7c7c7c'
                    const link = (n as any).link as string
                    const it = itemByLink.get(link)
                    const summary = (it?.summary ?? it?.contentsnippet ?? (it as any)?.description ?? (it as any)?.content ?? '').trim()
                    return (
                      <li
                        key={`${link}-${i}`}
                        className="grid grid-cols-[92px_78px_1fr] sm:grid-cols-[100px_84px_1fr] gap-x-3 sm:gap-x-4 px-2 sm:px-3 py-1.5"
                      >
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hex }} aria-hidden />
                          <span className="truncate text-[10px] text-gray-600 dark:text-gray-400">{src}</span>
                        </span>
                        <span
                          className="text-right sm:text-left text-[10px] text-gray-500 dark:text-gray-400 tabular-nums"
                          title={fmtClock((n as any).publishedAt ?? Date.now())}
                        >
                          {relativeTime((n as any).publishedAt ?? Date.now())}
                        </span>

                        {/* naslov + naš tooltip (brez native title) */}
                        <div className="relative">
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="peer block text-[13px] leading-tight text-gray-900 dark:text-gray-100 hover:underline truncate"
                          >
                            {(n as any).title}
                          </a>

                          {summary && (
                            <div
                              className="
                                pointer-events-none absolute left-0 top-full mt-1 z-50 max-w-[60ch]
                                rounded-md bg-gray-900 text-white text-[12px] leading-snug
                                px-2.5 py-2 shadow-lg ring-1 ring-black/20
                                opacity-0 invisible translate-y-1 transition
                                peer-hover:opacity-100 peer-hover:visible peer-hover:translate-y-0
                                peer-focus-visible:opacity-100 peer-focus-visible:visible peer-focus-visible:translate-y-0
                              "
                              role="tooltip"
                            >
                              {summary}
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* STICKY “leteči” gumb znotraj scrolla (brez full-width bar-a) */}
              <div className="sticky bottom-2 w-full flex justify-center pointer-events-none">
                {!showAll && filteredNews.length > 15 ? (
                  <button
                    onClick={async () => { await loadRestOfDay() }}
                    disabled={loadingMore}
                    className="pointer-events-auto px-4 py-1.5 rounded-full bg-brand text-white text-sm shadow-md hover:bg-brand-hover disabled:opacity-60"
                  >
                    {loadingMore ? 'Nalagam vse…' : 'Naloži vse novice'}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAll(false)}
                    className="pointer-events-auto px-4 py-1.5 rounded-full text-sm border border-gray-300/70 dark:border-gray-700/70
                               bg-white/80 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-800"
                  >
                    Pokaži le prvih 15
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
