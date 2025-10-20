// pages/index.tsx
'use client'

import React, {
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
  startTransition,
  useRef,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { NewsItem } from '@/types'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import ArticleCard from '@/components/ArticleCard'
import SeoHead from '@/components/SeoHead'
import BackToTop from '@/components/BackToTop'
import SourceFilter from '@/components/SourceFilter'

/* ================= Helpers & constants ================= */

const POLL_MS = 60_000
const HIDDEN_POLL_MS = 5 * 60_000
const POLL_MAX_BACKOFF = 5

const SYNC_KEY = 'krizisce_last_sync_ms'
async function kickSyncIfStale(maxAgeMs = 5 * 60_000) {
  try {
    const now = Date.now()
    const last = Number(localStorage.getItem(SYNC_KEY) || '0')
    if (!last || now - last > maxAgeMs) {
      fetch('/api/news?forceFresh=1', { cache: 'no-store', keepalive: true }).catch(() => {})
      localStorage.setItem(SYNC_KEY, String(now))
    }
  } catch {}
}

function timeout(ms: number) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error('Request timeout')), ms))
}

/**
 * Primarni klic gre na naš /api/news (Vercel).
 * Če pade/timeouta → fallback: direktno na Supabase (anon key).
 */
async function loadNews(signal?: AbortSignal): Promise<NewsItem[] | null> {
  // 1) prek Vercela
  try {
    const res = (await Promise.race([
      fetch('/api/news', { cache: 'no-store', signal }),
      timeout(12_000),
    ])) as Response
    if (res.ok) {
      const data: NewsItem[] = await res.json()
      if (Array.isArray(data) && data.length) return data
    }
  } catch {}

  // 2) fallback: direkt Supabase
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })

    type Row = {
      link: string
      title: string
      source: string
      contentsnippet: string | null
      summary: string | null
      image: string | null
      published_at: string | null
      publishedat: number | null
    }

    const { data, error } = await supabase
      .from('news')
      .select('link,title,source,contentsnippet,summary,image,published_at,publishedat')
      .order('publishedat', { ascending: false })
      .limit(60)

    if (error || !data) return null

    const items: NewsItem[] = (data as Row[]).map(r => ({
      title: r.title,
      link: r.link,
      source: r.source,
      contentSnippet: r.contentsnippet ?? r.summary ?? '',
      image: r.image ?? null,
      publishedAt: (r.publishedat ?? (r.published_at ? Date.parse(r.published_at) : 0)) || 0,
      isoDate: r.published_at,
    }))

    return items.length ? items : null
  } catch {
    return null
  }
}

const NEWNESS_GRACE_MS = 30_000
const diffFresh = (fresh: NewsItem[], current: NewsItem[]) => {
  if (!fresh?.length) return { newLinks: 0, hasNewer: false }
  const curSet = new Set(current.map(n => n.link))
  const newLinks = fresh.filter(n => !curSet.has(n.link)).length
  const maxCurrent = current.reduce((a, n) => Math.max(a, n.publishedAt || 0), 0)
  const maxFresh   = fresh.reduce((a, n) => Math.max(a, n.publishedAt || 0), 0)
  const hasNewer   = maxFresh > maxCurrent + NEWNESS_GRACE_MS
  return { newLinks, hasNewer }
}

// stableAt
const LS_FIRST_SEEN = 'krizisce_first_seen_v1'
type FirstSeenMap = Record<string, number>
function loadFirstSeen(): FirstSeenMap {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(window.localStorage.getItem(LS_FIRST_SEEN) || '{}') } catch { return {} }
}
function saveFirstSeen(map: FirstSeenMap) {
  try { window.localStorage.setItem(LS_FIRST_SEEN, JSON.stringify(map)) } catch {}
}

/* ================= Page ================= */

type Props = { initialNews: NewsItem[] }

export default function Home({ initialNews }: Props) {
  const [news, setNews] = useState<NewsItem[]>(initialNews)

  // Single-select filter
  const [selectedSource, setSelectedSource] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('selectedSources')
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) && arr[0] ? String(arr[0]) : 'Vse'
    } catch { return 'Vse' }
  })
  const deferredSource = useDeferredValue(selectedSource)

  // filter vrstica (toggle iz Headerja)
  const [filterOpen, setFilterOpen] = useState<boolean>(false)
  useEffect(() => {
    const onToggle = () => setFilterOpen(v => !v)
    window.addEventListener('ui:toggle-filters', onToggle as EventListener)
    try {
      const u = new URL(window.location.href)
      if (u.searchParams.get('filters') === '1') setFilterOpen(true)
    } catch {}
    return () => window.removeEventListener('ui:toggle-filters', onToggle as EventListener)
  }, [])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ui:filters-state', { detail: { open: filterOpen } }))
  }, [filterOpen])

  const [displayCount, setDisplayCount] = useState(20)
  const [firstSeen, setFirstSeen] = useState<FirstSeenMap>(() => loadFirstSeen())
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<number | null>(null)

  // initial refresh
  const [bootRefreshed, setBootRefreshed] = useState(false)
  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      const fresh = await loadNews(ctrl.signal)
      if (fresh && fresh.length) {
        const currentLinks = new Set(initialNews.map(n => n.link))
        const hasNewLink = fresh.some(n => n.link && !currentLinks.has(n.link))
        if (hasNewLink) startTransition(() => { setNews(fresh); setDisplayCount(20) })
      }
      kickSyncIfStale(5 * 60_000)
      setBootRefreshed(true)
    })()
    return () => ctrl.abort()
  }, [initialNews])

  // polling
  const [freshNews, setFreshNews] = useState<NewsItem[] | null>(null)
  const missCountRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!bootRefreshed) return
    const runCheck = async () => {
      kickSyncIfStale(10 * 60_000)
      const ctrl = new AbortController()
      const fresh = await loadNews(ctrl.signal)
      if (!fresh || fresh.length === 0) {
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        missCountRef.current = Math.min(POLL_MAX_BACKOFF, missCountRef.current + 1)
        return
      }
      const { newLinks, hasNewer } = diffFresh(fresh, news)
      setFreshNews(fresh)
      if (hasNewer && newLinks > 0) {
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: true }))
        missCountRef.current = 0
      } else {
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        missCountRef.current = Math.min(POLL_MAX_BACKOFF, missCountRef.current + 1)
      }
    }
    const schedule = () => {
      const hidden = document.visibilityState === 'hidden'
      const base = hidden ? HIDDEN_POLL_MS : POLL_MS
      const extra = missCountRef.current * 10_000
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = window.setInterval(runCheck, base + extra) as unknown as number
    }
    runCheck(); schedule()
    const onVis = () => { if (document.visibilityState === 'visible') runCheck(); schedule() }
    document.addEventListener('visibilitychange', onVis)
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); document.removeEventListener('visibilitychange', onVis) }
  }, [news, bootRefreshed])

  // manual refresh
  useEffect(() => {
    const onRefresh = () => {
      window.dispatchEvent(new CustomEvent('news-refreshing', { detail: true }))
      startTransition(() => {
        const finish = () => {
          window.dispatchEvent(new CustomEvent('news-refreshing', { detail: false }))
          window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
          missCountRef.current = 0
          setHasMore(true); setCursor(null); setDisplayCount(20)
        }
        if (freshNews) { setNews(freshNews); finish() }
        else loadNews().then((fresh) => { if (fresh && fresh.length) setNews(fresh); finish() })
      })
    }
    window.addEventListener('refresh-news', onRefresh as EventListener)
    return () => window.removeEventListener('refresh-news', onRefresh as EventListener)
  }, [freshNews])

  // stableAt shaping
  const shapedNews = useMemo(() => {
    const map = { ...firstSeen }; let changed = false
    const withStable = news.map(n => {
      const published = typeof n.publishedAt === 'number' ? n.publishedAt : 0
      const link = n.link || ''
      if (link && map[link] == null) { map[link] = published || Date.now(); changed = true }
      const first = map[link] ?? published
      const stableAt = Math.min(first || Infinity, published || Infinity)
      return { ...n, stableAt } as NewsItem & { stableAt: number }
    })
    if (changed) { setFirstSeen(map); saveFirstSeen(map) }
    return withStable
  }, [news, firstSeen])

  // filter + sort + paginate
  const sortedNews = useMemo(() => [...shapedNews].sort((a, b) => (b as any).stableAt - (a as any).stableAt), [shapedNews])
  const filteredNews = useMemo(() => deferredSource === 'Vse' ? sortedNews : sortedNews.filter(a => a.source === deferredSource), [sortedNews, deferredSource])
  const visibleNews = useMemo(() => filteredNews.slice(0, displayCount), [filteredNews, displayCount])

  // cursor calc
  useEffect(() => {
    if (!filteredNews.length) { setCursor(null); setHasMore(true); return }
    const minMs = filteredNews.reduce((acc, n) => Math.min(acc, n.publishedAt || acc), filteredNews[0].publishedAt || 0)
    setCursor(minMs || null)
  }, [deferredSource, news])

  // paging
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  type PagePayload = { items: NewsItem[]; nextCursor: number | null }
  async function fetchPage(params: { cursor?: number | null; limit?: number; source?: string | null }): Promise<PagePayload> {
    const { cursor, limit = 40, source } = params
    const qs = new URLSearchParams()
    qs.set('paged', '1'); qs.set('limit', String(limit))
    if (cursor != null) qs.set('cursor', String(cursor))
    if (source && source !== 'Vse') qs.set('source', source)
    const res = await fetch(`/api/news?${qs.toString()}`, { cache: 'no-store' })
    if (!res.ok) return { items: [], nextCursor: null }
    const data = (await res.json()) as PagePayload
    if (!data || !Array.isArray(data.items)) return { items: [], nextCursor: null }
    return data
  }
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || cursor == null || cursor <= 0) return
    setIsLoadingMore(true)
    try {
      const { items, nextCursor } = await fetchPage({ cursor, limit: 40, source: deferredSource })
      const seen = new Set(news.map(n => n.link))
      const fresh = items.filter(i => !seen.has(i.link))
      if (fresh.length) { setNews(prev => [...prev, ...fresh]); setDisplayCount(prev => prev + fresh.length) }
      if (!nextCursor || nextCursor === cursor || items.length === 0) { setHasMore(false); setCursor(null) }
      else { setCursor(nextCursor); setHasMore(true) }
    } finally { setIsLoadingMore(false) }
  }

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const motionDuration = prefersReducedMotion ? 0.08 : 0.14

  return (
    <>
      <Header />

      <SourceFilter
        value={selectedSource}
        onChange={(next) => {
          startTransition(() => {
            setSelectedSource(next)
            setDisplayCount(20)
            setHasMore(true)
            setCursor(null)
          })
        }}
        open={filterOpen}
      />

      <SeoHead title="Križišče" description="Agregator najnovejših novic iz slovenskih medijev. Članki so last izvornih portalov." />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-4 pb-24">
        {visibleNews.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center w-full mt-10">Ni novic za izbrani vir ali napaka pri nalaganju.</p>
        ) : (
          <AnimatePresence>
            <motion.div
              key={deferredSource}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: motionDuration }}
              className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
            >
              {visibleNews.map((article, i) => (
                <ArticleCard key={article.link} news={article as any} priority={i === 0} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {hasMore && (
          <div className="text-center mt-8 mb-10">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-5 py-2 bg-brand text-white rounded-full hover:bg-brand-hover transition disabled:opacity-60"
            >
              {isLoadingMore ? 'Nalagam…' : 'Naloži več'}
            </button>
          </div>
        )}

        <hr className="max-w-6xl mx-auto mt-4 border-t border-gray-200 dark:border-gray-700" />
      </main>

      <BackToTop threshold={200} />
      <Footer />
    </>
  )
}

/* ================= SSG (ISR) ================= */

export async function getStaticProps() {
  const { createClient } = await import('@supabase/supabase-js')
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })

  type Row = {
    id: number
    link: string
    title: string
    source: string
    summary: string | null
    contentsnippet: string | null
    image: string | null
    published_at: string | null
    publishedat: number | null
  }

  const { data } = await supabase
    .from('news')
    .select('id, link, title, source, summary, contentsnippet, image, published_at, publishedat')
    .order('publishedat', { ascending: false })
    .limit(60)

  const rows = (data ?? []) as Row[]

  const initialNews: NewsItem[] = rows.map(r => ({
    title: r.title,
    link: r.link,
    source: r.source,
    contentSnippet: r.contentsnippet ?? r.summary ?? '',
    image: r.image ?? null,
    publishedAt: (r.publishedat ?? (r.published_at ? Date.parse(r.published_at) : 0)) || 0,
    isoDate: r.published_at,
  }))

  return { props: { initialNews }, revalidate: 60 }
}
