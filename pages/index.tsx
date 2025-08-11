// pages/index.tsx

import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'
// NEW: dodan useEffect
import { useState, useMemo, useEffect } from 'react'
import { SOURCES, sourceColors } from '@/lib/sources'
import Link from 'next/link'

type Props = { initialNews: NewsItem[] }

export default function Home({ initialNews }: Props) {
  const [filter, setFilter] = useState<string>('Vse')
  const [displayCount, setDisplayCount] = useState<number>(20)

  // NEW: indikator, da obstaja svežejši nabor novic
  const [hasFresh, setHasFresh] = useState(false)

  const sortedNews = useMemo(() => {
    return [...initialNews].sort(
      (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    )
  }, [initialNews])

  const filteredNews =
    filter === 'Vse' ? sortedNews : sortedNews.filter((a) => a.source === filter)

  const visibleNews = filteredNews.slice(0, displayCount)

  // NEW: preveri takoj po mountu, ali obstajajo nove novice (obvoz cache)
  useEffect(() => {
    const latest = initialNews?.[0]?.pubDate
    if (!latest) return
    const check = async () => {
      try {
        const res = await fetch('/api/news?forceFresh=1', { cache: 'no-store' })
        const fresh = await res.json()
        if (Array.isArray(fresh) && fresh.length) {
          const maxFresh = new Date(fresh[0].pubDate).getTime()
          const maxInitial = new Date(latest).getTime()
          if (maxFresh > maxInitial) setHasFresh(true)
        }
      } catch {
        /* ignore */
      }
    }
    check()
  }, [initialNews])

  const handleLoadMore = () => setDisplayCount((p) => p + 20)

  return (
    <>
      <main className="min-h-screen bg-gray-900 text-white px-4 md:px-8 lg:px-16 py-8">
        {/* --- Tvoja glava (logo, filtri …) ostane --- */}
        {/* Na gumbu za osvežitev dodaš “badge” (primer): */}
        {/* 
          <button
            onClick={() => location.reload()}
            aria-label="Osveži stran"
            className="relative p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-transform transform hover:rotate-180"
          >
            {hasFresh && (
              <span className="absolute -top-0.5 -right-0.5 inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-gray-900" />
            )}
            <svg>...</svg>
          </button>
        */}

        {/* --- OBSTOJEČI GRID NOVIC ostane --- */}
        {visibleNews.length === 0 ? (
          <p className="text-gray-400 text-center w-full mt-10">
            Ni novic za izbrani vir ali napaka pri nalaganju.
          </p>
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
              {visibleNews.map((article, index) => {
                const formattedDate = new Date(article.pubDate).toLocaleString('sl-SI')
                const color = sourceColors[article.source] || '#fc9c6c'
                return (
                  <a
                    href={article.link}
                    key={index}
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
                      <p className="text-sm text-gray-400 line-clamp-4 sm:line-clamp-4">
                        {article.contentSnippet}
                      </p>
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
    </>
  )
}

// ISR – skrajšaj na 60 sekund
export async function getStaticProps() {
  const initialNews = await fetchRSSFeeds()
  return {
    props: { initialNews },
    revalidate: 60,
  }
}
