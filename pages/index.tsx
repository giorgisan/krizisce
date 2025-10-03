// pages/index.tsx
'use client'

import React, {
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
  startTransition,
  useRef,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { SOURCES } from '@/lib/sources'
import ArticleCard from '@/components/ArticleCard'
import SeoHead from '@/components/SeoHead'
import BackToTop from '@/components/BackToTop'

// -------------------- Helpers & constants --------------------
const POLL_MS = 60_000
const HIDDEN_POLL_MS = 5 * 60_000
const POLL_MAX_BACKOFF = 5

function timeout(ms: number) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error('Request timeout')), ms))
}

async function loadNews(forceFresh: boolean, signal?: AbortSignal): Promise<NewsItem[] | null> {
  try {
    const res = (await Promise.race([
      fetch(`/api/news${forceFresh ? '?forceFresh=1' : ''}`, { cache: 'no-store', signal }),
      timeout(12_000),
    ])) as Response
    const fresh: NewsItem[] = await res.json()
    return Array.isArray(fresh) && fresh.length ? fresh : null
  } catch {
    return null
  }
}

// --- paged fetch za "Naloži več"
type PagePayload = { items: NewsItem[]; nextCursor: number | null }
async function fetchPage(params: { cursor?: number | null; limit?: number; source?: string | null }): Promise<PagePayload> {
  const { cursor, limit = 40, source } = params
  const qs = new URLSearchParams()
  qs.set('paged', '1')
  qs.set('limit', String(limit))
  if (cursor != null) qs.set('cursor', String(cursor))
  if (source && source !== 'Vse') qs.set('source', source)
  const res = await fetch(`/api/news?${qs.toString()}`, { cache: 'no-store' })
  if (!res.ok) return { items: [], nextCursor: null }
  const data = (await res.json()) as PagePayload
  if (!data || !Array.isArray(data.items)) return { items: [], nextCursor: null }
  return data
}

function emitFilterUpdate(sources: string[]) {
  try { sessionStorage.setItem('filters_interacted', '1') } catch {}
  try { localStorage.setItem('selectedSources', JSON.stringify(sources)) } catch {}
  try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources } })) } catch {}
}

const ric = (cb: () => void) => {
  if (typeof (window as any).requestIdleCallback === 'function') {
    ;(window as any).requestIdleCallback(cb, { timeout: 500 })
  } else setTimeout(cb, 0)
}

// === stabilni čas objave (immutable) prek localStorage ===
const LS_FIRST_SEEN = 'krizisce_first_seen_v1'
type FirstSeenMap = Record<string, number> // link -> ms epoch

function loadFirstSeen(): FirstSeenMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LS_FIRST_SEEN)
    return raw ? (JSON.parse(raw) as FirstSeenMap) : {}
  } catch { return {} }
}

function saveFirstSeen(map: FirstSeenMap) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(LS_FIRST_SEEN, JSON.stringify(map)) } catch {}
}

type Props = { initialNews: NewsItem[] }

export default function Home({ initialNews }: Props) {
  const [news, setNews] = useState<NewsItem[]>(initialNews)
  const [filter, setFilter] = useState<string>('Vse')
  const deferredFilter = useDeferredValue(filter)
  const [displayCount, setDisplayCount] = useState<number>(20)

  const [menuOpen, setMenuOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })

  // first-seen mapa za stabilni čas
  const [firstSeen, setFirstSeen] = useState<FirstSeenMap>(() => loadFirstSeen())

  // pagination indikatorji
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [cursor, setCursor] = useState<number | null>(null) // ms publishedAt za naslednji batch (starejši od cursor)

  useEffect(() => {
    const handler = () => { ric(() => computeDropdownPos()); setMenuOpen((s) => !s) }
    window.addEventListener('toggle-filters', handler as EventListener)
    return () => window.removeEventListener('toggle-filters', handler as EventListener)
  }, [])

  const computeDropdownPos = () => {
    const trigger = document.getElementById('filters-trigger')
    const header = document.getElementById('site-header')
    const triggerRect = trigger?.getBoundingClientRect()
    const headerRect = header?.getBoundingClientRect()

    const topFromTrigger = (triggerRect?.bottom ?? 56) + 8
    const topFromHeader = (headerRect?.bottom ?? 56) + 8
    const top = Math.max(topFromHeader, topFromTrigger)

    const right = Math.max(0, window.innerWidth - (triggerRect?.right ?? window.innerWidth))
    setPos({ top, right })
  }

  useEffect(() => {
    if (!menuOpen) return
    const onResize = () => ric(() => computeDropdownPos())
    const onScroll = () => ric(() => menuOpen && computeDropdownPos())
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    ric(() => computeDropdownPos())
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // ---------- Instant refresh on first visit ----------
  const [bootRefreshed, setBootRefreshed] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      const fresh = await loadNews(true, ctrl.signal)
      if (fresh && fresh.length) {
        const currentLinks = new Set(initialNews.map(n => n.link))
        const hasNewLink = fresh.some(n => n.link && !currentLinks.has(n.link))
        if (hasNewLink) {
          startTransition(() => { setNews(fresh); setDisplayCount(20) })
        } else {
          // če ni novih linkov, pa so posodobitve, bomo to odkrili v pollingu
        }
      }
      setBootRefreshed(true)
    })()
    return () => ctrl.abort()
  }, [initialNews])
  // ----------------------------------------------------

  // polling (z backoff + visibility)
  const [freshNews, setFreshNews] = useState<NewsItem[] | null>(null)
  const [hasNewBanner, setHasNewBanner] = useState(false)
  const [bannerMode, setBannerMode] = useState<'fresh' | 'updates'>('fresh') // NEW
  const missCountRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const diffFresh = (fresh: NewsItem[], current: NewsItem[]) => {
    const byLink = new Map(current.map(n => [n.link, n]))
    let newLinks = 0
    let updatedOnly = 0
    for (const f of fresh) {
      const old = byLink.get(f.link)
      if (!old) { newLinks++; continue }
      if ((old.title ?? '') !== (f.title ?? '') ||
          (old.image ?? '') !== (f.image ?? '') ||
          (old.contentSnippet ?? '') !== (f.contentSnippet ?? '')) {
        updatedOnly++
      }
    }
    return { newLinks, updatedOnly }
  }

  useEffect(() => {
    if (!bootRefreshed) return

    const runCheck = async () => {
      const ctrl = new AbortController()
      const fresh = await loadNews(true, ctrl.signal)
      if (!fresh || fresh.length === 0) {
        setHasNewBanner(false)
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        window.dispatchEvent(new CustomEvent('news-banner-mode', { detail: 'fresh' }))
        missCountRef.current = Math.min(POLL_MAX_BACKOFF, missCountRef.current + 1)
        return
      }

      const { newLinks, updatedOnly } = diffFresh(fresh, news)

      setFreshNews(fresh)
      if (newLinks > 0) {
        setBannerMode('fresh')
        setHasNewBanner(true)
        window.dispatchEvent(new CustomEvent('news-banner-mode', { detail: 'fresh' }))
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: true }))
        missCountRef.current = 0
      } else if (updatedOnly > 0) {
        setBannerMode('updates')
        setHasNewBanner(true)
        window.dispatchEvent(new CustomEvent('news-banner-mode', { detail: 'updates' }))
        // zaradi združljivosti ostane isti event:
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: true }))
        missCountRef.current = 0
      } else {
        setHasNewBanner(false)
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        window.dispatchEvent(new CustomEvent('news-banner-mode', { detail: 'fresh' }))
        missCountRef.current = Math.min(POLL_MAX_BACKOFF, missCountRef.current + 1)
      }
    }

    const schedule = () => {
      const hidden = document.visibilityState === 'hidden'
      const base = hidden ? HIDDEN_POLL_MS : POLL_MS
      const extra = missCountRef.current * 10_000
      const delay = base + extra
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = window.setInterval(runCheck, delay) as unknown as number
    }

    runCheck()
    schedule()

    const onVis = () => { if (document.visibilityState === 'visible') runCheck(); schedule() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [news, bootRefreshed])

  // manual refresh
  useEffect(() => {
    const onRefresh = () => {
      window.dispatchEvent(new CustomEvent('news-refreshing', { detail: true }))
      startTransition(() => {
        const finish = () => {
          window.dispatchEvent(new CustomEvent('news-refreshing', { detail: false }))
          setHasNewBanner(false)
          window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
          missCountRef.current = 0
          // reset paginacije
          setHasMore(true)
          setCursor(null)
          setDisplayCount(20)
        }
        if (freshNews) {
          // Če imamo svež paket, ga uveljavi.
          setNews(freshNews)
          finish()
        } else {
          loadNews(true).then((fresh) => {
            if (fresh && fresh.length) { setNews(fresh) }
            finish()
          })
        }
      })
    }
    window.addEventListener('refresh-news', onRefresh as EventListener)
    return () => window.removeEventListener('refresh-news', onRefresh as EventListener)
  }, [freshNews])

  // sync s Headerjem (filters:update) – reset paginacije
  useEffect(() => {
    const onFiltersUpdate = (e: Event) => {
      const arr = (e as CustomEvent).detail?.sources
      if (!Array.isArray(arr)) return
      startTransition(() => {
        setFilter(arr.length ? arr[0] : 'Vse')
        setDisplayCount(20)
        setHasMore(true)
        setCursor(null)
      })
    }
    window.addEventListener('filters:update', onFiltersUpdate as EventListener)
    return () => window.removeEventListener('filters:update', onFiltersUpdate as EventListener)
  }, [])

  // — obogatimo novice s "stableAt" in sproti dopolnimo firstSeen mapo —
  const shapedNews = useMemo(() => {
    const map = { ...firstSeen }
    let changed = false

    const withStable = news.map(n => {
      const published = typeof n.publishedAt === 'number' ? n.publishedAt : 0
      const link = n.link || ''
      if (link && map[link] == null) {
        map[link] = published || Date.now()
        changed = true
      }
      const first = map[link] ?? published
      const stableAt = Math.min(first || Infinity, published || Infinity)
      return { ...n, stableAt } as NewsItem & { stableAt: number }
    })

    if (changed) { setFirstSeen(map); saveFirstSeen(map) }
    return withStable
  }, [news, firstSeen])

  // data shaping (sort + filter + paginate)
  const sortedNews = useMemo(
    () => [...shapedNews].sort((a, b) => (b as any).stableAt - (a as any).stableAt),
    [shapedNews]
  )
  const filteredNews = useMemo(
    () => (deferredFilter === 'Vse' ? sortedNews : sortedNews.filter((a) => a.source === deferredFilter)),
    [sortedNews, deferredFilter]
  )
  const visibleNews = useMemo(() => filteredNews.slice(0, displayCount), [filteredNews, displayCount])

  // minimalni publishedAt med trenutno naloženimi → za naslednjo stran gremo pod to vrednost
  useEffect(() => {
    if (!filteredNews.length) { setCursor(null); setHasMore(true); return }
    const minMs = filteredNews.reduce((acc, n) => Math.min(acc, n.publishedAt || acc), filteredNews[0].publishedAt || 0)
    setCursor(minMs || null)
  }, [deferredFilter, news])

  const onPick = (s: string) =>
    startTransition(() => { setFilter(s); setDisplayCount(20); setMenuOpen(false); emitFilterUpdate([s]) })
  const resetFilter = () =>
    startTransition(() => { setFilter('Vse'); setDisplayCount(20); setMenuOpen(false); emitFilterUpdate([]) })

  // realni loadMore (pridobi starejše preko API kurzorja)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || cursor == null || cursor <= 0) return
    setIsLoadingMore(true)
    try {
      const { items, nextCursor } = await fetchPage({
        cursor,
        limit: 40,
        source: deferredFilter,
      })

      const seen = new Set(news.map(n => n.link))
      const fresh = items.filter(i => !seen.has(i.link))

      if (fresh.length) {
        setNews(prev => [...prev, ...fresh])
        setDisplayCount(prev => prev + fresh.length)
      }

      if (!nextCursor || nextCursor === cursor || fresh.length === 0) {
        setHasMore(false)
        setCursor(null)
      } else {
        setCursor(nextCursor)
        setHasMore(true)
      }
    } finally {
      setIsLoadingMore(false)
    }
  }

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const motionDuration = prefersReducedMotion ? 0.08 : 0.14

  return (
    <>
      <Header />

      <SeoHead
        title="Križišče"
        description="Agregator najnovejših novic iz slovenskih medijev. Članki so last izvornih portalov."
      />

      {/* DROPDOWN */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="clickaway"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.05 }}
              className="fixed inset-0 z-30 bg-transparent"
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <motion.div
              key="filter-dropdown"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="fixed z-40"
              style={{ top: pos.top, right: pos.right }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Filtriraj vire"
            >
              <div className="w-[86vw] max-w-[22rem] rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/75 backdrop-blur-xl shadow-xl overflow-hidden">
                <div className="px-4 py-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Filtriraj vire</span>
                  <button aria-label="Zapri" onClick={() => setMenuOpen(false)} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </button>
                </div>
                <div className="px-2 pb-2 max-h-[70vh] overflow-y-auto scrollbar-hide">
                  <div className="space-y-1">
                    <button onClick={resetFilter} className="w-full text-left px-3 py-2 rounded-md bg-brand text-white hover:bg-brand-hover transition">Pokaži vse</button>
                    {SOURCES.filter((s) => s !== 'Vse').map((source, idx) => (
                      <motion.button
                        key={source}
                        onClick={() => onPick(source)}
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.1, delay: 0.01 * idx }}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 transition"
                      >
                        {source}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main
        className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-5 lg:pt-6 pb-24 transform-gpu translate-y-[var(--mob-shift,0px)] md:translate-y-0 transition-transform duration-150 ease-out"
      >
        {visibleNews.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center w-full mt-10">
            Ni novic za izbrani vir ali napaka pri nalaganju.
          </p>
        ) : (
          <AnimatePresence>
            <motion.div
              key={deferredFilter}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: motionDuration }}
              className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
            >
              {visibleNews.map((article, i) => (
                <ArticleCard key={article.link} news={article as any} priority={i === 0} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {hasMore && (
          <div className="text-center mt-8 mb-10">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-5 py-2 bg-brand text-white rounded-full hover:bg-brand-hover transition disabled:opacity-60"
            >
              {isLoadingMore ? 'Nalagam…' : 'Naloži več'}
            </button>
          </div>
        )}

        <hr className="max-w-6xl mx-auto mt-4 border-t border-gray-200 dark:border-gray-700" />
      </main>

      <BackToTop threshold={200} />
      <Footer />
    </>
  )
}

export async function getStaticProps() {
  const initialNews = await fetchRSSFeeds()
  return { props: { initialNews }, revalidate: 60 }
}
