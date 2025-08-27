// pages/naslovnice.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeoHead from '@/components/SeoHead'
import { NewsItem } from '@/types'

type ApiNews = NewsItem[]

// Velika kartica za "naslovnice" – namerno plain <img> zaradi hitrosti (Gregorjeva preferenca)
function HeadlineCard({ news }: { news: NewsItem }) {
  const onClick = async () => {
    // takoj odpri vir
    window.open(news.link, '_blank')

    // asinhrono zabeleži klik v Supabase (obstojeci API)
    try {
      await fetch('/api/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: news.source, url: news.link }),
      })
    } catch (err) {
      console.error('Napaka pri beleženju klika:', err)
    }
  }

  // vzemi sliko, če jo imamo (iz description/og ali enclosure v NewsItem)
  const img =
    (news as any).image ||
    (news as any).enclosure?.url ||
    (news as any).thumbnail ||
    null

  return (
    <article
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-700 hover:shadow-lg transition-all duration-200 bg-gray-900/40"
    >
      {img ? (
        <div className="aspect-[16/9] w-full overflow-hidden">
          {/* navadna <img> za hitro nalaganje, brez next/image optimizacije */}
          <img
            src={img}
            alt={news.title ?? 'Naslovnica'}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] w-full bg-gray-800" />
      )}

      <div className="p-4 sm:p-5">
        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">
          {news.source}
        </div>
        <h2 className="text-lg sm:text-xl font-semibold leading-snug group-hover:underline">
          {news.title}
        </h2>

        {/* Kratek opis/izvleček, če obstaja */}
        {news.contentSnippet && (
          <p className="mt-2 text-sm text-gray-300 line-clamp-3">
            {news.contentSnippet}
          </p>
        )}

        <div className="mt-3 text-xs text-gray-400">
          {new Date(news.isoDate || news.pubDate || Date.now()).toLocaleString('sl-SI')}
        </div>
      </div>
    </article>
  )
}

export default function NaslovnicePage() {
  const [allNews, setAllNews] = useState<NewsItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    // ⚠️ Namesto lib/fetchRSSFeeds tukaj beremo direktno iz API-ja,
    // da na clientu vedno dobimo podatke. (Razlog, da prej ni bilo nič:
    // tvoja lib funkcija lahko vrne null na clientu glede na nastavitve/parametre.)
    const load = async () => {
      try {
        const res = await fetch('/api/news')
        if (!res.ok) throw new Error('API /api/news ni vrnil 200')
        const payload: ApiNews = await res.json()
        if (alive) setAllNews(payload ?? [])
      } catch (e: any) {
        console.error(e)
        if (alive) setError('Napaka pri nalaganju novic.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [])

  // izberi točno 1 najnovejšo novico za vsak vir
  const headlines = useMemo(() => {
    if (!allNews || allNews.length === 0) return []

    // sort najprej (novejše spredaj)
    const sorted = [...allNews].sort((a, b) => {
      const da = new Date(a.isoDate ?? a.pubDate ?? 0).getTime()
      const db = new Date(b.isoDate ?? b.pubDate ?? 0).getTime()
      return db - da
    })

    const picked = new Map<string, NewsItem>()
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i]
      const key = item.source || 'Unknown'
      if (!picked.has(key)) picked.set(key, item) // prva (najbolj sveža) za vir
    }

    // v array brez for..of nad iteratorjem (kompatibilno z TS targetom)
    const arr = Array.from(picked.values())

    // odstrani dvojnike po URL (za vsak slučaj)
    const seen = new Set<string>()
    const dedup: NewsItem[] = []
    for (let i = 0; i < arr.length; i++) {
      const n = arr[i]
      if (!seen.has(n.link)) {
        seen.add(n.link)
        dedup.push(n)
      }
    }

    return dedup
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

      <main className="max-w-6xl mx-auto px-4 pt-6 pb-12">
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
          // Velik, pregleden pogled: 1 kolona mob, 2 tablet, 3 desktop
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {headlines.map((n) => (
              <HeadlineCard key={n.link} news={n} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}
