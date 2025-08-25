// pages/index.tsx
'use client'

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
import BackToTop from '@/components/BackToTop'

// Fetch helper for client polling / first-visit refresh
async function loadNews(forceFresh: boolean): Promise<NewsItem[] | null> {
  try {
    const res = await fetch(`/api/news${forceFresh ? '?forceFresh=1' : ''}`, {
      cache: 'no-store',
    })
    const fresh: NewsItem[] = await res.json()
    return Array.isArray(fresh) && fresh.length ? fresh : null
  } catch {
    return null
  }
}

// >>> NOVO: enoten “most” do Headerja (banner “Prikazani viri …”)
function emitFilterUpdate(sources: string[]) {
  try { sessionStorage.setItem('filters_interacted', '1') } catch {}
  try { localStorage.setItem('selectedSources', JSON.stringify(sources)) } catch {}
  try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources } })) } catch {}
}

type Props = { initialNews: NewsItem[] }

export default function Home({ initialNews }: Props) {
  const [news, setNews] = useState<NewsItem[]>(initialNews)
  const [filter, setFilter] = useState<string>('Vse')
  const deferredFilter = useDeferredValue(filter)
  const [displayCount, setDisplayCount] = useState<number>(20)

  // Dropdown state (kept for future use; the trigger is in Header)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })

  useEffect(() => {
    const handler = () => {
      computeDropdownPos()
      setMenuOpen((s) => !s)
    }
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
    computeDropdownPos()
    const onResize = () => computeDropdownPos()
    const onScroll = () => menuOpen && computeDropdownPos()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // ---------- Instant refresh on first visit ----------
  const [bootRefreshed, setBootRefreshed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const fresh = await loadNews(true) // no-store
      if (cancelled) return
      if (fresh && fresh.length) {
        const latestFresh   = new Date(fresh[0].pubDate).getTime()
        const latestInitial = new Date(initialNews[0]?.pubDate || 0).getTime()
        if (latestFresh > latestInitial) {
          startTransition(() => {
            setNews(fresh)
            setDisplayCount(20)
          })
        }
      }
      setBootRefreshed(true)
    })()
    return () => { cancelled = true }
  }, [initialNews])
  // ----------------------------------------------------

  // “green-dot” polling kicks in after the first refresh pass
  const [freshNews, setFreshNews] = useState<NewsItem[] | null>(null)
  const [hasNew, setHasNew] = useState(false)

  useEffect(() => {
    if (!bootRefreshed) return

    let cancelled = false
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
    const timer = window.setInterval(checkFresh, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [news, initialNews, bootRefreshed])

  // Handle manual refresh signal from the header button
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

  // Data shaping
  const sortedNews = useMemo(
    () => [...news].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()),
    [news]
  )
  const filteredNews =
    deferredFilter === 'Vse' ? sortedNews : sortedNews.filter((a) => a.source === deferredFilter)
  const visibleNews = filteredNews.slice(0, displayCount)

  // >>> POPRAVEK: oddaj signal za Header
  const onPick = (s: string) =>
    startTransition(() => {
      setFilter(s)
      setDisplayCount(20)
      setMenuOpen(false)
      emitFilterUpdate([s])          // <<< dodano
    })

  const resetFilter = () =>
    startTransition(() => {
      setFilter('Vse')
      setDisplayCount(20)
      setMenuOpen(false)
      emitFilterUpdate([])           // <<< dodano
    })

  const handleLoadMore = () => setDisplayCount((p) => p + 20)

  return (
    <>
      <Header />

      <SeoHead
        title="Križišče"
        description="Agregator najnovejših novic iz slovenskih medijev. Članki so last izvornih portalov."
      />

      {/* DROPDOWN (kept for future re-enable) */}
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
            />
            <motion.div
              key="filter-dropdown"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="fixed z-40"
              style={{ top: pos.top, right: pos.right }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-[86vw] max-w-[22rem]
                           rounded-xl border border-gray-200/70 dark:border-gray-700/70
                           bg-white/80 dark:bg-gray-900/75 backdrop-blur-xl
                           shadow-xl overflow-hidden"
                role="menu"
                aria-label="Filtriraj vire"
              >
                <div className="px-4 py-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Filtriraj vire
                  </span>
                  <button
                    aria-label="Zapri"
                    onClick={() => setMenuOpen(false)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <div className="px-2 pb-2 max-h-[70vh] overflow-y-auto scrollbar-hide">
                  <div className="space-y-1">
                    <button
                      onClick={resetFilter}
                      className="w-full text-left px-3 py-2 rounded-md
                                 bg-brand text-white hover:bg-brand-hover transition"
                    >
                      Pokaži vse
                    </button>

                    {SOURCES.filter((s) => s !== 'Vse').map((source, idx) => (
                      <motion.button
                        key={source}
                        onClick={() => onPick(source)}
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.12, delay: 0.01 * idx }}
                        className="w-full text-left px-3 py-2 rounded-md
                                   hover:bg-black/5 dark:hover:bg-white/5
                                   text-gray-800 dark:text-gray-200 transition"
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

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-5 lg:pt-6 pb-24">
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
              {visibleNews.map((article) => (
                <ArticleCard key={article.link} news={article} />
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

      {/* Small UX helper */}
      <BackToTop threshold={200} />

      <Footer />
    </>
  )
}

export async function getStaticProps() {
  const initialNews = await fetchRSSFeeds()
  return { props: { initialNews }, revalidate: 60 }
}
