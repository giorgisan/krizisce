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
import CategoryFilter from '@/components/CategoryFilter'
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
      fetch('/api/news?forceFresh=1', { cache: 'no-store', keepalive: true }).catch(
        () => {},
      )
      localStorage.setItem(SYNC_KEY, String(now))
    }
  } catch {}
}

function timeout(ms: number) {
  return new Promise((_, rej) =>
    setTimeout(() => rej(new Error('Request timeout')), ms),
  )
}

// POSODOBITEV: loadNews sprejme source in category
async function loadNews(mode: Mode, source: string, category: CategoryId | 'vse', signal?: AbortSignal): Promise<NewsItem[] | null> {
  const qs = new URLSearchParams()
  if (mode === 'trending') qs.set('variant', 'trending')
  if (source !== 'Vse') qs.set('source', source)
  if (category !== 'vse') qs.set('category', category)

  // 1) prek Vercela
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

  // 2) fallback (samo za latest in brez filtrov, ker client fallback nima filtrov)
  if (mode === 'latest' && source === 'Vse' && category === 'vse') {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
      const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      })

      const { data, error } = await supabase
        .from('news')
        .select('link,title,source,contentsnippet,summary,image,published_at,publishedat')
        .order('publishedat', { ascending: false })
        .limit(60)

      if (error || !data) return null

      const items: NewsItem[] = (data as any[]).map((r) => {
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
      return items.length ? items : []
    } catch {
      return null
    }
  }
  return null
}

// stableAt
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

/* ================= Page ================= */

type Props = { initialNews: NewsItem[] }

export default function Home({ initialNews }: Props) {
  // LOČENA STANJA ZA PODATKE
  const [itemsLatest, setItemsLatest] = useState<NewsItem[]>(initialNews)
  const [itemsTrending, setItemsTrending] = useState<NewsItem[]>([])
    
  const [mode, setMode] = useState<Mode>('latest')
  const [trendingLoaded, setTrendingLoaded] = useState(false)
  
  const lastTrendingFetchRef = useRef<number>(0)

  // mobile detection
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Filtri
  const [selectedSource, setSelectedSource] = useState<string>('Vse')
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'vse'>('vse')

  // filter vrstica
  const [filterOpen, setFilterOpen] = useState<boolean>(false)
  useEffect(() => {
    const onToggle = () => setFilterOpen((v) => !v)
    window.addEventListener('ui:toggle-filters', onToggle as EventListener)
    try {
      const u = new URL(window.location.href)
      if (u.searchParams.get('filters') === '1') setFilterOpen(true)
    } catch {}
    return () => window.removeEventListener('ui:toggle-filters', onToggle as EventListener)
  }, [])
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('ui:filters-state', { detail: { open: filterOpen } }),
    )
  }, [filterOpen])

  const [firstSeen, setFirstSeen] = useState<FirstSeenMap>(() => loadFirstSeen())
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [bootRefreshed, setBootRefreshed] = useState(false)
    
  useEffect(() => {
    kickSyncIfStale(5 * 60_000)
    setBootRefreshed(true)
  }, [])

  // === GLAVNA SPREMEMBA: Fetch ob spremembi filtra ===
  useEffect(() => {
    if (!bootRefreshed) return
    
    // Če smo v trending, filtri ne vplivajo (zaenkrat)
    if (mode === 'trending') return

    const fetchData = async () => {
        setIsRefreshing(true)
        setCursor(null)
        setHasMore(true)
        
        // Pokličemo API s filtri
        const fresh = await loadNews('latest', selectedSource, selectedCategory)
        
        if (fresh) {
            setItemsLatest(fresh)
        } else {
            setItemsLatest([])
        }
        setIsRefreshing(false)
    }
    
    fetchData()
  }, [selectedSource, selectedCategory, mode, bootRefreshed])


  // Izberemo pravi nabor podatkov glede na mode
  const currentRawItems = mode === 'latest' ? itemsLatest : itemsTrending

  // polling
  const missCountRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!bootRefreshed) return

    const runCheckSimple = async () => {
      if (mode !== 'latest') return

      kickSyncIfStale(10 * 60_000)
      const fresh = await loadNews('latest', selectedSource, selectedCategory)
      
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

    const onVis = () => {
      if (document.visibilityState === 'visible') runCheckSimple()
      schedule()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearTimeout(initialTimer)
      if (timerRef.current) window.clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [itemsLatest, bootRefreshed, mode, selectedSource, selectedCategory])

  // manual refresh
  useEffect(() => {
    const onRefresh = () => {
      window.dispatchEvent(new CustomEvent('news-refreshing', { detail: true }))
      
      startTransition(() => {
        loadNews(mode, selectedSource, selectedCategory).then((fresh) => {
          if (fresh) {
            if (mode === 'latest') {
              setItemsLatest(fresh)
              setHasMore(true)
              setCursor(null)
            } else {
              setItemsTrending(fresh)
              setTrendingLoaded(true)
              lastTrendingFetchRef.current = Date.now() 
            }
          }
          window.dispatchEvent(new CustomEvent('news-refreshing', { detail: false }))
          window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
          missCountRef.current = 0
        })
      })
    }
    window.addEventListener('refresh-news', onRefresh as EventListener)
    return () => window.removeEventListener('refresh-news', onRefresh as EventListener)
  }, [mode, selectedSource, selectedCategory])

  // stableAt shaping
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
    if (changed) {
      setFirstSeen(map)
      saveFirstSeen(map)
    }
    return withStable
  }, [currentRawItems, firstSeen])

  // sort
  const sortedNews = useMemo(() => {
    if (mode === 'trending') {
      return shapedNews
    }
    return [...shapedNews].sort((a, b) => (b as any).stableAt - (a as any).stableAt)
  }, [shapedNews, mode])

  // ODSTRANJEN FILTEREDNEWS USEMEMO - Zdaj API vrača že filtrirane podatke
  const visibleNews = sortedNews 

  // cursor calc
  useEffect(() => {
    if (mode === 'trending') return 
    if (!visibleNews.length) {
      setCursor(null)
      // Ne nastavimo nujno hasMore na true, če je seznam prazen po fetchu
      return
    }
    const minMs = visibleNews.reduce(
      (acc, n) => Math.min(acc, n.publishedAt || acc),
      visibleNews[0].publishedAt || 0,
    )
    setCursor(minMs || null)
  }, [visibleNews, mode])

  // Paging fetcher
  type PagePayload = { items: NewsItem[]; nextCursor: number | null }
  async function fetchPage(params: {
    cursor?: number | null
    limit?: number
    source?: string | null
    category?: string | null
  }): Promise<PagePayload> {
    const { cursor, limit = 40, source, category } = params
    const qs = new URLSearchParams()
    qs.set('paged', '1')
    qs.set('limit', String(limit))
    if (cursor != null) qs.set('cursor', String(cursor))
    if (source && source !== 'Vse') qs.set('source', source)
    if (category && category !== 'vse') qs.set('category', category)
      
    const res = await fetch(`/api/news?${qs.toString()}`, { cache: 'no-store' })
    if (!res.ok) return { items: [], nextCursor: null }
    const data = (await res.json()) as PagePayload
    if (!data || !Array.isArray(data.items))
      return { items: [], nextCursor: null }
    return data
  }

  const handleLoadMore = async () => {
    if (mode !== 'latest') return
    if (isLoadingMore || !hasMore || cursor == null || cursor <= 0) return
    setIsLoadingMore(true)
    try {
      const { items, nextCursor } = await fetchPage({
        cursor,
        limit: 40,
        source: selectedSource,
        category: selectedCategory, // Dodamo kategorijo v paginacijo
      })
      const seen = new Set(itemsLatest.map((n) => n.link))
      
      const fresh = items
        .filter((i) => !seen.has(i.link))
        .map(i => ({ ...i, category: i.category || determineCategory({ link: i.link, categories: [] }) }))

      if (fresh.length) {
        setItemsLatest((prev) => [...prev, ...fresh])
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

  const handleTabChange = async (next: Mode) => {
    if (next === mode) return

    setMode(next)

    if (next === 'latest') {
      setHasMore(true)
      setCursor(null)
    } else {
      setHasMore(false)
      setCursor(null)
      
      const now = Date.now()
      const isStale = (now - lastTrendingFetchRef.current) > 5 * 60_000

      if (!trendingLoaded || isStale) {
        try {
          const fresh = await loadNews('trending', 'Vse', 'vse')
          if (fresh) {
            setItemsTrending(fresh)
            setTrendingLoaded(true)
            lastTrendingFetchRef.current = Date.now() 
          }
        } catch (e) {
            console.error(e)
        }
      }
    }
  }

  // --- GRID KONFIGURACIJA ---
  const gridClasses =
    mode === 'trending'
      ? 'grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      : 'grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

  return (
    <>
      <Header />

      <SourceFilter
        value={selectedSource}
        onChange={(next) => {
          startTransition(() => {
            setSelectedSource(next)
            // Reset se zgodi v useEffect-u
          })
        }}
        open={filterOpen}
      />

      <div className="px-4 md:px-8 lg:px-16 mt-3 mb-3">
        <NewsTabs active={mode} onChange={handleTabChange} />
      </div>

      <CategoryFilter 
        selected={selectedCategory}
        onChange={(cat) => {
           startTransition(() => {
             setSelectedCategory(cat)
             // Reset se zgodi v useEffect-u
           })
        }}
      />

      <SeoHead
        title="Križišče"
        description="Agregator najnovejših novic iz slovenskih medijev. Članki so last izvornih portalov."
      />

      <main
        className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-0 pb-8"
        tabIndex={-1}
      >
        {isRefreshing && visibleNews.length === 0 ? (
           <div className="flex flex-col items-center justify-center pt-20 pb-20">
             <p className="opacity-60">Nalagam novice ...</p>
           </div>
        ) : visibleNews.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 pb-20">
              {mode === 'trending' && !trendingLoaded ? (
                <p className="animate-pulse opacity-60">Nalagam najbolj obravnavane novice ...</p>
              ) : mode === 'trending' ? (
                <div className="p-6 bg-gray-900/50 dark:bg-gray-800/80 rounded-xl shadow-lg border border-gray-700/50 text-center max-w-lg mx-auto">
                  <p className="text-xl font-bold text-gray-100 mb-2">
                    Dobro jutro.
                  </p>
                  <p className="text-md text-gray-300">
                    Trenutno še ni na voljo **aktualnih novic**.
                  </p>
                </div>
              ) : (
                <p className="opacity-60">Ni novic v tej kategoriji.</p>
              )}
          </div>
        ) : (
          <div className={gridClasses}>
            {visibleNews.map((article, i) => {
              return (
                <div 
                  key={article.link + '|' + i}
                  className="col-span-1"
                >
                  {mode === 'trending' ? (
                    <div className="h-full">
                      <TrendingCard
                        news={article as any}
                      />
                    </div>
                  ) : (
                    <ArticleCard
                      news={article as any}
                      priority={i === 0}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {mode === 'latest' && hasMore && visibleNews.length > 0 && (
          <div className="text-center mt-8 mb-4">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-5 py-2 bg-brand text-white rounded-full hover:bg-brand-hover transition disabled:opacity-60"
            >
              {isLoadingMore ? 'Nalagam…' : 'Naloži več'}
            </button>
          </div>
        )}
      </main>

      <BackToTop threshold={200} />
      <Footer />
    </>
  )
}

// ... getServerSideProps ostane enak ...
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=30'
  )

  const { createClient } = await import('@supabase/supabase-js')
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })

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
    .select(
      'id, link, title, source, summary, contentsnippet, image, published_at, publishedat',
    )
    .order('publishedat', { ascending: false })
    .limit(60)

  const rows = (data ?? []) as Row[]

  const initialNews: NewsItem[] = rows.map((r) => {
    const link = r.link || ''
    return {
      title: r.title,
      link,
      source: r.source,
      contentSnippet: r.contentsnippet ?? r.summary ?? '',
      image: r.image ?? null,
      publishedAt:
        (r.publishedat ??
          (r.published_at ? Date.parse(r.published_at) : 0)) || 0,
      isoDate: r.published_at,
      category: determineCategory({ link, categories: [] }) 
    }
  })

  return { props: { initialNews } }
}
