// pages/index.tsx
import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'

const SOURCES = [
  'Vse',
  'RTVSLO',
  '24ur',
  'Siol.net',
  'Slovenske novice',
  'Delo',
  'Zurnal24',
  'Dnevnik',
  'Finance',
  'N1',
  'Svet24',
]

type Props = {
  initialNews: NewsItem[]
}

export default function Home({ initialNews }: Props) {
  const [filter, setFilter] = useState<string>('Vse')
  const [displayCount, setDisplayCount] = useState<number>(20)

  // sortiranje novic po datumu (najprej najnovejše)
  const sortedNews = useMemo(() => {
    return [...initialNews].sort(
      (a, b) =>
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    )
  }, [initialNews])

  // filtriranje po izbranem viru
  const filteredNews =
    filter === 'Vse'
      ? sortedNews
      : sortedNews.filter((article) => article.source === filter)

  // seznam novic, ki jih prikazujemo
  const visibleNews = filteredNews.slice(0, displayCount)

  // funkcija za nalaganje več novic
  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 20)
  }

  return (
    <>
      <main className="min-h-screen bg-gray-900 text-white px-4 md:px-8 lg:px-16 py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4"> Križišče</h1>
        <p className="text-gray-400 mb-6">
          Najnovejše novice slovenskih medijev
        </p>

        {/* STICKY filter bar z “glass” efektom */}
        <div
          className="sticky top-0 z-40 bg-gray-900/70 backdrop-blur-md backdrop-saturate-150 py-2 mb-6 flex gap-3 overflow-x-auto whitespace-nowrap border-b border-gray-800"
        >
          {SOURCES.map((source) => (
            <button
              key={source}
              onClick={() => {
                setFilter(source)
                setDisplayCount(20) // reset ob spremembi filtra
              }}
              className={`relative px-4 py-1 rounded-full transition font-medium ${
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

        {/* Prikaz novic */}
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
                const formattedDate = new Date(
                  article.pubDate
                ).toLocaleString('sl-SI')
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
                        loading="lazy"
                      />
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      {/* Vir in datum/ura, prilagojeno za mobilne naprave */}
                      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-1">
                        <span className="text-sm text-purple-400 font-semibold">
                          {article.source}
                        </span>
                        <span className="text-xs text-gray-400 mt-1 sm:mt-0 sm:ml-2">
                          {formattedDate}
                        </span>
                      </div>
                      {/* Naslov omejen na 2 vrsti */}
                      <h2 className="text-base font-semibold mb-1 leading-tight line-clamp-2">
                        {article.title}
                      </h2>
                      {/* Povzetek v temnejši barvi, omejen na 3 vrstice */}
                      <p className="text-sm text-gray-400 line-clamp-3">
                        {article.contentSnippet}
                      </p>
                    </div>
                  </a>
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Gumb za nalaganje več novic */}
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

      {/* Footer s povezavami in kontaktnimi informacijami */}
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
