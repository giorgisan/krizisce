// pages/naslovnice.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ArticleCard from '@/components/ArticleCard'
import SeoHead from '@/components/SeoHead'

/**
 * Minimalna logika "naslovnic":
 * - naložimo vse novice (isti fetch kot na /)
 * - za vsak vir (news.source) vzamemo prvo (najbolj svežo) novico
 * - opcijsko izločimo dvojnike po URL-ju
 *
 * Če boš želel kasneje bolj natančno "front-page" logiko,
 * lahko v lib/sources.ts dodaš npr. `headlineFeed` za posamezen vir
 * in tukaj posebej prebereš te vire. Zaenkrat pa MVP deluje brez sprememb drugod.
 */

export default function NaslovnicePage() {
  const [allNews, setAllNews] = useState<NewsItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        const data = await fetchRSSFeeds(false)
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

    // ohranimo samo prvo (najbolj svežo) novico za vsak vir
    const bySource = new Map<string, NewsItem>()
    for (const item of allNews) {
      if (!bySource.has(item.source)) {
        bySource.set(item.source, item)
      }
    }

    // izločimo dvojnike po URL-ju (za vsak slučaj)
    const seenUrls = new Set<string>()
    const unique = []
    for (const n of bySource.values()) {
      if (!seenUrls.has(n.link)) {
        seenUrls.add(n.link)
        unique.push(n)
      }
    }

    // uredi po datumu (novejše najprej)
    unique.sort((a, b) => {
      const da = new Date(a.isoDate ?? a.pubDate ?? 0).getTime()
      const db = new Date(b.isoDate ?? b.pubDate ?? 0).getTime()
      return db - da
    })

    return unique
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

        {loading && (
          <div className="text-gray-400">Nalaganje naslovnic …</div>
        )}

        {error && (
          <div className="text-red-400">{error}</div>
        )}

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
