// /pages/index.tsx
import Head from 'next/head'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ArticleCard from '@/components/ArticleCard'
import { useEffect, useState } from 'react'

type Article = {
  title: string
  link: string
  pubDate: string
  source: string
  image?: string
}

type NewsBySource = Record<string, Article[]>

export default function Home() {
  const [newsBySource, setNewsBySource] = useState<NewsBySource>({})
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'bySource' | 'byTime'>('byTime')

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news')
        const data = await res.json()
        setNewsBySource(data)
      } catch (err) {
        console.error('Napaka pri nalaganju novic:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('sl-SI', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    })

  const allArticlesSorted = Object.values(newsBySource)
    .flat()
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  return (
    <>
      <Head>
        <title>Agregator Danes</title>
      </Head>
      <Header />
      <main className="px-4 py-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <h1 className="text-4xl font-bold text-center sm:text-left">🗞️ Zadnje novice v slovenskih medijih</h1>
          <button
            onClick={() => setViewMode(viewMode === 'bySource' ? 'byTime' : 'bySource')}
            className="self-center sm:self-auto px-4 py-2 border border-gray-400 dark:border-gray-600 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {viewMode === 'bySource' ? '📅 Prikaži po času' : '📚 Prikaži po virih'}
          </button>
        </div>

        {loading && <p className="text-center text-gray-400">Nalagam novice ...</p>}

        {!loading && Object.keys(newsBySource).length === 0 && (
          <p className="text-center text-red-500">Ni uspelo naložiti novic.</p>
        )}

        {viewMode === 'byTime' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {allArticlesSorted.map((item, index) => (
              <ArticleCard
                key={`${item.source}-${index}`}
                title={item.title}
                summary=""
                source={item.source}
                time={formatTime(item.pubDate)}
                url={item.link}
                image={item.image}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-14">
            {Object.entries(newsBySource).map(([source, articles]) => (
              <section key={source}>
                <h2 className="text-2xl font-bold mb-4">{source}</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {articles.map((item, index) => (
                    <ArticleCard
                      key={`${source}-${index}`}
                      title={item.title}
                      summary=""
                      source={item.source}
                      time={formatTime(item.pubDate)}
                      url={item.link}
                      image={item.image}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
