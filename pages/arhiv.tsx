// pages/arhiv.tsx
'use client'

import React, { useEffect, useMemo, useState, startTransition } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeoHead from '@/components/SeoHead'
import { NewsItem } from '@/types'
import { sourceColors } from '@/lib/sources'

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
      fallbackLive?: boolean
    }
  | { error: string }

function toNewsItem(a: ApiItem): NewsItem {
  return {
    title: a.title,
    link: a.link,
    source: a.source,
    summary: a.summary ?? '',
    publishedAt: new Date(a.published_at).getTime(),
  } as unknown as NewsItem
}

function yyyymmdd(d: Date) {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const dd = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// relativni čas: "pred 8 min", "pred 2 h", "pred 1 d"
function relativeTime(ms: number) {
  const diff = Math.max(0, Date.now() - ms)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'pred <1 min'
  if (m < 60) return `pred ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `pred ${h} h`
  const d = Math.floor(h / 24)
  return `pred ${d} d`
}

// HH:mm v naslovu (title)
function fmtClock(ms: number) {
  try {
    return new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms))
  } catch { return '' }
}

// pretvori HEX -> rgba(a)
function hexToRgba(hex: string, alpha = 1) {
  try {
    const h = hex.replace('#', '')
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  } catch { return `rgba(120,120,120,${alpha})` }
}

const A11y = {
  backHome: 'Nazaj na naslovnico',
  pickDay: 'Izberi dan'
}

export default function ArchivePage() {
  const [date, setDate] = useState<string>(() => yyyymmdd(new Date()))
  const [items, setItems] = useState<ApiItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fallbackLive, setFallbackLive] = useState(false)

  const news = useMemo(() => items.map(toNewsItem), [items])

  // odstrani morebitne testne vnose
  const displayCounts = useMemo(() => {
    const entries = Object.entries(counts).filter(([k]) => k !== 'TestVir')
    return Object.fromEntries(entries)
  }, [counts])

  const total = useMemo(
    () => Object.values(displayCounts).reduce((a, b) => a + b, 0),
    [displayCounts]
  )
  const maxCount = useMemo(() => Math.max(1, ...Object.values(displayCounts)), [displayCounts])

  async function fetchDay(d: string) {
    setLoading(true)
    setErrorMsg(null)
    setFallbackLive(false)
    try {
      const res = await fetch(`/api/archive?date=${encodeURIComponent(d)}&limit=40`, { cache: 'no-store' })
      const data: ApiPayload = await res.json().catch(() => ({ error: 'Neveljaven odgovor strežnika.' }))
      if (!res.ok || 'error' in data) {
        setItems([]); setCounts({}); setNextCursor(null); setErrorMsg('Arhiva trenutno ni mogoče naložiti.')
        return
      }
      setItems(Array.isArray(data.items) ? data.items : [])
      setCounts(data.counts ?? {})
      setNextCursor(data.nextCursor ?? null)
      setFallbackLive(Boolean((data as any).fallbackLive))
    } catch {
      setItems([]); setCounts({}); setNextCursor(null); setErrorMsg('Napaka pri povezavi do arhiva.')
    } finally {
      setLoading(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true); setErrorMsg(null)
    try {
      const res = await fetch(
        `/api/archive?date=${encodeURIComponent(date)}&cursor=${encodeURIComponent(nextCursor)}&limit=40`,
        { cache: 'no-store' }
      )
      const data: ApiPayload = await res.json().catch(() => ({ error: 'Neveljaven odgovor strežnika.' }))
      if (!res.ok || 'error' in data) {
        setErrorMsg('Nalaganje dodatnih novic ni uspelo.'); return
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
          {/* toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl font-semibold">Arhiv</h1>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm
                           border border-gray-300/60 dark:border-gray-700/60
                           bg-white/70 dark:bg-gray-800/60 hover:bg-white/90 dark:hover:bg-gray-800/80 transition"
                title={A11y.backHome}
                aria-label={A11y.backHome}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M5 10v10h5v-6h4v6h5V10" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                Nazaj
              </Link>

              <label htmlFor="date" className="sr-only">Izberi dan</label>
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

          {/* napaka ali fallback info */}
          {!loading && errorMsg && (
            <p className="mt-4 text-sm text-red-400">{errorMsg}</p>
          )}
          {!loading && !errorMsg && fallbackLive && (
            <p className="mt-4 text-sm text-amber-400">
              Arhiv za izbrani dan je še prazen. Prikazane so trenutne novice iz živih virov (ne-shranjene).
            </p>
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
              {Object.entries(displayCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <div key={source} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 text-sm text-gray-700 dark:text-gray-300">{source}</div>
                    <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-brand dark:bg-brand"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                        aria-hidden
                      />
                    </div>
                    <div className="w-12 text-right text-sm tabular-nums">{count}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* SEZNAM NOVIC – vrstični, brez slik */}
          <div className="mt-6">
            {loading ? (
              <p className="text-gray-500 dark:text-gray-400">Nalagam…</p>
            ) : (
              <>
                {news.length === 0 && !errorMsg ? (
                  <p className="text-gray-500 dark:text-gray-400">Ni novic za ta dan.</p>
                ) : null}

                {news.length > 0 && (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/60 dark:bg-gray-900/50 overflow-hidden">
                    {news.map((n, i) => {
                      const hex = sourceColors[n.source] || '#7c7c7c'
                      const badgeBg = hexToRgba(hex, 0.15)
                      const badgeBorder = hexToRgba(hex, 0.35)
                      return (
                        <li key={`${n.link}-${i}`} className="px-4 sm:px-5 py-3 flex items-start gap-3">
                          <span
                            className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                            style={{ backgroundColor: badgeBg, color: hex, border: `1px solid ${badgeBorder}` }}
                            title={n.source}
                            aria-label={n.source}
                          >
                            {n.source}
                          </span>
                          <span
                            className="shrink-0 w-20 text-sm text-gray-500 dark:text-gray-400 tabular-nums mt-0.5"
                            title={fmtClock(n.publishedAt ?? Date.now())}
                          >
                            {relativeTime(n.publishedAt ?? Date.now())}
                          </span>
                          <a
                            href={n.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-sm leading-snug text-gray-900 dark:text-gray-100 hover:underline"
                          >
                            {n.title}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
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
