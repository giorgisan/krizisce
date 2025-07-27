// pages/index.tsx
import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'
import { SOURCES } from '@/lib/sources'
import ArticleCard from '@/components/ArticleCard'

type Props = {
  initialNews: NewsItem[]
}

export default function Home({ initialNews }: Props) {
  const [filter, setFilter] = useState<string>('Vse')
  const [displayCount, setDisplayCount] = useState<number>(20)

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

  return (
    <>
      <main className="min-h-screen bg-gray-900 text-white px-4 md:px-8 lg:px-16 py-8">
        {/* Sticky filter bar */}
        <div className="sticky top-0 z-40 bg-gray-900/70 backdrop-blur-md backdrop-saturate-150 py-2 mb-6 border-b border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="Križišče" className="w-8 h-8 rounded-full" />
              <div>
                <h1 className="text-lg font-bold">Križišče</h1>
                <p className="text-xs text-gray-400">Najnovejše novice slovenskih medijev</p>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-nowrap items-center gap-2 sm:gap-3 overflow-x-auto pb-1">
              {SOURCES.map((source) => (
                <button
                  key={source}
                  onClick={() => {
                    setFilter(source)
                    setDisplayCount(20)
                  }}
                  className={`relative px-4 py-1 rounded-full transition font-medium whitespace-nowrap ${
                    filter === source
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {filter === source && (
                    <motion.div
                      layoutId="bubble"
                      className="absolute inset-0 rounded-full bg-purple-600 z-0"
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    />
                  )}
                  <span className="relative z-10">{source}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* News grid */}
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
              {visibleNews.map((article, index) => (
                <ArticleCard key={index} news={article} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Load more */}
        {displayCount < filteredNews.length && (
          <div className="text-center mt-8">
            <button
              onClick={handleLoadMore}
              className="px-5 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition"
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

export async function getServerSideProps() {
  const initialNews = await fetchRSSFeeds()
  return {
    props: {
      initialNews,
    },
  }
}
