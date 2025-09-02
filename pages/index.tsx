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
import dynamic from 'next/dynamic'

const AnimatePresence = dynamic(
  () => import('framer-motion').then((mod) => mod.AnimatePresence),
  { ssr: false }
)
const MotionDiv = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.div),
  { ssr: false }
)
const MotionButton = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.button),
  { ssr: false }
)

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

function timeout(ms: number) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error('Request timeout')), ms))
}

async function loadNews(forceFresh: boolean, signal?: AbortSignal): Promise<NewsItem[] | null> {
  try {
    const res = await Promise.race([
      fetch(`/api/news${forceFresh ? '?forceFresh=1' : ''}`, { cache: 'no-store', signal }),
      timeout(12_000),
    ]) as Response
    const fresh: NewsItem[] = await res.json()
    return Array.isArray(fresh) && fresh.length ? fresh : null
  } catch {
    return null
  }
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

type Props = { initialNews: NewsItem[] }

export default function Home({ initialNews }: Props) {
  const [news, setNews] = useState<NewsItem[]>(initialNews || [])
  const [filter, setFilter] = useState<string>('Vse')
  const deferredFilter = useDeferredValue(filter)
  const [displayCount, setDisplayCount] = useState<number>(20)

  const [menuOpen, setMenuOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })

  // ---------- Dropdown handling ----------
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

  // ---------- Background refresh on first visit ----------
  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      const fresh = await loadNews(true, ctrl.signal)
      if (fresh && fresh.length) {
        const latestFresh = fresh[0]?.publishedAt || 0
        const latestCurrent = news[0]?.publishedAt || 0
        if (latestFresh > latestCurrent) {
          // združi nove + obstoječe, brez duplikatov
          const merged = [...fresh, ...news].reduce((acc: NewsItem[], item) => {
            if (!acc.find((x) => x.link === item.link)) acc.push(item)
            return acc
          }, [])
          startTransition(() => {
            setNews(merged.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)))
          })
        }
      }
    })()
    return () => ctrl.abort()
  }, [])

  // ---------- Polling (interval check) ----------
  const missCountRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const runCheck = async () => {
      const ctrl = new AbortController()
      const fresh = await loadNews(true, ctrl.signal)
      if (!fresh || fresh.length === 0) {
        missCountRef.current = Math.min(5, missCountRef.current + 1)
        return
      }
      const latestFresh = fresh[0]?.publishedAt || 0
      const latestCurrent = news[0]?.publishedAt || 0
      if (latestFresh > latestCurrent) {
        const merged = [...fresh, ...news].reduce((acc: NewsItem[], item) => {
          if (!acc.find((x) => x.link === item.link)) acc.push(item)
          return acc
        }, [])
        startTransition(() => {
          setNews(merged.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)))
        })
        missCountRef.current = 0
      } else {
        missCountRef.current = Math.min(5, missCountRef.current + 1)
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
  }, [news])

  // ---------- Filters ----------
  useEffect(() => {
    const onFiltersUpdate = (e: Event) => {
      const arr = (e as CustomEvent).detail?.sources
      if (!Array.isArray(arr)) return
      startTransition(() => {
        setFilter(arr.length ? arr[0] : 'Vse')
        setDisplayCount(20)
      })
    }
    window.addEventListener('filters:update', onFiltersUpdate as EventListener)
    return () => window.removeEventListener('filters:update', onFiltersUpdate as EventListener)
  }, [])

  // ---------- Data shaping ----------
  const sortedNews = useMemo(
    () => [...news].sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)),
    [news]
  )
  const filteredNews = useMemo(
    () => (deferredFilter === 'Vse' ? sortedNews : sortedNews.filter((a) => a.source === deferredFilter)),
    [sortedNews, deferredFilter]
  )
  const visibleNews = useMemo(() => filteredNews.slice(0, displayCount), [filteredNews, displayCount])

  const onPick = (s: string) => startTransition(() => { setFilter(s); setDisplayCount(20); setMenuOpen(false); emitFilterUpdate([s]) })
  const resetFilter = () => startTransition(() => { setFilter('Vse'); setDisplayCount(20); setMenuOpen(false); emitFilterUpdate([]) })
  const handleLoadMore = () => setDisplayCount((p) => p + 20)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const motionDuration = prefersReducedMotion ? 0.01 : 0.2

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
            <MotionDiv
              key="clickaway"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.05 }}
              className="fixed inset-0 z-30 bg-transparent"
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <MotionDiv
              key="filter-dropdown"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
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
                      <MotionButton
                        key={source}
                        onClick={() => onPick(source)}
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.12, delay: 0.01 * idx }}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 transition"
                      >
                        {source}
                      </MotionButton>
                    ))}
                  </div>
                </div>
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* MAIN */}
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-5 lg:pt-6 pb-24">
        {visibleNews.length === 0 ? (
          // Skeleton loader z fade-in
          <MotionDiv
            key="skeletons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 mt-10"
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-40 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl"
              />
            ))}
          </MotionDiv>
        ) : (
          <AnimatePresence mode="wait">
            <MotionDiv
              key={deferredFilter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: motionDuration }}
              className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
            >
              {visibleNews.map((article) => (
                <ArticleCard key={article.link} news={article} />
              ))}
            </MotionDiv>
          </AnimatePresence>
        )}

        {displayCount < filteredNews.length && (
          <div className="text-center mt-8 mb-10">
            <button onClick={handleLoadMore} className="px-5 py-2 bg-brand text-white rounded-full hover:bg-brand-hover transition">
              Naloži več
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
