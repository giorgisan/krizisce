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

/** -------------------- API types (usklajeno s shemo) ----------------- */
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
  | {
      items: ApiItem[]
      counts: Record<string, number>
      total: number
      nextCursor: string | null
      fallbackLive?: boolean
    }
  | { error: string }

/** ------------------------------- Helpers ---------------------------------- */
function toNewsItem(a: ApiItem): NewsItem {
  const ts =
    (a.publishedat && Number(a.publishedat)) ||
    (a.published_at ? Date.parse(a.published_at) : NaN)

  return {
    title: a.title,
    link: a.link,
    source: a.source,
    publishedAt: Number.isFinite(ts) ? Number(ts) : Date.now(),
  } as unknown as NewsItem
}

function yyyymmdd(d: Date) {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const dd = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// relativni čas
function relativeTime(ms: number) {
  const diff = Math.max(0, Date.now() - ms)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'pred <1 min'
  if (m < 60) return `pred ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `pred ${h} h`
  const d = Math.floor(h / 24)
  return `pred ${d} d`
}

// HH:mm v title (hover)
function fmtClock(ms: number) {
  try {
    return new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms))
  } catch { return '' }
}

// varno odstrani diakritiko
function norm(s: string) {
  try {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  } catch {
    return s.toLowerCase()
  }
}

/** ----------------------- Client cache (sessionStorage) --------------------- */
const CACHE_KEY = (date: string) => `krizisce:archive:${date}`
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 min

type CacheShape = {
  at: number
  items: ApiItem[]
  counts: Record<string, number>
  fallbackLive: boolean
}

function readCache(date: string): CacheShape | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY(date))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheShape
    if (!parsed?.at || Date.now() - parsed.at > CACHE_TTL_MS) return null
    if (!Array.isArray(parsed.items)) return null
    return parsed
  } catch { return null }
}

function writeCache(date: string, data: CacheShape) {
  try {
    sessionStorage.setItem(CACHE_KEY(date), JSON.stringify(data))
  } catch { /* ignore quota */ }
}

/** --------------------------------- Page ----------------------------------- */
export default function ArchivePage() {
  const [date, setDate] = useState<string>(() => yyyymmdd(new Date()))
  const [search, setSearch] = useState<string>('')

  const [items, setItems] = useState<ApiItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fallbackLive, setFallbackLive] = useState(false)
  const [pagesFetched, setPagesFetched] = useState(0)
  const [isStaleRefresh, setIsStaleRefresh] = useState(false)

  // abort za aktivne fetch-e
  const abortRef = useRef<AbortController | null>(null)

  const news = useMemo(() => items.map(toNewsItem), [items])

  // graf brez "TestVir"
  const displayCounts = useMemo(() => {
    const entries = Object.entries(counts).filter(([k]) => k !== 'TestVir')
    return Object.fromEntries(entries)
  }, [counts])

  const total = useMemo(
    () => Object.values(displayCounts).reduce((a, b) => a + b, 0),
    [displayCounts]
  )
  const maxCount = useMemo(() => Math.max(1, ...Object.values(displayCounts)), [displayCounts])

  /** --------- Lookup za PODNASLOV: summary || contentsnippet ... ------ */
  const summaryByLink = useMemo(() => {
    const m = new Map<string, string>()
    for (const it of items) {
      const s =
        it.summary ??
        it.contentsnippet ??
        (it as any).description ??
        (it as any).content ??
        ''
      if (s) m.set(it.link, String(s))
    }
    return m
  }, [items])

  // map za direkten dostop do itemov (za prikaz summary)
  const itemByLink = useMemo(() => {
    const m = new Map<string, ApiItem>()
    for (const it of items) m.set(it.link, it)
    return m
  }, [items])

  // debounced search
  const deferredSearch = useDeferredValue(search)
  const filteredNews = useMemo(() => {
    const q = norm(deferredSearch.trim())
    if (!q) return news
    return news.filter((n) => {
      const link = (n as any).link as string
      const title = (n as any).title ?? ''
      const src = (n as any).source ?? ''
      const i = itemByLink.get(link)
      const summary = i?.summary ?? summaryByLink.get(link) ?? ''
      const hay = `${title} ${summary} ${src}`
      return norm(hay).includes(q)
    })
  }, [news, deferredSearch, summaryByLink, itemByLink])

  /** ----------------------- Progressive autopager ------------------------ */
  async function fetchAllForDayProgressive(d: string, useCache = true) {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setErrorMsg(null)
    setPagesFetched(0)
    setIsStaleRefresh(false)

    // 1) instant paint iz cache-a
    let servedFromCache = false
    if (useCache) {
      const cached = readCache(d)
      if (cached) {
        setItems(cached.items)
        setCounts(cached.counts)
        setFallbackLive(cached.fallbackLive)
        servedFromCache = true
        setIsStaleRefresh(true)
      }
    }

    // 2) sveža prva stran
    setLoading(!servedFromCache)
    try {
      const LIMIT_FIRST = 150
      const firstUrl = `/api/archive?date=${encodeURIComponent(d)}&limit=${LIMIT_FIRST}`
      const firstRes = await fetch(firstUrl, { cache: 'no-store', signal: controller.signal })
      const firstData: ApiPayload = await firstRes.json().catch(() => ({ error: 'Neveljaven odgovor strežnika.' }))

      if (controller.signal.aborted) return

      if (!firstRes.ok || 'error' in firstData) {
        if (!servedFromCache) {
          setItems([]); setCounts({}); setFallbackLive(false)
        }
        setErrorMsg('Arhiva trenutno ni mogoče naložiti.')
        setLoading(false)
        setIsStaleRefresh(false)
        return
      }

      const seen = new Set<string>()
      const acc: ApiItem[] = []
      const firstChunk = (firstData.items ?? []).filter(i => {
        if (seen.has(i.link)) return false
        seen.add(i.link); return true
      })
      acc.push(...firstChunk)

      setItems(acc)
      setCounts(firstData.counts ?? {})
      setFallbackLive(Boolean((firstData as any).fallbackLive))
      setPagesFetched(1)
      setLoading(false)

      writeCache(d, { at: Date.now(), items: acc, counts: firstData.counts ?? {}, fallbackLive: Boolean((firstData as any).fallbackLive) })

      // 3) preostanek v ozadju
      let cursor = firstData.nextCursor ?? null
      const LIMIT = 250
      const MAX_PAGES = 20

      for (let i = 0; i < MAX_PAGES && cursor; i++) {
        await new Promise(r => setTimeout(r, 10))
        if (controller.signal.aborted) return

        const url = `/api/archive?date=${encodeURIComponent(d)}&cursor=${encodeURIComponent(cursor)}&limit=${LIMIT}`
        const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
        const data: ApiPayload = await res.json().catch(() => ({ error: 'Neveljaven odgovor strežnika.' }))

        if (controller.signal.aborted) return

        if (!res.ok || 'error' in data) {
          setErrorMsg('Prikazan je delni arhiv (napaka pri nalaganju vseh strani).')
          break
        }

        const chunk = (data.items ?? []).filter(i => {
          if (seen.has(i.link)) return false
          seen.add(i.link); return true
        })
        if (chunk.length) {
          setItems(prev => {
            const next = [...prev, ...chunk]
            writeCache(d, { at: Date.now(), items: next, counts: firstData.counts ?? {}, fallbackLive: Boolean((firstData as any).fallbackLive) })
            return next
          })
        }
        setPagesFetched(p => p + 1)
        cursor = data.nextCursor ?? null
      }

      setIsStaleRefresh(false)
    } catch {
      if (!servedFromCache) {
        setItems([]); setCounts({}); setFallbackLive(false)
      }
      if (!controller.signal.aborted) setErrorMsg('Napaka pri povezavi do arhiva.')
      setLoading(false)
      setIsStaleRefresh(false)
    } finally {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    fetchAllForDayProgressive(date, true)
    return () => { if (abortRef.current) abortRef.current.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  /** --------------------------------- UI ----------------------------------- */
  return (
    <>
      <Header />
      <SeoHead title="Križišče — Arhiv" description="Pregled novic po dnevih in medijih." />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pb-20 pt-6">
        <section className="max-w-6xl mx-auto">
          {/* toolbar */}
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

          {/* info vrstice */}
          {!loading && errorMsg && (
            <p className="mt-3 text-xs text-red-400">{errorMsg}</p>
          )}
          {!loading && !errorMsg && fallbackLive && (
            <p className="mt-3 text-xs text-amber-400">
              Arhiv za izbrani dan je še prazen. Prikazane so trenutne novice iz živih virov (ne-shranjene).
            </p>
          )}
          {isStaleRefresh && (
            <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
              Osvežujem arhiv v ozadju… {pagesFetched > 0 ? `(${pagesFetched})` : null}
            </p>
          )}
          {loading && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Nalagam arhiv… {pagesFetched > 0 ? `(${pagesFetched})` : null}
            </p>
          )}

          {/* GRID POSTAVITEV: graf 1/3, seznam 2/3 (po višini viewporta) */}
          <div className="mt-5 space-y-5">
            {/* GRAF / STATISTIKA */}
            <div
              className="rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-900/70 backdrop-blur p-4"
              style={{ maxHeight: '34vh', overflow: 'auto' }}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Objave po medijih</h2>
                <span className="text-sm text-gray-600 dark:text-gray-400">Skupaj: {total}</span>
              </div>

              {total === 0 && !loading && !errorMsg && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Za izbrani dan ni podatkov.</p>
              )}

              <div className="mt-3 space-y-2">
                {Object.entries(displayCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([source, count]) => (
                    <div key={source} className="flex items-center gap-3">
                      <div className="w-32 shrink-0 text-sm text-gray-700 dark:text-gray-300">{source}</div>
                      <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-brand dark:bg-brand"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                          aria-hidden
                        />
                      </div>
                      <div className="w-12 text-right text-sm tabular-nums">{count}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* SEZNAM – 2/3 višine; summary se pokaže na hover */}
            <div className="rounded-md border border-gray-200/70 dark:border-gray-800/70 bg-white/50 dark:bg-gray-900/40">
              <div className="max-h-[66vh] overflow-y-auto">
                <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredNews.map((n, i) => {
                    const src = (n as any).source
                    const hex = sourceColors[src] || '#7c7c7c'
                    const link = (n as any).link as string
                    const orig = itemByLink.get(link)
                    const summary = (orig?.summary ?? summaryByLink.get(link) ?? '').trim()
                    return (
                      <li
                        key={`${link}-${i}`}
                        className="
                          group grid items-center
                          grid-cols-[92px_78px_1fr] sm:grid-cols-[100px_84px_1fr]
                          gap-x-3 sm:gap-x-4 px-2 sm:px-3 py-1.5
                          transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-800/40
                        "
                      >
                        {/* vir */}
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hex }} aria-hidden />
                          <span className="truncate text-[10px] text-gray-600 dark:text-gray-400">{src}</span>
                        </span>

                        {/* čas */}
                        <span
                          className="text-right sm:text-left text-[10px] text-gray-500 dark:text-gray-400 tabular-nums"
                          title={fmtClock((n as any).publishedAt ?? Date.now())}
                        >
                          {relativeTime((n as any).publishedAt ?? Date.now())}
                        </span>

                        {/* naslov + summary (summary se razkrije na hover, brez skakanja seznama) */}
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-[13px] leading-tight text-gray-900 dark:text-gray-100 hover:underline truncate"
                          title={(n as any).title}
                        >
                          {(n as any).title}
                          {/* summary preview */}
                          {summary && (
                            <span
                              className="
                                block text-[12px] leading-snug text-gray-600 dark:text-gray-400
                                opacity-0 max-h-0 overflow-hidden
                                group-hover:opacity-100 group-hover:max-h-12
                                transition-all duration-200 ease-out mt-0.5
                                line-clamp-2
                              "
                              // dodatni title za primer mobile/keyboard
                              title={summary}
                            >
                              {summary}
                            </span>
                          )}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* OPOMBA: ločnica pred footerjem je NAMERNO odstranjena */}
        </section>
      </main>

      <Footer />
    </>
  )
}
