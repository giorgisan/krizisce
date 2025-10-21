// pages/index.tsx
'use client'

import React, {
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
  startTransition,
  useRef,
  MouseEvent,
} from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'

import { NewsItem } from '@/types'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import ArticleCard from '@/components/ArticleCard'
import SeoHead from '@/components/SeoHead'
import BackToTop from '@/components/BackToTop'
import SourceFilter from '@/components/SourceFilter'
import { sourceColors } from '@/lib/sources'

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

    const { data } = await supabase
      .from('news')
      .select('link,title,source,contentsnippet,summary,image,published_at,publishedat')
      .order('publishedat', { ascending: false })
      .limit(120) // ↑ več za prvi load

    const items: NewsItem[] = (data || []).map((r: Row) => ({
      title: r.title,
      link: r.link,
      source: r.source,
      contentSnippet: r.contentsnippet ?? r.summary ?? '',
      image: r.image ?? null,
      publishedAt: (r.publishedat ?? (r.published_at ? Date.parse(r.published_at) : 0)) || 0,
      isoDate: r.published_at || undefined,
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

/* ---- Časovni format ---- */
function formatDisplayTime(publishedAt?: number, iso?: string, compact = false) {
  const ms = publishedAt ?? (iso ? Date.parse(iso) : 0)
  if (!ms) return ''
  const diff = Date.now() - ms
  const min  = Math.floor(diff / 60_000)
  const hr   = Math.floor(min / 60)
  if (compact) {
    if (diff < 60_000) return 'sek'
    if (min  < 60)     return `${min} m`
    if (hr   < 24)     return `${hr} h`
  } else {
    if (diff < 60_000) return 'pred nekaj sekundami'
    if (min  < 60)     return `pred ${min} min`
    if (hr   < 24)     return `pred ${hr} h`
  }
  const d    = new Date(ms)
  const date = new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'short' }).format(d)
  const time = new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(d)
  return compact ? `${date} ${time}` : `${date}, ${time}`
}

/* ================= Preview (shared) ================= */
type PreviewProps = { url: string; onClose: () => void }
const ArticlePreview = dynamic(() => import('@/components/ArticlePreview'), { ssr: false }) as React.ComponentType<PreviewProps>

/* ================= Page ================= */

type Props = { initialNews: NewsItem[] }
type ViewMode = 'grid' | 'list'

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

  // ===== VIEW MODE (grid/list) =====
  const [view, setView] = useState<ViewMode>(() => {
    try { return (localStorage.getItem('viewMode') as ViewMode) || 'grid' } catch { return 'grid' }
  })
  useEffect(() => {
    try { localStorage.setItem('viewMode', view) } catch {}
    try { window.dispatchEvent(new CustomEvent('ui:view-state', { detail: { view } })) } catch {}
  }, [view])
  useEffect(() => {
    const onToggle = () => setView(v => (v === 'grid' ? 'list' : 'grid'))
    window.addEventListener('ui:toggle-view', onToggle as EventListener)
    return () => window.removeEventListener('ui:toggle-view', onToggle as EventListener)
  }, [])

  // ===== FILTER vrstica: na mobilnem vedno odprta =====
  const [filterOpen, setFilterOpen] = useState<boolean>(false)
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    if (isMobile) setFilterOpen(true)
    const onToggle = () => {
      const mobile = window.matchMedia('(max-width: 767px)').matches
      if (mobile) { setFilterOpen(true); return }
      setFilterOpen(v => !v)
    }
    window.addEventListener('ui:toggle-filters', onToggle as EventListener)
    return () => window.removeEventListener('ui:toggle-filters', onToggle as EventListener)
  }, [])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ui:filters-state', { detail: { open: filterOpen } }))
  }, [filterOpen])

  // prikazno število
  const [displayCount, setDisplayCount] = useState(40)
  useEffect(() => {
    const w = window.innerWidth
    if (w < 641) setDisplayCount(18)
    else if (w < 1025) setDisplayCount(24)
    else setDisplayCount(40)
  }, [])

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
        if (hasNewLink) startTransition(() => { setNews(fresh) })
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
          setHasMore(true); setCursor(null);
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
  const motionDuration = prefersReducedMotion ? 0.12 : 0.16

  /* ========== LIST HEADER (sticky, kompakt) ========== */
  function ListHeader() {
    return (
      <div
        className="sticky top-[var(--hdr-h,56px)] z-20 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200/80 dark:border-gray-700/70"
      >
        <div
          className="grid grid-cols-[56px_1fr_auto] sm:grid-cols-[76px_1fr_auto] md:grid-cols-[88px_1fr_auto]
                     px-2 sm:px-3 h-9 md:h-10 items-center text-[11px] sm:text-[12px] uppercase tracking-wide
                     text-gray-500 dark:text-gray-400"
        >
          <span>Čas</span>
          <span>Naslov</span>
          <span className="justify-self-end pr-2">Vir</span>
        </div>
      </div>
    )
  }

  /* ========== LIST ROW (zelo gost, “oko” takoj za naslovom; na mob. long-press) ========== */
  function ListRow({ item }: { item: NewsItem }) {
    const [showPreview, setShowPreview] = useState(false)
    const isTouch =
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) || (navigator as any).maxTouchPoints > 0)

    const longPressTimer = useRef<number | null>(null)
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => { setIsMobile(window.matchMedia('(max-width: 640px)').matches) }, [])

    const onClickLink = (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.button === 1) return
      e.preventDefault()
      window.open(item.link, '_blank', 'noopener')
    }

    const onTouchStart = () => {
      if (!isTouch) return
      const id = window.setTimeout(() => setShowPreview(true), 380) as unknown as number
      longPressTimer.current = id
    }
    const clearLong = () => {
      if (longPressTimer.current) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null }
    }

    return (
      <>
        <li
          className="group grid grid-cols-[56px_1fr_auto] sm:grid-cols-[76px_1fr_auto] md:grid-cols-[88px_1fr_auto]
                     items-center gap-1 sm:gap-2 px-2 sm:px-3 h-10 md:h-11
                     hover:bg-black/[0.035] dark:hover:bg-white/[0.05] transition-colors duration-100"
        >
          {/* Čas */}
          <span className="text-[12px] text-gray-500 dark:text-gray-400 tabular-nums">
            {formatDisplayTime(item.publishedAt, item.isoDate, isMobile)}
          </span>

          {/* Naslov + oko (oko takoj za naslovom; na mob. skrito, ker je long-press) */}
          <div className="min-w-0 flex items-center gap-1 sm:gap-2">
            <a
              href={item.link}
              target="_blank"
              rel="noopener"
              onClick={onClickLink}
              onAuxClick={onClickLink as any}
              onTouchStart={onTouchStart}
              onTouchEnd={clearLong}
              onTouchMove={clearLong}
              className={`flex-1 min-w-0 truncate text-[15px] leading-tight text-gray-900 dark:text-gray-100
                          focus:outline-none group-hover:text-brand`}
              title={item.title}
            >
              {item.title}
            </a>

            {/* Oko – na desktopu */}
            <button
              type="button"
              aria-label="Predogled"
              title="Predogled"
              onClick={() => setShowPreview(true)}
              className="hidden sm:inline-flex items-center justify-center h-7 w-7 rounded-md
                         text-gray-600/70 dark:text-gray-300/70 opacity-35 group-hover:opacity-95 transition
                         hover:ring-1 hover:ring-black/10 dark:hover:ring-white/20"
            >
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </button>
          </div>

          {/* Vir */}
          <span className="ml-1 text-[12px] text-gray-600 dark:text-gray-300 inline-flex items-center gap-2 justify-self-end pr-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: (sourceColors as Record<string, string>)[item.source] || '#999' }}
            />
            {item.source}
          </span>
        </li>

        {showPreview && <ArticlePreview url={item.link} onClose={() => setShowPreview(false)} />}
      </>
    )
  }

  return (
    <>
      <Header />

      <SourceFilter
        value={selectedSource}
        onChange={(next) => {
          startTransition(() => {
            setSelectedSource(next)
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
          <AnimatePresence mode="wait">
            {view === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: motionDuration }}
                className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
              >
                {visibleNews.map((article, i) => (
                  <ArticleCard key={article.link} news={article as any} priority={i === 0} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: motionDuration }}
                className="max-w-6xl mx-auto w-full"
              >
                <div className="rounded-lg ring-1 ring-black/5 dark:ring-white/10 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm">
                  <ListHeader />
                  <ul className="divide-y divide-gray-200/70 dark:divide-gray-700/60">
                    {visibleNews.map((item) => (
                      <ListRow key={item.link} item={item} />
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
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
    .limit(120) // ↑ več za prvi load

  const rows = (data ?? []) as Row[]

  const initialNews: NewsItem[] = rows.map(r => ({
    title: r.title,
    link: r.link,
    source: r.source,
    contentSnippet: r.contentsnippet ?? r.summary ?? '',
    image: r.image ?? null,
    publishedAt: (r.publishedat ?? (r.published_at ? Date.parse(r.published_at) : 0)) || 0,
    isoDate: r.published_at || undefined,
  }))

  return { props: { initialNews }, revalidate: 60 }
}
