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
import { sourceColors } from '@/lib/sources'

type ApiItem = {
  id: string
  source: string
  title: string
  link: string
  summary?: string | null
  published_at: string // ISO
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

function yyyymmdd(d: Date) {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const dd = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${dd}`
}

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
function fmtClock(ms: number) {
  try {
    return new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms))
  } catch { return '' }
}

/* ---------------- client cache (sessionStorage) ---------------- */
const CACHE_KEY = (date: string) => `krizisce:archive:${date}`
const CACHE_TTL_MS = 10 * 60 * 1000

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
  try { sessionStorage.setItem(CACHE_KEY(date), JSON.stringify(data)) } catch {}
}

/* --------------------------------- Page ----------------------------------- */
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

  const abortRef = useRef<AbortController | null>(null)

  // precompute timestamps; delamo direkt z `items` (da summary zanesljivo sodeluje v iskanju)
  const enriched = useMemo(() => {
    return items.map(it => ({
      ...it,
      publishedAt: new Date(it.published_at).getTime(),
      _hay: `${it.title} ${it.summary ?? ''} ${it.source}`.toLowerCase(),
    }))
  }, [items])

  // graf brez TestVir
  const displayCounts = useMemo(() => {
    const entries = Object.entries(counts).filter(([k]) => k !== 'TestVir')
    return Object.fromEntries(entries)
  }, [counts])
  const total = useMemo(
    () => Object.values(displayCounts).reduce((a, b) => a + b, 0),
    [displayCounts]
  )
  const maxCount = useMemo(() => Math.max(1, ...Object.values(displayCounts)), [displayCounts])

  const deferredSearch = useDeferredValue(search)
  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    if (!q) return enriched
    // išče po naslovu, VIRU in **SUMMARY**
    return enriched.filter(e => e._hay.includes(q))
  }, [enriched, deferredSearch])

  /* -------------- Progressive load: prva stran hitro, ostalo v ozadju -------------- */
  async function fetchAllForDay(d: string, useCache = true) {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setErrorMsg(null)
    setPagesFetched(0)
    setIsStaleRefresh(false)

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

    setLoading(!servedFromCache)
    try {
      const LIMIT_FIRST = 150
      const firstUrl = `/api/archive?date=${encodeURIComponent(d)}&limit=${LIMIT_FIRST}`
      const firstRes = await fetch(firstUrl, { cache: 'no-store', signal: controller.signal })
      const firstData: ApiPayload = await firstRes.json().catch(() => ({ error: 'Neveljaven odgovor strežnika.' }))

      if (controller.signal.aborted) return
      if (!firstRes.ok || 'error' in firstData) {
        if (!servedFromCache) { setItems([]); setCounts({}); setFallbackLive(false) }
        setErrorMsg('Arhiva trenutno ni mogoče naložiti.')
        setLoading(false); setIsStaleRefresh(false)
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

      // Nadaljuj v ozadju
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
      if (!servedFromCache) { setItems([]); setCounts({}); setFallbackLive(false) }
      if (!controller.signal.aborted) setErrorMsg('Napaka pri povezavi do arhiva.')
      setLoading(false); setIsStaleRefresh(false)
    } finally {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    fetchAllForDay(date, true)
    return () => { if (abortRef.current) abortRef.current.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  return (
    <>
      <Header />
      <SeoHead title="Križišče — Arhiv" description="Pregled novic po dnevih in medijih." />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pb-24 pt-6">
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
            <div className="relative w-full sm:w-80">
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

          {/* info */}
          {!loading && errorMsg && <p className="mt-3 text-xs text-red-400">{errorMsg}</p>}
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

          {/* STATISTIKA */}
          <div className="mt-5 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-900/70 backdrop-blur p-4">
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
                      <div className="h-full bg-brand dark:bg-brand" style={{ width: `${(count / maxCount) * 100}%` }} aria-hidden />
                    </div>
                    <div className="w-12 text-right text-sm tabular-nums">{count}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* SEZNAM – ultra kompakten, še manjši razmiki, manjše okno */}
          <div className="mt-5">
            {enriched.length === 0 && !loading && !errorMsg ? (
              <p className="text-gray-500 dark:text-gray-400">Ni novic za ta dan.</p>
            ) : null}

            {enriched.length > 0 && (
              <div className="rounded-md border border-gray-200/70 dark:border-gray-800/70 bg-white/50 dark:bg-gray-900/40">
                <div className="max-h-[52vh] overflow-y-auto">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filtered.map((n, i) => {
                      const hex = sourceColors[n.source] || '#7c7c7c'
                      const ts = n.publishedAt ?? new Date(n.published_at).getTime()
                      return (
                        <li key={`${n.link}-${i}`} className="px-2 sm:px-3 py-1.5 flex items-center gap-2">
                          <span className="shrink-0 inline-flex items-center gap-1 min-w-[60px]">
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hex }} aria-hidden />
                            <span className="text-[10px] text-gray-600 dark:text-gray-400">{n.source}</span>
                          </span>
                          <span
                            className="shrink-0 w-16 text-[10px] text-gray-500 dark:text-gray-400 tabular-nums"
                            title={fmtClock(ts)}
                          >
                            {relativeTime(ts)}
                          </span>
                          <a
                            href={n.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-[13px] leading-tight text-gray-900 dark:text-gray-100 hover:underline truncate"
                            title={n.title}
                          >
                            {n.title}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
