// pages/index.tsx

import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo, useRef, useEffect } from 'react'
import { SOURCES, sourceColors } from '@/lib/sources'
import Link from 'next/link'

type Props = {
  initialNews: NewsItem[]
}

export default function Home({ initialNews }: Props) {
  const [filter, setFilter] = useState<string>('Vse')
  const [displayCount, setDisplayCount] = useState<number>(20)
  const [showArrow, setShowArrow] = useState(false)
  const filterRef = useRef<HTMLDivElement | null>(null)

  const sortedNews = useMemo(() => {
    return [...initialNews].sort(
      (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    )
  }, [initialNews])

  const filteredNews =
    filter === 'Vse'
      ? sortedNews
      : sortedNews.filter((article) => article.source === filter)

  const visibleNews = filteredNews.slice(0, displayCount)

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 20)
  }

  const scrollRight = () => {
    if (filterRef.current) {
      filterRef.current.scrollBy({ left: 200, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    const updateArrow = () => {
      if (filterRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = filterRef.current
        setShowArrow(scrollLeft + clientWidth < scrollWidth)
      }
    }
    updateArrow()
    const current = filterRef.current
    current?.addEventListener('scroll', updateArrow)
    window.addEventListener('resize', updateArrow)
    return () => {
      current?.removeEventListener('scroll', updateArrow)
      window.removeEventListener('resize', updateArrow)
    }
  }, [])

  return (
    <>
      <main className="min-h-screen bg-gray-900 text-white px-4 md:px-8 lg:px-16 py-8">
        <div className="sticky top-0 z-40 bg-gray-900/70 backdrop-blur-md backdrop-saturate-150 py-2 mb-6 border-b border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-2 sm:px-4">
            <div className="flex items-center space-x-5">
              <Link href="/">
                <div className="flex items-center space-x-3 cursor-pointer">
                  <img
                    src="/logo.png"
                    alt="Križišče"
                    className="w-10 h-10 rounded-full transition duration-300 transform hover:scale-105 hover:shadow-lg"
                  />
                  <div>
                    <h1 className="text-2xl font-bold leading-tight">Križišče</h1>
                    <p className="text-xs text-gray-400">
                      Najnovejše novice slovenskih medijev
                    </p>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => location.reload()}
                aria-label="Osveži stran"
                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-transform transform hover:rotate-180"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                  <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                </svg>
              </button>
            </div>
            {/* On mobile, the filter bar takes full width; on desktop it shifts to the far right */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto">
              <div
                ref={filterRef}
                className="flex flex-nowrap items-center gap-1 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide"
                style={{ scrollBehavior: 'smooth' }}
              >
                {SOURCES.map((source) => (
                  <button
                    key={source}
                    onClick={() => {
                      setFilter(source)
                      setDisplayCount(20)
                    }}
                    className={`relative px-3 py-1 rounded-full text-sm transition font-medium whitespace-nowrap ${
                      filter === source
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white'
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
              {/* Arrow appears only on desktop and when content overflows */}
              {showArrow && (
                <button
                  onClick={scrollRight}
                  aria-label="Premakni desno"
                  className="hidden sm:flex items-center justify-center p-2 text-gray-400 hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Rest of the component remains unchanged (news grid, load more button, footer, styles) */}
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
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-32 sm:h-40 object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-1">
                        <span className="text-sm font-semibold" style={{ color }}>
                          {article.source}
                        </span>
                        <span className="text-xs text-gray-400 mt-1 sm:mt-0 sm:ml-2">
                          {formattedDate}
                        </span>
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

// Static generation with revalidation
export async function getStaticProps() {
  const initialNews = await fetchRSSFeeds()
  return {
    props: {
      initialNews,
    },
    revalidate: 300,
  }
}
