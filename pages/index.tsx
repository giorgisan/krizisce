'use client'

import React, {
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
  startTransition,
  useRef,
} from 'react'
import { GetServerSideProps } from 'next'

import { NewsItem } from '@/types'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import ArticleCard from '@/components/ArticleCard'
import TrendingCard from '@/components/TrendingCard'
import SeoHead from '@/components/SeoHead'
import BackToTop from '@/components/BackToTop'
import SourceFilter from '@/components/SourceFilter'
import NewsTabs from '@/components/NewsTabs'
import { CategoryId, determineCategory } from '@/lib/categories'

/* ================= Helpers & constants ================= */
type Mode = 'latest' | 'trending'
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

async function loadNews(mode: Mode, source: string, category: CategoryId | 'vse', query: string | null, signal?: AbortSignal): Promise<NewsItem[] | null> {
  const qs = new URLSearchParams()
  if (mode === 'trending') qs.set('variant', 'trending')
  if (source !== 'Vse') qs.set('source', source)
  if (category !== 'vse') qs.set('category', category)
  if (query) qs.set('q', query)

  try {
    const res = (await Promise.race([
      fetch(`/api/news?${qs.toString()}`, { cache: 'no-store', signal }),
      timeout(12_000),
    ])) as Response
    if (res.ok) {
      const data: NewsItem[] = await res.json()
      if (Array.isArray(data)) return data
    }
  } catch {}
  
  if (mode === 'latest' && source === 'Vse' && category === 'vse' && !query) {
    return null 
  }
  return null
}

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
  const [itemsLatest, setItemsLatest] = useState<NewsItem[]>(initialNews)
  const [itemsTrending, setItemsTrending] = useState<NewsItem[]>([])
    
  const [mode, setMode] = useState<Mode>('latest')
  const [trendingLoaded, setTrendingLoaded] = useState(false)
  const lastTrendingFetchRef = useRef<number>(0)

  // FILTRI
  const [selectedSource, setSelectedSource] = useState<string>('Vse')
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'vse'>('vse')
  const [searchQuery, setSearchQuery] = useState<string>('') 

  // MODAL CONTROL
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [firstSeen, setFirstSeen] = useState<FirstSeenMap>(() => loadFirstSeen())

  const [bootRefreshed, setBootRefreshed] = useState(false)
    
  useEffect(() => {
    kickSyncIfStale(5 * 60_000)
    setBootRefreshed(true)
  }, [])

  // GLAVNI FETCH (Triggered by Filters/Search)
  useEffect(() => {
    if (!bootRefreshed) return
    if (mode === 'trending') return

    const fetchData = async () => {
        setIsRefreshing(true)
        setCursor(null)
        setHasMore(true)
        
        const fresh = await loadNews('latest', selectedSource, selectedCategory, searchQuery)
        
        if (fresh) {
            setItemsLatest(fresh)
        } else {
            setItemsLatest([])
        }
        setIsRefreshing(false)
    }
    
    const timeoutId = setTimeout(fetchData, searchQuery ? 500 : 0)
    return () => clearTimeout(timeoutId)

  }, [selectedSource, selectedCategory, searchQuery, mode, bootRefreshed])

  // POLLING
  const missCountRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!bootRefreshed) return

    const runCheckSimple = async () => {
      if (mode !== 'latest') return
      if (searchQuery) return 

      kickSyncIfStale(10 * 60_000)
      const fresh = await loadNews('latest', selectedSource, selectedCategory, null)
      
      if (!fresh || fresh.length === 0) {
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        missCountRef.current = Math.min(POLL_MAX_BACKOFF, missCountRef.current + 1)
        return
      }
      const curSet = new Set(itemsLatest.map((n) => n.link))
      const newLinks = fresh.filter((n) => !curSet.has(n.link)).length
      
      if (newLinks > 0) {
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: true }))
        missCountRef.current = 0
      } else {
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        missCountRef.current = Math.min(POLL_MAX_BACKOFF, missCountRef.current + 1)
      }
    }
    const schedule = () => {
      if (mode !== 'latest') return
      const hidden = document.visibilityState === 'hidden'
      const base = hidden ? HIDDEN_POLL_MS : POLL_MS
      const extra = missCountRef.current * 10_000
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = window.setInterval(runCheckSimple, base + extra) as unknown as number
    }
    const initialTimer = setTimeout(runCheckSimple, 10000)
    schedule()
    const onVis = () => { if (document.visibilityState === 'visible') runCheckSimple(); schedule() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearTimeout(initialTimer)
      if (timerRef.current) window.clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [itemsLatest, bootRefreshed, mode, selectedSource, selectedCategory, searchQuery])

  // Stable ID logic
  const currentRawItems = mode === 'latest' ? itemsLatest : itemsTrending
  const shapedNews = useMemo(() => {
    const map = { ...firstSeen }
    let changed = false
    const withStable = currentRawItems.map((n) => {
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
  }, [currentRawItems, firstSeen])

  const sortedNews = useMemo(() => {
    if (mode === 'trending') return shapedNews
    return [...shapedNews].sort((a, b) => (b as any).stableAt - (a as any).stableAt)
  }, [shapedNews, mode])

  const visibleNews = sortedNews 

  // Cursor logic
  useEffect(() => {
    if (mode === 'trending') return 
    if (!visibleNews.length) {
      setCursor(null)
      return
    }
    const minMs = visibleNews.reduce((acc, n) => Math.min(acc, n.publishedAt || acc), visibleNews[0].publishedAt || 0)
    setCursor(minMs || null)
  }, [visibleNews, mode])

  // Paging
  async function fetchPage(cursorVal: number) {
    const qs = new URLSearchParams()
    qs.set('paged', '1')
    qs.set('limit', '40')
    qs.set('cursor', String(cursorVal))
    if (selectedSource !== 'Vse') qs.set('source', selectedSource)
    if (selectedCategory !== 'vse') qs.set('category', selectedCategory)
    if (searchQuery) qs.set('q', searchQuery)
      
    const res = await fetch(`/api/news?${qs.toString()}`, { cache: 'no-store' })
    if (!res.ok) return { items: [], nextCursor: null }
    return await res.json()
  }

  const handleLoadMore = async () => {
    if (mode !== 'latest') return
    if (isLoadingMore || !hasMore || cursor == null || cursor <= 0) return
    setIsLoadingMore(true)
    try {
      const { items, nextCursor } = await fetchPage(cursor)
      const seen = new Set(itemsLatest.map((n) => n.link))
      const fresh = items
        .filter((i: any) => !seen.has(i.link))
        .map((i: any) => ({ ...i, category: i.category || determineCategory({ link: i.link, categories: [] }) }))

      if (fresh.length) setItemsLatest((prev) => [...prev, ...fresh])
      
      if (!nextCursor || nextCursor === cursor || items.length === 0) {
        setHasMore(false); setCursor(null)
      } else {
        setCursor(nextCursor); setHasMore(true)
      }
    } finally { setIsLoadingMore(false) }
  }

  const handleTabChange = async (next: Mode) => {
    if (next === mode) return
    setMode(next)
    if (next === 'latest') {
      setHasMore(true); setCursor(null)
    } else {
      setHasMore(false); setCursor(null)
      const now = Date.now()
      const isStale = (now - lastTrendingFetchRef.current) > 5 * 60_000
      if (!trendingLoaded || isStale) {
        try {
          const fresh = await loadNews('trending', 'Vse', 'vse', null)
          if (fresh) {
            setItemsTrending(fresh); setTrendingLoaded(true); lastTrendingFetchRef.current = Date.now() 
          }
        } catch (e) { console.error(e) }
      }
    }
  }

  const gridClasses = mode === 'trending'
      ? 'grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      : 'grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

  return (
    <>
      <Header 
        onOpenFilter={() => setFilterModalOpen(true)}
        onSearch={setSearchQuery} 
        activeSource={selectedSource}
        activeCategory={selectedCategory}
        onSelectCategory={(cat) => {
           startTransition(() => {
             setSelectedCategory(cat)
           })
        }}
      />

      {/* FILTER MODAL */}
      <SourceFilter
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        value={selectedSource}
        onChange={(src) => setSelectedSource(src)}
      />

      <SeoHead title="Križišče" description="Agregator najnovejših novic." />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-0 pb-8">
        
        {/* PREKLOP: Najnovejše / Aktualno */}
        <div className="flex items-center justify-between py-4">
           <div className="scale-90 origin-left">
             <NewsTabs active={mode} onChange={handleTabChange} />
           </div>
           
           {/* Tukaj lahko prikažeš aktivni filter, če je izbran */}
           {selectedSource !== 'Vse' && (
             <div className="text-xs text-brand font-medium border border-brand/20 bg-brand/5 px-2 py-1 rounded">
               Vir: {selectedSource}
             </div>
           )}
        </div>

        {isRefreshing && visibleNews.length === 0 ? (
           <div className="flex flex-col items-center justify-center pt-20 pb-20">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-4"></div>
             <p className="opacity-60">Iščem novice ...</p>
           </div>
        ) : visibleNews.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 pb-20 text-center">
              {searchQuery ? (
                 <p className="opacity-60">Ni rezultatov za iskanje &quot;{searchQuery}&quot;.</p>
              ) : (
                 <p className="opacity-60">Trenutno ni novic s temi filtri.</p>
              )}
          </div>
        ) : (
          <div className={gridClasses}>
            {visibleNews.map((article, i) => (
              <div key={article.link + '|' + i} className="col-span-1">
                {mode === 'trending' ? (
                  <div className="h-full"><TrendingCard news={article as any} /></div>
                ) : (
                  <ArticleCard news={article as any} priority={i === 0} />
                )}
              </div>
            ))}
          </div>
        )}

        {mode === 'latest' && hasMore && visibleNews.length > 0 && (
          <div className="text-center mt-8 mb-4">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm font-medium disabled:opacity-50"
            >
              {isLoadingMore ? 'Nalagam...' : 'Naloži več novic'}
            </button>
          </div>
        )}
      </main>

      <BackToTop threshold={200} />
      <Footer />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data } = await supabase.from('news').select('id, link, title, source, summary, contentsnippet, image, published_at, publishedat').order('publishedat', { ascending: false }).limit(60)
  const rows = (data ?? []) as any[]
  const initialNews: NewsItem[] = rows.map((r) => {
    const link = r.link || ''
    return {
      title: r.title,
      link,
      source: r.source,
      contentSnippet: r.contentsnippet ?? r.summary ?? '',
      image: r.image ?? null,
      publishedAt: (r.publishedat ?? (r.published_at ? Date.parse(r.published_at) : 0)) || 0,
      isoDate: r.published_at,
      category: determineCategory({ link, categories: [] }) 
    }
  })
  return { props: { initialNews } }
}
