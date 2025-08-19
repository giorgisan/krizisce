// pages/index.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useDeferredValue,
  startTransition,
} from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'

import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import Footer from '@/components/Footer'
import { SOURCES } from '@/lib/sources'
import ArticleCard from '@/components/ArticleCard'

async function loadNews(forceFresh: boolean): Promise<NewsItem[] | null> {
  try {
    const res = await fetch(`/api/news${forceFresh ? '?forceFresh=1' : ''}`, {
      cache: 'no-store',
    })
    const fresh: NewsItem[] = await res.json()
    return Array.isArray(fresh) && fresh.length ? fresh : null
  } catch (err) {
    console.error('Failed to load news', err)
    return null
  }
}

type Props = { initialNews: NewsItem[] }

export default function Home({ initialNews }: Props) {
  const [news, setNews] = useState<NewsItem[]>(initialNews)
  const [filter, setFilter] = useState<string>('Vse')
  const deferredFilter = useDeferredValue(filter)
  const [displayCount, setDisplayCount] = useState<number>(20)
  const [hasFresh, setHasFresh] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const sortedNews = useMemo(
    () => [...news].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()),
    [news]
  )
  const filteredNews =
    deferredFilter === 'Vse'
      ? sortedNews
      : sortedNews.filter((a) => a.source === deferredFilter)
  const visibleNews = filteredNews.slice(0, displayCount)

  useEffect(() => {
    let cancelled = false

    const fetchFresh = async () => {
      const fresh = await loadNews(true)
      if (!fresh) return

      const latestFresh = new Date(fresh[0].pubDate).getTime()
      const latestCurrent = new Date((news[0] || initialNews[0])?.pubDate || 0).getTime()

      if (latestFresh > latestCurrent && !cancelled) {
        setNews(fresh)
        setDisplayCount(20)
        setHasFresh(false)
      }
    }

    fetchFresh()

    const iv = setInterval(async () => {
      const fresh = await loadNews(true)
      if (!fresh) return

      const latestFresh = new Date(fresh[0].pubDate).getTime()
      const latestCurrent = new Date((news[0] || initialNews[0])?.pubDate || 0).getTime()
      if (latestFresh > latestCurrent && !cancelled) {
        setHasFresh(true)
      }
    }, 60000)

    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [initialNews])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const fresh = await loadNews(true)
      if (fresh) {
        setNews(fresh)
        setHasFresh(false)
        setDisplayCount(20)
      } else {
        location.href =
          location.pathname + (location.search ? location.search + '&' : '?') + 't=' + Date.now()
      }
    } finally {
      setRefreshing(false)
    }
  }

  const filterRef = useRef<HTMLDivElement | null>(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)
  const [alignEnd, setAlignEnd] = useState(true)

  useEffect(() => {
    const el = filterRef.current
    if (!el) return

    const update = () => {
      const mq = window.matchMedia('(min-width: 640px)')
      if (!mq.matches) {
        setShowLeft(false)
        setShowRight(false)
        setAlignEnd(false)
        return
      }
      const sl = Math.ceil(el.scrollLeft)
      const cw = Math.ceil(el.clientWidth)
      const sw = Math.ceil(el.scrollWidth)
      const overflow = sw - cw > 2
      setShowLeft(overflow && sl > 0)
      setShowRight(overflow && sl + cw < sw - 1)
      setAlignEnd(!overflow)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    const ro = new ResizeObserver(update)
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', update as any)
      window.removeEventListener('resize', update)
      ro.disconnect()
    }
  }, [])

  const scrollBy = (dx: number) =>
    filterRef.current?.scrollBy({ left: dx, behavior: 'smooth' })

  const onPick = (s: string) =>
    startTransition(() => {
      setFilter(s)
      setDisplayCount(20)
    })

  const handleLoadMore = () => setDisplayCount((p) => p + 20)

  return (
    <>
      <main className="min-h-screen bg-gray-900 text-white px-4 md:px-8 lg:px-16 py-8">
        {/* HEADER */}
        <div className="sticky top-0 z-40 bg-gray-900/70 backdrop-blur-md border-b border-gray-800 py-2 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-2 sm:px-4">
            <div className="flex items-center space-x-5">
              <Link href="/">
                <div className="flex items-center space-x-3 cursor-pointer">
                  <img
                    src="/logo.png"
                    alt="Križišče"
                    className="w-10 h-10 rounded-full transition hover:scale-105"
                  />
                  <div>
                    <h1 className="text-2xl font-bold leading-tight">Križišče</h1>
                    <p className="text-xs text-gray-400">Najnovejše novice slovenskih medijev</p>
                  </div>
                </div>
              </Link>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Osveži"
                className="relative p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-transform"
                title={hasFresh ? 'Na voljo so nove novice' : 'Osveži'}
              >
                {hasFresh && (
                  <span className="hidden sm:inline-block absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-gray-900" />
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`w-5 h-5 ${refreshing ? 'animate-spin' : 'hover:rotate-180'} transition-transform`}
                >
                  <path stroke="none" d="M0 0h24v24H0z" />
                  <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                  <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
              {showLeft && (
                <button
                  onClick={() => scrollBy(-220)}
                  aria-label="Premakni levo"
                  className="hidden sm:flex items-center justify-center p-2 text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M15 6l-6 6 6 6" /></svg>
                </button>
              )}

              <div
                ref={filterRef}
                className={[
                  'flex flex-nowrap items-center overflow-x-auto scrollbar-hide',
                  'gap-2 pb-1',
                  alignEnd ? 'sm:justify-end' : '',
                ].join(' ')}
                style={{ scrollBehavior: 'smooth' }}
              >
                {SOURCES.map((source) => (
                  <button
                    key={source}
                    onClick={() => onPick(source)}
                    className={`relative px-3 py-1 rounded-full text-sm transition font-medium whitespace-nowrap ${
                      deferredFilter === source
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {deferredFilter === source && (
                      <motion.div
                        layoutId="bubble"
                        className="absolute inset-0 rounded-full bg-brand z-0"
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      />
                    )}
                    <span className="relative z-10">{source}</span>
                  </button>
                ))}
              </div>

              {showRight && (
                <button
                  onClick={() => scrollBy(220)}
                  aria-label="Premakni desno"
                  className="hidden sm:flex items-center justify-center p-2 text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* GRID */}
        {visibleNews.length === 0 ? (
          <p className="text-gray-400 text-center w-full mt-10">
            Ni novic za izbrani vir ali napaka pri nalaganju.
          </p>
        ) : (
          <AnimatePresence mode="wait">
            <LayoutGroup>
              <motion.div
                key={deferredFilter}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, staggerChildren: 0.05 }}
                className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
              >
                {visibleNews.map((article, i) => (
                  <motion.div
                    key={i}
                    layout
                    transition={{ type: 'spring', damping: 20 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ArticleCard news={article} />
                  </motion.div>
                ))}
              </motion.div>
            </LayoutGroup>
          </AnimatePresence>
        )}

        {displayCount < filteredNews.length && (
          <div className="text-center mt-8">
            <button
              onClick={handleLoadMore}
              className="px-5 py-2 bg-brand text-white rounded-full hover:bg-brand-hover transition"
            >
              Naloži več
            </button>
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}

export async function getStaticProps() {
  const initialNews = await fetchRSSFeeds()
  return { props: { initialNews }, revalidate: 60 }
}
