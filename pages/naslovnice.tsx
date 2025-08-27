// pages/naslovnice.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ArticleCard from '@/components/ArticleCard'
import SeoHead from '@/components/SeoHead'

export default function NaslovnicePage() {
  const [allNews, setAllNews] = useState<NewsItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        const data = await fetchRSSFeeds()
        if (!isMounted) return
        setAllNews(data ?? [])
      } catch (e: any) {
        console.error(e)
        if (isMounted) setError('Napaka pri nalaganju novic.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  const headlines = useMemo(() => {
    if (!allNews) return []

    // izberi prvo (najbolj svežo) za vsak vir
    const bySource = new Map<string, NewsItem>()
    for (let i = 0; i < allNews.length; i++) {
      const item = allNews[i]
      if (!bySource.has(item.source)) {
        bySource.set(item.source, item)
      }
    }

    // pretvori v array (brez for..of nad iteratorjem)
    const picked = Array.from(bySource.values())

    // izloči dvojnike po URL-ju
    const seen = new Set<string>()
    const deduped: NewsItem[] = []
    for (let i = 0; i < picked.length; i++) {
      const n = picked[i]
      if (!seen.has(n.link)) {
        seen.add(n.link)
        deduped.push(n)
      }
    }

    // uredi po datumu (novejše najprej)
    deduped.sort((a, b) => {
      const da = new Date(a.isoDate ?? a.pubDate ?? 0).getTime()
      const db = new Date(b.isoDate ?? b.pubDate ?? 0).getTime()
      return db - da
    })

    return deduped
  }, [allNews])

  return (
    <>
      <SeoHead
        title="Naslovnice · Križišče"
        description="Izpostavljene naslovne novice iz vseh virov na Križišču."
        url="https://krizisce.si/naslovnice"
        image="/og.png"
      />

      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-6 pb-10">
        <h1 className="text-2xl font-semibold mb-2">Naslovnice</h1>
        <p className="text-gray-400 mb-6">
          Po ena izpostavljena (najbolj sveža) novica za vsak vir.
        </p>

        {loading && <div className="text-gray-400">Nalaganje naslovnic …</div>}
        {error && <div className="text-red-400">{error}</div>}

        {!loading && !error && headlines.length === 0 && (
          <div className="text-gray-400">Trenutno ni podatkov.</div>
        )}

        {!loading && !error && headlines.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {headlines.map((news) => (
              <ArticleCard key={news.link} news={news} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}
