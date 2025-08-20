// pages/index.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useDeferredValue,
  startTransition,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
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
      }
    }
    fetchFresh()
    return () => {
      cancelled = true
    }
  }, [initialNews])

  const filterRef = useRef<HTMLDivElement | null>(null)

  const onPick = (s: string) =>
    startTransition(() => {
      setFilter(s)
      setDisplayCount(20)
    })

  const handleLoadMore = () => setDisplayCount((p) => p + 20)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white px-4 md:px-8 lg:px-16 py-8">

        {/* FILTER BAR – "nadaljevanje" headerja */}
        {/* top-14 ~ 56px; po potrebi prilagodi glede na dejansko višino headerja */}
        <div className="sticky top-14 z-30 bg-white dark:bg-gray-900 border-b border-gray-200/60 dark:border-gray-700/60">
          <div
            ref={filterRef}
            className="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide px-2 sm:px-4 h-12"
            style={{ scrollBehavior: 'smooth' }}
          >
            {SOURCES.map((source) => (
              <button
                key={source}
                onClick={() => onPick(source)}
                className={`relative px-3 py-1 rounded-full text-sm transition font-medium whitespace-nowrap ${
                  deferredFilter === source
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
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
        </div>

        {/* GRID */}
        {visibleNews.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center w-full mt-10">
            Ni novic za izbrani vir ali napaka pri nalaganju.
          </p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={deferredFilter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
            >
              {visibleNews.map((article, i) => (
                <ArticleCard key={i} news={article} />
              ))}
            </motion.div>
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
