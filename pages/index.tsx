// pages/index.tsx
import React, {
  useEffect,
  useMemo,
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
import SeoHead from '@/components/SeoHead'

async function loadNews(forceFresh: boolean): Promise<NewsItem[] | null> {
  try {
    const res = await fetch(`/api/news${forceFresh ? '?forceFresh=1' : ''}`, { cache: 'no-store' })
    const fresh: NewsItem[] = await res.json()
    return Array.isArray(fresh) && fresh.length ? fresh : null
  } catch {
    return null
  }
}

type Props = { initialNews: NewsItem[] }

export default function Home({ initialNews }: Props) {
  const [news, setNews] = useState<NewsItem[]>(initialNews)
  const [filter, setFilter] = useState<string>('Vse')
  const deferredFilter = useDeferredValue(filter)
  const [displayCount, setDisplayCount] = useState<number>(20)

  // Drawer (vertikalni filter)
  const [drawerOpen, setDrawerOpen] = useState(false)
  useEffect(() => {
    const handler = () => setDrawerOpen((s) => !s)
    window.addEventListener('toggle-filters', handler as EventListener)
    return () => window.removeEventListener('toggle-filters', handler as EventListener)
  }, [])

  // Periodično preverjanje novih novic (za zeleno piko)
  const [freshNews, setFreshNews] = useState<NewsItem[] | null>(null)
  const [hasNew, setHasNew] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const checkFresh = async () => {
      const fresh = await loadNews(true)
      if (!fresh || fresh.length === 0) {
        if (!cancelled) {
          setHasNew(false)
          window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        }
        return
      }
      const latestFresh = new Date(fresh[0].pubDate).getTime()
      const latestCurrent = new Date((news[0] ?? initialNews[0])?.pubDate || 0).getTime()
      const newer = latestFresh > latestCurrent
      if (!cancelled) {
        setFreshNews(fresh)
        setHasNew(newer)
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: newer }))
      }
    }

    checkFresh()
    timer = window.setInterval(checkFresh, 60_000)
    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
    }
  }, [news, initialNews])

  // Osveži – poslušaj klik iz headerja in animacijski signal vrni headerju
  useEffect(() => {
    const onRefresh = () => {
      window.dispatchEvent(new CustomEvent('news-refreshing', { detail: true }))
      startTransition(() => {
        const finish = () => {
          window.dispatchEvent(new CustomEvent('news-refreshing', { detail: false }))
          setHasNew(false)
          window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        }
        if (freshNews && hasNew) {
          setNews(freshNews)
          setDisplayCount(20)
          finish()
        } else {
          loadNews(true).then((fresh) => {
            if (fresh && fresh.length) {
              setNews(fresh)
              setDisplayCount(20)
            }
            finish()
          })
        }
      })
    }
    window.addEventListener('refresh-news', onRefresh as EventListener)
    return () => window.removeEventListener('refresh-news', onRefresh as EventListener)
  }, [freshNews, hasNew])

  // Filtriranje
  const sortedNews = useMemo(
    () => [...news].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()),
    [news]
  )
  const filteredNews =
    deferredFilter === 'Vse' ? sortedNews : sortedNews.filter((a) => a.source === deferredFilter)
  const visibleNews = filteredNews.slice(0, displayCount)

  const onPick = (s: string) =>
    startTransition(() => {
      setFilter(s)
      setDisplayCount(20)
      setDrawerOpen(false)
    })

  const resetFilter = () =>
    startTransition(() => {
      setFilter('Vse')
      setDisplayCount(20)
    })

  const handleLoadMore = () => setDisplayCount((p) => p + 20)

  return (
    <>
      {/* SEO meta in pravilni <title> */}
      <SeoHead
        title="Križišče"
        description="Agregator najnovejših novic iz slovenskih medijev. Članki so last izvornih portalov."
        url="https://krizisce.si/"
        image="/logos/default-news.jpg"
      />

      <Header />

      {/* Vsebina */}
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-5 lg:pt-6 pb-24">
        {/* STICKY čip “Pokaži vse” – le, ko je izbran specifičen vir */}
        <AnimatePresence>
          {deferredFilter !== 'Vse' && (
            <motion.div
              key="reset-chip"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="sticky top-12 z-30 mb-3"
            >
              <button
                onClick={resetFilter}
                className="px-3 py-1 rounded-full text-sm font-medium
                           bg-black/[0.06] text-gray-800 hover:bg-black/[0.08]
                           dark:bg-white/[0.08] dark:text-gray-100 dark:hover:bg-white/[0.12]
                           transition"
              >
                Pokaži vse
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DRAWER */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
                onClick={() => setDrawerOpen(false)}
              />
              <motion.aside
                key="drawer"
                initial={{ x: '100%', opacity: 0.6 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0.6 }}
                transition={{ type: 'tween', duration: 0.22 }}
                className="fixed right-0 top-0 z-50 h-full w-[90vw] max-w-xs
                           bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl
                           border-l border-gray-200/70 dark:border-gray-700/70
                           shadow-2xl rounded-l-2xl overflow-hidden"
                aria-label="Filter virov"
              >
                <div className="h-12 px-4 flex items-center justify-between border-b border-gray-200/70 dark:border-gray-700/70">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Filtriraj vire
                  </span>
                  <button
                    aria-label="Zapri"
                    onClick={() => setDrawerOpen(false)}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <nav className="p-3 overflow-y-auto">
                  <button
                    onClick={resetFilter}
                    className={`w-full text-left px-3 py-2 rounded-md mb-2 transition ${
                      deferredFilter === 'Vse'
                        ? 'bg-brand text-white'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    Pokaži vse
                  </button>

                  {SOURCES.filter((s) => s !== 'Vse').map((source, idx) => (
                    <motion.button
                      key={source}
                      onClick={() => onPick(source)}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: 0.02 * idx }}
                      className={`w-full text-left px-3 py-2 rounded-md mb-1.5 transition ${
                        deferredFilter === source
                          ? 'bg-brand text-white'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {source}
                    </motion.button>
                  ))}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* GRID kartic */}
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
          <div className="text-center mt-8 mb-10">
            <button
              onClick={handleLoadMore}
              className="px-5 py-2 bg-brand text-white rounded-full hover:bg-brand-hover transition"
            >
              Naloži več
            </button>
          </div>
        )}

        <hr className="max-w-6xl mx-auto mt-4 border-t border-gray-200 dark:border-gray-700" />
      </main>

      <Footer />
    </>
  )
}

export async function getStaticProps() {
  const initialNews = await fetchRSSFeeds()
  return { props: { initialNews }, revalidate: 60 }
}
