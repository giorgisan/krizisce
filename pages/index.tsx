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

const AnimatePresence = dynamic(() => import('framer-motion').then((m) => m.AnimatePresence), { ssr: false })
const MotionDiv = dynamic(() => import('framer-motion').then((m) => m.motion.div), { ssr: false })
const MotionButton = dynamic(() => import('framer-motion').then((m) => m.motion.button), { ssr: false })

import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { SOURCES } from '@/lib/sources'
import ArticleCard from '@/components/ArticleCard'
import SeoHead from '@/components/SeoHead'
import BackToTop from '@/components/BackToTop'

// --- constants ---
const POLL_MS = 60_000
const HIDDEN_POLL_MS = 5 * 60_000
const MAX_BACKOFF = 5

// --- helpers ---
async function loadNews(forceFresh: boolean, signal?: AbortSignal): Promise<NewsItem[] | null> {
  try {
    const res = await fetch(`/api/news${forceFresh ? '?forceFresh=1' : ''}`, { cache: 'no-store', signal })
    const fresh: NewsItem[] = await res.json()
    return Array.isArray(fresh) && fresh.length ? fresh : null
  } catch {
    return null
  }
}

function emitFilterUpdate(sources: string[]) {
  try { localStorage.setItem('selectedSources', JSON.stringify(sources)) } catch {}
  try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources } })) } catch {}
}

type Props = { initialNews: NewsItem[] }

export default function Home({ initialNews }: Props) {
  const [news, setNews] = useState<NewsItem[]>(initialNews || [])
  const [freshNews, setFreshNews] = useState<NewsItem[] | null>(null)
  const [hasNew, setHasNew] = useState(false)

  const [filter, setFilter] = useState('Vse')
  const deferredFilter = useDeferredValue(filter)
  const [displayCount, setDisplayCount] = useState(20)

  const [menuOpen, setMenuOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })

  const missCountRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  // --- Dropdown ---
  useEffect(() => {
    const toggle = () => setMenuOpen((s) => !s)
    window.addEventListener('toggle-filters', toggle as EventListener)
    return () => window.removeEventListener('toggle-filters', toggle as EventListener)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // --- First check for new ---
  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      const fresh = await loadNews(true, ctrl.signal)
      if (fresh && fresh[0]?.publishedAt > (news[0]?.publishedAt || 0)) {
        setFreshNews(fresh)
        setHasNew(true)
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: true }))
      }
    })()
    return () => ctrl.abort()
  }, [])

  // --- Polling ---
  useEffect(() => {
    const runCheck = async () => {
      const fresh = await loadNews(true)
      if (!fresh || !fresh.length) {
        setHasNew(false)
        missCountRef.current = Math.min(MAX_BACKOFF, missCountRef.current + 1)
        return
      }
      const newer = fresh[0]?.publishedAt > (news[0]?.publishedAt || 0)
      setFreshNews(fresh)
      setHasNew(newer)
      window.dispatchEvent(new CustomEvent('news-has-new', { detail: newer }))
      missCountRef.current = newer ? 0 : Math.min(MAX_BACKOFF, missCountRef.current + 1)
    }

    const schedule = () => {
      const base = document.visibilityState === 'hidden' ? HIDDEN_POLL_MS : POLL_MS
      const extra = missCountRef.current * 10_000
      const delay = base + extra
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = window.setInterval(runCheck, delay) as unknown as number
    }

    runCheck()
    schedule()
    const onVis = () => { if (document.visibilityState === 'visible') runCheck(); schedule() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [news])

  // --- Manual refresh ---
  useEffect(() => {
    const onRefresh = () => {
      window.dispatchEvent(new CustomEvent('news-refreshing', { detail: true }))
      startTransition(() => {
        if (freshNews && hasNew) {
          setNews(freshNews)
          setDisplayCount(20)
        }
        setHasNew(false)
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        window.dispatchEvent(new CustomEvent('news-refreshing', { detail: false }))
        missCountRef.current = 0
      })
    }
    window.addEventListener('refresh-news', onRefresh as EventListener)
    return () => window.removeEventListener('refresh-news', onRefresh as EventListener)
  }, [freshNews, hasNew])

  // --- Filters ---
  useEffect(() => {
    const onFiltersUpdate = (e: Event) => {
      const arr = (e as CustomEvent).detail?.sources
      if (Array.isArray(arr)) startTransition(() => { setFilter(arr[0] || 'Vse'); setDisplayCount(20) })
    }
    window.addEventListener('filters:update', onFiltersUpdate as EventListener)
    return () => window.removeEventListener('filters:update', onFiltersUpdate as EventListener)
  }, [])

  // --- Data shaping ---
  const sortedNews = useMemo(() => [...news].sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)), [news])
  const filteredNews = useMemo(() => (deferredFilter === 'Vse' ? sortedNews : sortedNews.filter((a) => a.source === deferredFilter)), [sortedNews, deferredFilter])
  const visibleNews = useMemo(() => filteredNews.slice(0, displayCount), [filteredNews, displayCount])

  // --- Handlers ---
  const onPick = (s: string) => startTransition(() => { setFilter(s); setDisplayCount(20); setMenuOpen(false); emitFilterUpdate([s]) })
  const resetFilter = () => startTransition(() => { setFilter('Vse'); setDisplayCount(20); setMenuOpen(false); emitFilterUpdate([]) })
  const handleLoadMore = () => setDisplayCount((p) => p + 20)

  // --- Anim prefs ---
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const motionDuration = prefersReducedMotion ? 0.01 : 0.2

  return (
    <>
      <Header />

      <SeoHead title="Križišče" description="Agregator najnovejših novic iz slovenskih medijev. Članki so last izvornih portalov." />

      {/* MAIN */}
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-5 lg:pt-6 pb-24">
        {visibleNews.length === 0 ? (
          <MotionDiv key="skeletons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 mt-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl" />
            ))}
          </MotionDiv>
        ) : (
          <AnimatePresence mode="wait">
            <MotionDiv key={deferredFilter} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: motionDuration }}
              className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
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
