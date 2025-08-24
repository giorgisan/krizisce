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
import { useLocalStorage } from '@/lib/useLocalStorage'

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

type FilterMode = 'all' | 'mine' | 'one'

type Props = { initialNews: NewsItem[] }

export default function Home({ initialNews }: Props) {
  const [news, setNews] = useState<NewsItem[]>(initialNews)

  // ---- NOVO: načini filtriranja
  const [mode, setMode] = useState<FilterMode>('all')
  const [oneSource, setOneSource] = useState<string>('Vse')
  const [mySources, setMySources] = useLocalStorage<string[]>(
    'krz:mySources',
    SOURCES.filter((s) => s !== 'Vse') // privzeto: vsi viri
  )
  const effectiveMySources = mySources.length
    ? mySources
    : SOURCES.filter((s) => s !== 'Vse')

  // Za animacije ključimo po labelu
  const filterLabel =
    mode === 'all' ? 'Vse' : mode === 'mine' ? 'Moji viri' : oneSource
  const deferredLabel = useDeferredValue(filterLabel)

  const [displayCount, setDisplayCount] = useState<number>(20)

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

  // ---- “New content” mehanika ostane enaka
  const [freshNews, setFreshNews] = useState<NewsItem[] | null>(null)
  const [hasNew, setHasNew] = useState(false)

  useEffect(() => {
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
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [news, initialNews])

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

  // ---- Filtriranje
  const sortedNews = useMemo(
    () => [...news].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()),
    [news]
  )

  const filteredNews = useMemo(() => {
    if (mode === 'all') return sortedNews
    if (mode === 'one') return sortedNews.filter((a) => a.source === oneSource)
    const set = new Set(effectiveMySources)
    return sortedNews.filter((a) => set.has(a.source))
  }, [sortedNews, mode, oneSource, effectiveMySources])

  const visibleNews = filteredNews.slice(0, displayCount)

  // ---- Handlers
  const chooseAll = () => {
    startTransition(() => {
      setMode('all')
      setDisplayCount(20)
      setMenuOpen(false)
    })
  }

  const chooseMine = () => {
    startTransition(() => {
      setMode('mine')
      setDisplayCount(20)
      setMenuOpen(false)
    })
  }

  const chooseOne = (s: string) => {
    startTransition(() => {
      setOneSource(s)
      setMode('one')
      setDisplayCount(20)
      setMenuOpen(false)
    })
  }

  const toggleMy = (s: string) => {
    setMySources((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  const selectAllMy = () => setMySources(SOURCES.filter((s) => s !== 'Vse'))
  const clearAllMy = () => setMySources([])

  const handleLoadMore = () => setDisplayCount((p) => p + 20)

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
                className="w-[86vw] max-w-[24rem]
                           rounded-xl border border-gray-200/70 dark:border-gray-700/70
                           bg-white/85 dark:bg-gray-900/80 backdrop-blur-xl
                           shadow-xl overflow-hidden"
                role="menu"
                aria-label="Filtriraj vire"
              >
                {/* Glava */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Filtri virov
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

                {/* Hitra izbira */}
                <div className="px-4 pb-3 flex gap-2">
                  <button
                    onClick={chooseAll}
                    className="px-3 py-1.5 rounded-md bg-brand text-white text-sm hover:bg-brand-hover"
                  >
                    Pokaži vse
                  </button>
                  <button
                    onClick={chooseMine}
                    className="px-3 py-1.5 rounded-md bg-black/5 dark:bg-white/10 text-sm text-gray-800 dark:text-gray-100 hover:bg-black/10 dark:hover:bg-white/15"
                  >
                    Moji viri
                  </button>
                </div>

                {/* En vir (seznam) */}
                <div className="px-2 pb-2 max-h-[42vh] overflow-y-auto scrollbar-hide">
                  <div className="px-2 pb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Ali izberi en vir
                  </div>
                  <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                    {SOURCES.filter((s) => s !== 'Vse').map((source) => (
                      <button
                        key={`one-${source}`}
                        onClick={() => chooseOne(source)}
                        className="text-left px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 transition"
                      >
                        {source}
                      </button>
                    ))}
                  </div>

                  {/* Uredi “Moje vire” */}
                  <div className="px-2 pt-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Uredi “Moje vire”
                  </div>
                  <div className="px-2 py-2 flex items-center gap-2">
                    <button
                      onClick={selectAllMy}
                      className="text-xs px-2 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15"
                    >
                      Izberi vse
                    </button>
                    <button
                      onClick={clearAllMy}
                      className="text-xs px-2 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15"
                    >
                      Počisti
                    </button>
                    <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                      {effectiveMySources.length} izbranih
                    </div>
                  </div>

                  <div className="px-2 grid grid-cols-2 gap-1 pb-3">
                    {SOURCES.filter((s) => s !== 'Vse').map((source) => {
                      const checked = effectiveMySources.includes(source)
                      return (
                        <label
                          key={`my-${source}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="accent-brand h-4 w-4"
                            checked={checked}
                            onChange={() => toggleMy(source)}
                          />
                          <span className="text-gray-800 dark:text-gray-200">{source}</span>
                        </label>
                      )
                    })}
                  </div>

                  <div className="px-2 pb-4">
                    <button
                      onClick={chooseMine}
                      className="w-full px-3 py-2 rounded-md bg-brand text-white hover:bg-brand-hover"
                    >
                      Shrani & uporabi moje vire
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-5 lg:pt-6 pb-24">
        {/* “Reset chip” – pokaži, ko ni Vse */}
        <AnimatePresence>
          {deferredLabel !== 'Vse' && (
            <motion.div
              key="reset-chip"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="sticky top-[3.25rem] z-30"
            >
              <button
                onClick={chooseAll}
                className="px-3 py-1 rounded-full text-sm font-medium
                           bg-black/[0.06] text-gray-800 hover:bg-black/[0.08]
                           dark:bg-white/[0.08] dark:text-gray-100 dark:hover:bg-white/[0.12]
                           transition"
              >
                {deferredLabel} · počisti
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {visibleNews.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center w-full mt-10">
            Ni novic za izbrane vire ali napaka pri nalaganju.
          </p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={deferredLabel}
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

      <Footer />
    </>
  )
}

export async function getStaticProps() {
  const initialNews = await fetchRSSFeeds()
  return { props: { initialNews }, revalidate: 60 }
}
