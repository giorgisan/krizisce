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

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })

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
      .limit(120)

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
  const maxFresh = fresh.reduce((a, n) => Math.max(a, n.publishedAt || 0), 0)
  const hasNewer = maxFresh > maxCurrent + NEWNESS_GRACE_MS
  return { newLinks, hasNewer }
}

const LS_FIRST_SEEN = 'krizisce_first_seen_v1'
type FirstSeenMap = Record<string, number>
function loadFirstSeen(): FirstSeenMap {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(LS_FIRST_SEEN) || '{}')
  } catch {
    return {}
  }
}
function saveFirstSeen(map: FirstSeenMap) {
  try {
    window.localStorage.setItem(LS_FIRST_SEEN, JSON.stringify(map))
  } catch {}
}

/* ---- Časovni format ---- */
function formatDisplayTime(publishedAt?: number, iso?: string, compact = false) {
  const ms = publishedAt ?? (iso ? Date.parse(iso) : 0)
  if (!ms) return ''
  const diff = Date.now() - ms
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(min / 60)
  if (compact) {
    if (diff < 60_000) return 'sek'
    if (min < 60) return `${min} m`
    if (hr < 24) return `${hr} h`
  } else {
    if (diff < 60_000) return 'pred nekaj sekundami'
    if (min < 60) return `pred ${min} min`
    if (hr < 24) return `pred ${hr} h`
  }
  const d = new Date(ms)
  const date = new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'short' }).format(d)
  const time = new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(d)
  return compact ? `${date} ${time}` : `${date}, ${time}`
}

/* ================= Preview ================= */
type PreviewProps = { url: string; onClose: () => void }
const ArticlePreview = dynamic(() => import('@/components/ArticlePreview'), { ssr: false }) as React.ComponentType<PreviewProps>

/* ================= Page ================= */

type Props = { initialNews: NewsItem[] }
type ViewMode = 'grid' | 'list'

export default function Home({ initialNews }: Props) {
  const [news, setNews] = useState<NewsItem[]>(initialNews)
  const [selectedSource, setSelectedSource] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('selectedSources')
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) && arr[0] ? String(arr[0]) : 'Vse'
    } catch {
      return 'Vse'
    }
  })
  const deferredSource = useDeferredValue(selectedSource)

  const [view, setView] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem('viewMode') as ViewMode) || 'grid'
    } catch {
      return 'grid'
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('viewMode', view)
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('ui:view-state', { detail: { view } }))
    } catch {}
  }, [view])

  useEffect(() => {
    const onToggle = () => setView(v => (v === 'grid' ? 'list' : 'grid'))
    window.addEventListener('ui:toggle-view', onToggle as EventListener)
    return () => window.removeEventListener('ui:toggle-view', onToggle as EventListener)
  }, [])

  const [filterOpen, setFilterOpen] = useState<boolean>(false)
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    if (isMobile) setFilterOpen(true)
    const onToggle = () => {
      const mobile = window.matchMedia('(max-width: 767px)').matches
      if (mobile) {
        setFilterOpen(true)
        return
      }
      setFilterOpen(v => !v)
    }
    window.addEventListener('ui:toggle-filters', onToggle as EventListener)
    return () => window.removeEventListener('ui:toggle-filters', onToggle as EventListener)
  }, [])

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

  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      const fresh = await loadNews(ctrl.signal)
      if (fresh && fresh.length) {
        const currentLinks = new Set(initialNews.map(n => n.link))
        const hasNewLink = fresh.some(n => n.link && !currentLinks.has(n.link))
        if (hasNewLink) startTransition(() => setNews(fresh))
      }
      kickSyncIfStale(5 * 60_000)
    })()
    return () => ctrl.abort()
  }, [initialNews])

  /* ========== LIST HEADER (compact) ========== */
  function ListHeader() {
    return (
      <div className="sticky top-[var(--hdr-h,56px)] z-20 bg-white dark:bg-gray-900 border-b border-gray-200/70 dark:border-gray-700/60">
        <div className="grid grid-cols-[64px_1fr_auto] sm:grid-cols-[76px_1fr_auto] md:grid-cols-[88px_1fr_auto]
                        px-2.5 sm:px-3 h-9 items-center text-[11px] sm:text-[12px] uppercase tracking-wide
                        text-gray-500 dark:text-gray-400">
          <span>Čas</span>
          <span>Naslov</span>
          <span className="justify-self-end pr-1.5 sm:pr-2">Vir</span>
        </div>
      </div>
    )
  }

  /* ========== LIST ROW (ultra-compact, oko ob naslovu) ========== */
  function ListRow({ item }: { item: NewsItem }) {
    const [showPreview, setShowPreview] = useState(false)
    const isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || (navigator as any).maxTouchPoints > 0)
    const longPressTimer = useRef<number | null>(null)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
      const m = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
      setIsMobile(!!m)
    }, [])

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
      if (longPressTimer.current) {
        window.clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    return (
      <>
        <li className="group grid grid-cols-[64px_1fr_auto] sm:grid-cols-[76px_1fr_auto] md:grid-cols-[88px_1fr_auto]
                       items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 h-9 md:h-10
                       hover:bg-black/[0.03] dark:hover:bg-white/[0.045] transition-colors">
          <span className="text-[12px] text-gray-500 dark:text-gray-400 tabular-nums">
            {formatDisplayTime(item.publishedAt, item.isoDate, isMobile)}
          </span>

          <div className="min-w-0 flex items-center gap-1.5">
            <a
              href={item.link}
              target="_blank"
              rel="noopener"
              onClick={onClickLink}
              onAuxClick={onClickLink as any}
              onTouchStart={onTouchStart}
              onTouchEnd={clearLong}
              onTouchMove={clearLong}
              className={`flex-1 min-w-0 text-[15px] leading-snug
                          ${isMobile ? 'line-clamp-2' : 'truncate'}
                          text-gray-900 dark:text-gray-100 group-hover:text-brand`}
            >
              {item.title}
            </a>
            <button
              type="button"
              aria-label="Predogled"
              title="Predogled"
              onClick={() => setShowPreview(true)}
              className="hidden sm:inline-flex shrink-0 items-center justify-center h-7 w-7 rounded-md
                         text-gray-600/70 dark:text-gray-300/70 opacity-35 group-hover:opacity-95 transition
                         hover:ring-1 hover:ring-black/10 dark:hover:ring-white/20"
            >
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </button>
          </div>

          <span className="ml-1 text-[12px] text-gray-600 dark:text-gray-300 inline-flex items-center gap-1.5 justify-self-end pr-1.5 sm:pr-2">
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

  /* ========== RENDER PAGE ========== */
  return (
    <>
      <Header />
      <SourceFilter
        value={selectedSource}
        onChange={next => {
          startTransition(() => {
            setSelectedSource(next)
            setHasMore(true)
            setCursor(null)
          })
        }}
        open={filterOpen}
      />
      <SeoHead title="Križišče" description="Agregator najnovejših novic iz slovenskih medijev." />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-4 pb-24">
        <AnimatePresence mode="wait">
          {view === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
            >
              {news.slice(0, displayCount).map((article, i) => (
                <ArticleCard key={article.link} news={article} priority={i === 0} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-6xl mx-auto w-full"
            >
              <div className="rounded-lg ring-1 ring-black/5 dark:ring-white/10 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm">
                <ListHeader />
                <ul className="divide-y divide-gray-200/70 dark:divide-gray-700/60">
                  {news.slice(0, displayCount).map(item => (
                    <ListRow key={item.link} item={item} />
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
    published_at: string | null   // timestamptz (ISO string)
    publishedat: number | null    // bigint (ms)
  }

  // 🔧 nujno vključimo published_at in publishedat
  const { data, error } = await supabase
    .from('news')
    .select('id, link, title, source, summary, contentsnippet, image, published_at, publishedat')
    .order('publishedat', { ascending: false })
    .limit(120)

  if (error) {
    // V najslabšem primeru vrni prazno, da build ne pade
    return { props: { initialNews: [] as NewsItem[] }, revalidate: 60 }
  }

  const rows = (data ?? []) as Row[]

  const initialNews: NewsItem[] = rows.map((r) => ({
    title: r.title,
    link: r.link,
    source: r.source,
    contentSnippet: r.contentsnippet ?? r.summary ?? '',
    image: r.image ?? null,
    // ⬇️ izračun obveznega publishedAt (ms)
    publishedAt: (r.publishedat ?? (r.published_at ? Date.parse(r.published_at) : 0)) || 0,
    // ⬇️ ISO string, če obstaja
    isoDate: r.published_at || undefined,
  }))

  return { props: { initialNews }, revalidate: 60 }
}
