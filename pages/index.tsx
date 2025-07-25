import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

const SOURCES = [
  'Vse', 'RTVSLO', '24ur', 'Siol.net',
  'Slovenske novice', 'Delo', 'Zurnal24'
]

type Props = {
  initialNews: NewsItem[]
}

export default function Home({ initialNews }: Props) {
  const [filter, setFilter] = useState<string>('Vse')
  const filteredNews =
    filter === 'Vse' ? initialNews : initialNews.filter(
      (article) => article.source === filter
    )

  return (
    <main className="min-h-screen bg-gray-900 text-white px-4 md:px-8 lg:px-16 py-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-4"> Križišče</h1>
      <p className="text-gray-400 mb-6">Najnovejše novice slovenskih medijev</p>

      <div className="flex flex-wrap gap-3 mb-6 relative">
        {SOURCES.map((source) => (
          <button
            key={source}
            onClick={() => setFilter(source)}
            className={`relative px-4 py-1 rounded-full transition font-medium ${
              filter === source ? 'text-white' : 'text-gray-400 hover:text-white'
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

      {filteredNews.length === 0 ? (
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
            {filteredNews.map((article, index) => {
              const formattedDate = new Date(article.pubDate).toLocaleString('sl-SI')
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
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="text-sm text-purple-400 font-semibold mb-1">
                      {article.source}
                    </div>
                    <h2 className="text-base font-semibold mb-2 leading-tight">
                      {article.title}
                    </h2>
                    <p className="text-sm text-gray-300 line-clamp-4 mb-2">
                      {article.contentSnippet}
                    </p>
                    {/* namesto „Preberi več“ prikažemo datum in uro objave */}
                    <span className="mt-auto text-sm text-gray-400">
                      {formattedDate}
                    </span>
                  </div>
                </a>
              )
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </main>
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
