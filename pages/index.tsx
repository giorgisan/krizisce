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

// -------------------- Helpers & constants --------------------
const POLL_MS = 60_000          // 1 min v ospredju
const HIDDEN_POLL_MS = 5 * 60_000
const POLL_MAX_BACKOFF = 5

const SYNC_KEY = 'krizisce_last_sync_ms'
async function kickSyncIfStale(maxAgeMs = 5 * 60_000) {
  try {
    const now = Date.now()
    const last = Number(localStorage.getItem(SYNC_KEY) || '0')
    if (!last || now - last > maxAgeMs) {
      // Dodamo varnostno glavo (ne obvezna, a pomaga ločiti notranje klice)
      fetch('/api/news?forceFresh=1', {
        cache: 'no-store',
        keepalive: true,
        headers: { 'x-krizisce-ingest': '1' }
      }).catch(() => {})
      localStorage.setItem(SYNC_KEY, String(now))
    }
  } catch {}
}

function timeout(ms: number) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error('Request timeout')), ms))
}

async function loadNews(signal?: AbortSignal): Promise<NewsItem[] | null> {
  try {
    const res = (await Promise.race([
      fetch('/api/news', { cache: 'no-store', signal }),
      timeout(12_000),
    ])) as Response
    const data: NewsItem[] = await res.json()
    return Array.isArray(data) && data.length ? data : null
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

// === stabilni čas objave (immutable) prek localStorage ===
const LS_FIRST_SEEN = 'krizisce_first_seen_v1'
type FirstSeenMap = Record<string, number>
function loadFirstSeen(): FirstSeenMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LS_FIRST_SEEN)
    return raw ? (JSON.parse(raw) as FirstSeenMap) : {}
  } catch { return {} }
}
function saveFirstSeen(map: FirstSeenMap) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(LS_FIRST_SEEN, JSON.stringify(map)) } catch {}
}

// -------------------- Page --------------------
type Props = { initialNews: NewsItem[] }

export default function Home({ initialNews }: Props) {
  const [news, setNews] = useState<NewsItem[]>(initialNews)

  // >>> Multi-select filter (prazno = Vse)
  const [selectedSources, setSelectedSources] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('selectedSources')
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) ? arr : []
    } catch { return [] }
  })
  const deferredSources = useDeferredValue(selectedSources)
  // <<<

  const [displayCount, setDisplayCount] = useState<number>(20)

  // first-seen mapa za stabilni čas
  const [firstSeen, setFirstSeen] = useState<FirstSeenMap>(() => loadFirstSeen())

  // pagination indikatorji
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [cursor, setCursor] = useState<number | null>(null) // ms publishedAt za naslednji batch (starejši od cursor)

  // ---------- Instant refresh on first visit ----------
  const [bootRefreshed, setBootRefreshed] = useState(false)
  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      const fresh = await loadNews(ctrl.signal)
      if (fresh && fresh.length) {
        const currentLinks = new Set(initialNews.map(n => n.link))
        const hasNewLink = fresh.some(n => n.link && !currentLinks.has(n.link))
        if (hasNewLink) {
          startTransition(() => { setNews(fresh); setDisplayCount(20) })
        }
      }
      kickSyncIfStale(5 * 60_000)
      setBootRefreshed(true)
    })()
    return () => ctrl.abort()
  }, [initialNews])
  // ----------------------------------------------------

  // polling (z backoff + visibility)
  const [freshNews, setFreshNews] = useState<NewsItem[] | null>(null)
  const [hasNewBanner, setHasNewBanner] = useState(false)
  const [bannerMode] = useState<'fresh'>('fresh')
  const missCountRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!bootRefreshed) return

    const runCheck = async () => {
      kickSyncIfStale(10 * 60_000)

      const ctrl = new AbortController()
      const fresh = await loadNews(ctrl.signal)
      if (!fresh || fresh.length === 0) {
        setHasNewBanner(false)
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        window.dispatchEvent(new CustomEvent('news-banner-mode', { detail: 'fresh' }))
        missCountRef.current = Math.min(POLL_MAX_BACKOFF, missCountRef.current + 1)
        return
      }

      const { newLinks, hasNewer } = diffFresh(fresh, news)
      setFreshNews(fresh)

      if (hasNewer && newLinks > 0) {
        setHasNewBanner(true)
        window.dispatchEvent(new CustomEvent('news-banner-mode', { detail: 'fresh' }))
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: true }))
        missCountRef.current = 0
      } else {
        setHasNewBanner(false)
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        window.dispatchEvent(new CustomEvent('news-banner-mode', { detail: 'fresh' }))
        missCountRef.current = Math.min(POLL_MAX_BACKOFF, missCountRef.current + 1)
      }
    }

    const schedule = () => {
      const hidden = document.visibilityState === 'hidden'
      const base = hidden ? HIDDEN_POLL_MS : POLL_MS
      const extra = missCountRef.current * 10_000
      const delay = base + extra
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = window.setInterval(runCheck, delay) as unknown as number
    }

    runCheck()
    schedule()

    const onVis = () => { if (document.visibilityState === 'visible') runCheck(); schedule() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [news, bootRefreshed])

  // manual refresh
  useEffect(() => {
    const onRefresh = () => {
      window.dispatchEvent(new CustomEvent('news-refreshing', { detail: true }))
      startTransition(() => {
        const finish = () => {
          window.dispatchEvent(new CustomEvent('news-refreshing', { detail: false }))
          setHasNewBanner(false)
          window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
          missCountRef.current = 0
          setHasMore(true)
          setCursor(null)
          setDisplayCount(20)
        }
        if (freshNews) {
          setNews(freshNews)
          finish()
        } else {
          loadNews().then((fresh) => {
            if (fresh && fresh.length) { setNews(fresh) }
            finish()
          })
        }
      })
    }
    window.addEventListener('refresh-news', onRefresh as EventListener)
    return () => window.removeEventListener('refresh-news', onRefresh as EventListener)
  }, [freshNews])

  // — obogatimo novice s "stableAt" in sproti dopolnimo firstSeen mapo —
  const shapedNews = useMemo(() => {
    const map = { ...firstSeen }
    let changed = false

    const withStable = news.map(n => {
      const published = typeof n.publishedAt === 'number' ? n.publishedAt : 0
      const link = n.link || ''
      if (link && map[link] == null) {
        map[link] = published || Date.now()
        changed = true
      }
      const first = map[link] ?? published
      const stableAt = Math.min(first || Infinity, published || Infinity)
      return { ...n, stableAt } as NewsItem & { stableAt: number }
    })

    if (changed) { setFirstSeen(map); saveFirstSeen(map) }
    return withStable
  }, [news, firstSeen])

  // filter + sort + paginate (client)
  const sortedNews = useMemo(
    () => [...shapedNews].sort((a, b) => (b as any).stableAt - (a as any).stableAt),
    [shapedNews]
  )
  const filteredNews = useMemo(() => {
    if (!deferredSources.length) return sortedNews
    const set = new Set(deferredSources)
    return sortedNews.filter(a => set.has(a.source))
  }, [sortedNews, deferredSources])

  const visibleNews = useMemo(() => filteredNews.slice(0, displayCount), [filteredNews, displayCount])

  // kurzor za “starejše”
  useEffect(() => {
    if (!filteredNews.length) { setCursor(null); setHasMore(true); return }
    const minMs = filteredNews.reduce((acc, n) => Math.min(acc, n.publishedAt || acc), filteredNews[0].publishedAt || 0)
    setCursor(minMs || null)
  }, [deferredSources, news])

  // server paging: če je 1 vir → pošljemo ?source=X; če je več → brez source (client-side filter po prejemu)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  type PagePayload = { items: NewsItem[]; nextCursor: number | null }
  async function fetchPage(params: { cursor?: number | null; limit?: number; source?: string | null }): Promise<PagePayload> {
    const { cursor, limit = 40, source } = params
    const qs = new URLSearchParams()
    qs.set('paged', '1')
    qs.set('limit', String(limit))
    if (cursor != null) qs.set('cursor', String(cursor))
    if (source) qs.set('source', source)
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
      const single = deferredSources.length === 1 ? deferredSources[0] : null
      const { items, nextCursor } = await fetchPage({
        cursor,
        limit: 40,
        source: single,
      })

      // če je več filtrov, filtriramo client-side
      const sourceSet = new Set(deferredSources)
      const itemsFiltered = single ? items : (deferredSources.length ? items.filter(i => sourceSet.has(i.source)) : items)

      const seen = new Set(news.map(n => n.link))
      const fresh = itemsFiltered.filter(i => !seen.has(i.link))

      if (fresh.length) {
        setNews(prev => [...prev, ...fresh])
        setDisplayCount(prev => prev + fresh.length)
      }

      if (!nextCursor || nextCursor === cursor || items.length === 0) {
        setHasMore(false)
        setCursor(null)
      } else {
        setCursor(nextCursor)
        setHasMore(true)
      }
    } finally {
      setIsLoadingMore(false)
    }
  }

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const motionDuration = prefersReducedMotion ? 0.08 : 0.14

  return (
    <>
      <Header />

      {/* Filter (ločena komponenta, multi-select) */}
      <SourceFilter
        values={selectedSources}
        onChange={(next) => {
          startTransition(() => {
            setSelectedSources(next)
            try { localStorage.setItem('selectedSources', JSON.stringify(next)) } catch {}
            setDisplayCount(20)
            setHasMore(true)
            setCursor(null)
          })
        }}
      />

      <SeoHead
        title="Križišče"
        description="Agregator najnovejših novic iz slovenskih medijev. Članki so last izvornih portalov."
      />

      <main
        className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-5 lg:pt-6 pb-24 transform-gpu translate-y-[var(--mob-shift,0px)] md:translate-y-0 transition-transform duration-150 ease-out"
      >
        {visibleNews.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center w-full mt-10">
            Ni novic za izbrane vire ali napaka pri nalaganju.
          </p>
        ) : (
          <AnimatePresence>
            <motion.div
              key={(deferredSources || []).join('|') || 'ALL'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
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

// -------------------- SSG: seed iz Supabase --------------------
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

  const initialNews = rows.map(r => ({
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
