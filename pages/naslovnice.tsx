// pages/naslovnice.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeoHead from '@/components/SeoHead'
import { NewsItem } from '@/types'

// Velika kartica – ostane enaka
function HeadlineCard({ news }: { news: NewsItem }) {
  const onClick = async () => {
    window.open(news.link, '_blank')
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
        {news.contentSnippet && (
          <p className="mt-2 text-sm text-gray-300 line-clamp-3">{news.contentSnippet}</p>
        )}
        <div className="mt-3 text-xs text-gray-400">
          {new Date(news.isoDate || news.pubDate || Date.now()).toLocaleString('sl-SI')}
        </div>
      </div>
    </article>
  )
}

export default function NaslovnicePage() {
  const [headlines, setHeadlines] = useState<NewsItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch('/api/headlines', { cache: 'no-store' })
        if (!res.ok) throw new Error('API /api/headlines ni vrnil 200')
        const payload: NewsItem[] = await res.json()
        if (alive) setHeadlines(payload ?? [])
      } catch (e: any) {
        console.error(e)
        if (alive) setError('Napaka pri nalaganju naslovnic.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const items = useMemo(() => headlines ?? [], [headlines])

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
          Po ena izpostavljena (headline) novica za vsak vir (z varnim fallbackom).
        </p>

        {loading && <div className="text-gray-400">Nalaganje naslovnic …</div>}
        {error && <div className="text-red-400">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="text-gray-400">Trenutno ni podatkov.</div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((n) => (
              <HeadlineCard key={n.link} news={n} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}
