// pages/index.tsx

import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo, useEffect, useRef } from 'react'
import { SOURCES, sourceColors } from '@/lib/sources'
import Link from 'next/link'

type Props = { initialNews: NewsItem[] }

export default function Home({ initialNews }: Props) {
  // NEW: lokalni state z novicami (start = initialNews)
  const [news, setNews] = useState<NewsItem[]>(initialNews)

  const [filter, setFilter] = useState<string>('Vse')
  const [displayCount, setDisplayCount] = useState<number>(20)
  const [hasFresh, setHasFresh] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const filterRef = useRef<HTMLDivElement | null>(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)
  const [alignEnd, setAlignEnd] = useState(true)

  // sortiraj po state-u 'news' (ne več po initialNews)
  const sortedNews = useMemo(
    () => [...news].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()),
    [news]
  )

  const filteredNews = filter === 'Vse' ? sortedNews : sortedNews.filter(a => a.source === filter)
  const visibleNews = filteredNews.slice(0, displayCount)

  // Ob mountu enkrat preveri, če obstaja svežejši zapis na API
  useEffect(() => {
    const latest = initialNews?.[0]?.pubDate
    if (!latest) return
    const check = async () => {
      try {
        const res = await fetch('/api/news?forceFresh=1', { cache: 'no-store' })
        const fresh: NewsItem[] = await res.json()
        if (Array.isArray(fresh) && fresh.length) {
          if (new Date(fresh[0].pubDate).getTime() > new Date(latest).getTime()) {
            setHasFresh(true)
          }
        }
      } catch {
        // tiho – nič
      }
    }
    check()
  }, [initialNews])

  // NAMIG: puščice za drsanje filtrov (desktop)
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
      const scrollLeft = Math.ceil(el.scrollLeft)
      const clientWidth = Math.ceil(el.clientWidth)
      const scrollWidth = Math.ceil(el.scrollWidth)
      const overflow = scrollWidth - clientWidth > 2
      setShowLeft(overflow && scrollLeft > 0)
      setShowRight(overflow && scrollLeft + clientWidth < scrollWidth - 1)
      setAlignEnd(!overflow)
    }

    update()
    el.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    const ro = new ResizeObserver(update)
    ro.observe(el)
    Array.from(el.children).forEach(c => ro.observe(c as Element))
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      ro.disconnect()
    }
  }, [])

  const scrollBy = (dx: number) => filterRef.current?.scrollBy({ left: dx, behavior: 'smooth' })
  const handleLoadMore = () => setDisplayCount(p => p + 20)

  // NEW: client-side refresh – brez reload-a
  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const res = await fetch('/api/news?forceFresh=1', { cache: 'no-store' })
      const fresh: NewsItem[] = await res.json()
      if (Array.isArray(fresh) && fresh.length) {
        setNews(fresh)          // zamenjaj prikazane novice
        setHasFresh(false)      // ugasni zeleno piko
        setDisplayCount(20)     // reset paginacije
      } else {
        // če API vrne prazno, fallback na “cache-busting” reload
        location.href = location.pathname + (location.search ? location.search + '&' : '?') + 't=' + Date.now()
      }
    } catch {
      // network fallback – prisili svež HTML
      location.href = location.pathname + (location.search ? location.search + '&' : '?') + 't=' + Date.now()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <>
      <main className="min-h-screen bg-gray-900 text-white px-4 md:px-8 lg:px-16 py-8">
        <div className="sticky top-0 z-40 bg-gray-900/70 backdrop-blur-md border-b border-gray-800 py-2 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-2 sm:px-4">
            {/* Logo + refresh */}
            <div className="flex items-center space-x-5">
              <Link href="/">
                <div className="flex items-center space-x-3 cursor-pointer">
                  <img src="/logo.png" alt="Križišče" className="w-10 h-10 rounded-full transition hover:scale-105" />
                  <div>
                    <h1 className="text-2xl font-bold leading-tight">Križišče</h1>
                    <p className="text-xs text-gray-400">Najnovejše novice slovenskih medijev</p>
                  </div>
                </div>
              </Link>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Osveži stran"
                className="relative p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-transform"
                title={hasFresh ? 'Na voljo so nove novice' : 'Osveži'}
              >
                {/* zelena pika – skrita na mobilu */}
                {hasFresh && (
                  <span className="hidden sm:inline-block absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-gray-900" />
                )}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth="2"
                  className={`w-5 h-5 ${refreshing ? 'animate-spin' : 'hover:rotate-180'} transition-transform`}
                >
                  <path stroke="none" d="M0 0h24v24H0z" />
                  <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                  <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                </svg>
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
              {showLeft && (
                <button
                  onClick={() => scrollBy(-220)}
                  aria-label="Premakni levo"
                  className="hidden sm:flex items-center justify-center p-2 text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
              )}

              <div
                ref={filterRef}
                className={[
                  'flex flex-nowrap items-center overflow-x-auto scrollbar-hide',
                  'gap-2 pb-1',
                  alignEnd ? 'sm:justify-end' : ''
                ].join(' ')}
                style={{ scrollBehavior: 'smooth' }}
              >
                {SOURCES.map((source) => (
                  <button
                    key={source}
                    onClick={() => { setFilter(source); setDisplayCount(20) }}
                    className={`relative px-3 py-1 rounded-full text-sm transition font-medium whitespace-nowrap ${
                      filter === source ? 'text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {filter === source && (
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
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* News grid */}
        {visibleNews.length === 0 ? (
          <p className="text-gray-400 text-center w-full mt-10">Ni novic za izbrani vir ali napaka pri nalaganju.</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
            >
              {visibleNews.map((article, i) => {
                const formattedDate = new Date(article.pubDate).toLocaleString('sl-SI')
                const color = sourceColors[article.source] || '#fc9c6c'
                return (
                  <a
                    href={article.link}
                    key={i}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-800 hover:bg-gray-700 rounded-xl shadow-md overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl"
                  >
                    {article.image && (
                      <img src={article.image} alt={article.title} className="w-full h-32 sm:h-40 object-cover" loading="lazy" />
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-1">
                        <span className="text-sm font-semibold" style={{ color }}>{article.source}</span>
                        <span className="text-xs text-gray-400 mt-1 sm:mt-0 sm:ml-2">{formattedDate}</span>
                      </div>
                      <h2 className="text-base font-semibold mb-1 leading-tight line-clamp-3 sm:line-clamp-3">
                        {article.title}
                      </h2>
                      <p className="text-sm text-gray-400 line-clamp-4 sm:line-clamp-4">{article.contentSnippet}</p>
                    </div>
                  </a>
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {displayCount < filteredNews.length && (
          <div className="text-center mt-8">
            <button onClick={handleLoadMore} className="px-5 py-2 bg-brand text-white rounded-full hover:bg-brand-hover transition">
              Naloži več
            </button>
          </div>
        )}
      </main>

      <Footer />

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  )
}

// ISR še vedno ostane (za primarni render, SEO in deljenje linka)
export async function getStaticProps() {
  const initialNews = await fetchRSSFeeds()
  return { props: { initialNews }, revalidate: 60 }
}
