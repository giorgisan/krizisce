// pages/arhiv.tsx
'use client'

import React, { useEffect, useMemo, useState, startTransition } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeoHead from '@/components/SeoHead'
import ArticleCard from '@/components/ArticleCard'
import { NewsItem } from '@/types'

type ApiItem = {
  id: string
  source: string
  title: string
  link: string
  summary?: string | null
  published_at: string // ISO
}

type ApiPayload =
  | {
      items: ApiItem[]
      counts: Record<string, number>
      total: number
      nextCursor: string | null
    }
  | { error: string }

function toNewsItem(a: ApiItem): NewsItem {
  return {
    title: a.title,
    link: a.link,
    source: a.source,
    summary: a.summary ?? '',
    publishedAt: new Date(a.published_at).getTime(),
    image: undefined,
  } as unknown as NewsItem
}

function yyyymmdd(d: Date) {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const dd = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function ArchivePage() {
  const [date, setDate] = useState<string>(() => yyyymmdd(new Date()))
  const [items, setItems] = useState<ApiItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const news = useMemo(() => items.map(toNewsItem), [items])
  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts])
  const maxCount = useMemo(() => Math.max(1, ...Object.values(counts)), [counts])

  async function fetchDay(d: string) {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/archive?date=${encodeURIComponent(d)}&limit=40`, { cache: 'no-store' })
      const data: ApiPayload = await res.json().catch(() => ({ error: 'Neveljaven odgovor strežnika.' }))
      if (!res.ok || 'error' in data) {
        setItems([])
        setCounts({})
        setNextCursor(null)
        setErrorMsg('Arhiva trenutno ni mogoče naložiti.')
        return
      }
      setItems(Array.isArray(data.items) ? data.items : [])
      setCounts(data.counts ?? {})
      setNextCursor(data.nextCursor ?? null)
    } catch {
      setItems([])
      setCounts({})
      setNextCursor(null)
      setErrorMsg('Napaka pri povezavi do arhiva.')
    } finally {
      setLoading(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setErrorMsg(null)
    try {
      const res = await fetch(
        `/api/archive?date=${encodeURIComponent(date)}&cursor=${encodeURIComponent(nextCursor)}&limit=40`,
        { cache: 'no-store' }
      )
      const data: ApiPayload = await res.json().catch(() => ({ error: 'Neveljaven odgovor strežnika.' }))
      if (!res.ok || 'error' in data) {
        setErrorMsg('Nalaganje dodatnih novic ni uspelo.')
        return
      }
      const seen = new Set(items.map(i => i.link))
      const fresh = (data.items ?? []).filter(i => !seen.has(i.link))
      setItems(prev => [...prev, ...fresh])
      setNextCursor(data.nextCursor ?? null)
    } catch {
      setErrorMsg('Nalaganje dodatnih novic ni uspelo.')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => { fetchDay(date) }, [date])

  return (
    <>
      <Header />
      <SeoHead title="Križišče — Arhiv" description="Pregled novic po dnevih in medijih." />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pb-24 pt-6">
        <section className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl font-semibold">Arhiv</h1>
            <div className="flex items-center gap-3">
              <label htmlFor="date" className="text-sm text-gray-600 dark:text-gray-300">Izberi dan</label>
              <input
                id="date"
                type="date"
                value={date}
                max={yyyymmdd(new Date())}
                onChange={(e) => startTransition(() => setDate(e.target.value))}
                className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur text-sm"
              />
            </div>
          </div>

          {/* napaka */}
          {errorMsg && !loading && (
            <p className="mt-4 text-sm text-red-400">{errorMsg}</p>
          )}

          {/* STATISTIKA */}
          <div className="mt-6 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-900/70 backdrop-blur p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Objave po medijih</h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">Skupaj: {total}</span>
            </div>

            {total === 0 && !loading && !errorMsg && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Za izbrani dan ni podatkov.</p>
            )}

            <div className="mt-3 space-y-2">
              {Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <div key={source} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-sm text-gray-700 dark:text-gray-300">{source}</div>
                    <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-brand dark:bg-brand"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                        aria-hidden
                      />
                    </div>
                    <div className="w-10 text-right text-sm tabular-nums">{count}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* SEZNAM NOVIC */}
          <div className="mt-6">
            {loading ? (
              <p className="text-gray-500 dark:text-gray-400">Nalagam…</p>
            ) : (
              <>
                {news.length === 0 && !errorMsg ? (
                  <p className="text-gray-500 dark:text-gray-400">Ni novic za ta dan.</p>
                ) : null}

                {news.length > 0 && (
                  <div className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                    {news.map((n, i) => (
                      <ArticleCard key={`${n.link}-${i}`} news={n as any} priority={i === 0} />
                    ))}
                  </div>
                )}

                {nextCursor && (
                  <div className="text-center mt-8">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-5 py-2 bg-brand text-white rounded-full hover:bg-brand-hover transition disabled:opacity-60"
                    >
                      {loadingMore ? 'Nalagam…' : 'Naloži več'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
