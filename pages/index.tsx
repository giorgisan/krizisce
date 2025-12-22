import React, {
  useEffect,
  useState,
  startTransition,
  useRef,
} from 'react'
import { GetServerSideProps } from 'next'

import { NewsItem } from '@/types'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import ArticleCard from '@/components/ArticleCard'
import TrendingCard from '@/components/TrendingCard'
import TrendingBar, { TrendingWord } from '@/components/TrendingBar' // Uvoz tipa
import SeoHead from '@/components/SeoHead'
import BackToTop from '@/components/BackToTop'
import SourceFilter from '@/components/SourceFilter' 
import NewsTabs from '@/components/NewsTabs'
import { CategoryId, determineCategory, CATEGORIES } from '@/lib/categories'

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

async function loadNews(
  mode: Mode, 
  source: string[], 
  category: CategoryId | 'vse', 
  query: string | null, 
  forceRefresh = false, 
  signal?: AbortSignal
): Promise<NewsItem[] | null> {
  
  const qs = new URLSearchParams()
  
  if (mode === 'trending') qs.set('variant', 'trending')
  if (source.length > 0) qs.set('source', source.join(','))
  if (category !== 'vse') qs.set('category', category)
  if (query) qs.set('q', query)
  
  if (forceRefresh) qs.set('_t', Date.now().toString())

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
  
  if (mode === 'latest' && source.length === 0 && category === 'vse' && !query && !forceRefresh) {
    return null 
  }
  return null
}

/* ================= Page Component ================= */

// Dodamo initialTrendingWords v Props
type Props = { 
  initialNews: NewsItem[]
  initialTrendingWords: TrendingWord[] 
}

export default function Home({ initialNews, initialTrendingWords }: Props) {
  const [itemsLatest, setItemsLatest] = useState<NewsItem[]>(initialNews)
  const [itemsTrending, setItemsTrending] = useState<NewsItem[]>([])
    
  const [mode, setMode] = useState<Mode>('latest')
  const [trendingLoaded, setTrendingLoaded] = useState(false)
  const lastTrendingFetchRef = useRef<number>(0)

  // FILTRI
  const [selectedSources, setSelectedSources] = useState<string[]>([]) 
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'vse'>('vse')
  const [searchQuery, setSearchQuery] = useState<string>('') 

  const [filterModalOpen, setFilterModalOpen] = useState(false)

  // PAGINACIJA & STANJE
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [bootRefreshed, setBootRefreshed] = useState(false)
    
  useEffect(() => {
    kickSyncIfStale(5 * 60_000)
    setBootRefreshed(true)
  }, [])

  const resetAll = () => {
    startTransition(() => {
      setSelectedSources([])
      setSelectedCategory('vse')
      setSearchQuery('')
      setMode('latest')
      setCursor(null)
      setHasMore(true)
      setItemsLatest(initialNews) 
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!bootRefreshed) return
    if (mode === 'trending') return

    const fetchData = async () => {
        setIsRefreshing(true)
        setCursor(null)
        setHasMore(true)
        
        const fresh = await loadNews('latest', selectedSources, selectedCategory, searchQuery)
        
        if (fresh) {
            setItemsLatest(fresh)
        } else {
            setItemsLatest([])
        }
        setIsRefreshing(false)
    }
    
    if (searchQuery) {
        const timeoutId = setTimeout(fetchData, 500)
        return () => clearTimeout(timeoutId)
    } else {
        fetchData()
    }

  }, [selectedSources, selectedCategory, searchQuery, mode, bootRefreshed])

  // POLLING (Ostane enak)
  const missCountRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!bootRefreshed) return
    const runCheckSimple = async () => {
      if (mode !== 'latest') return
      if (searchQuery) return 
      kickSyncIfStale(10 * 60_000)
      const fresh = await loadNews('latest', selectedSources, selectedCategory, null)
      if (!fresh || fresh.length === 0) {
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        missCountRef.current = Math.min(POLL_MAX_BACKOFF, missCountRef.current + 1)
        return
      }
      const curSet = new Set(itemsLatest.map((n) => n.link))
      const newLinksCount = fresh.filter((n) => !curSet.has(n.link)).length
      if (newLinksCount > 0) {
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
  }, [itemsLatest, bootRefreshed, mode, selectedSources, selectedCategory, searchQuery])

  // REFRESH HANDLER (Ostane enak)
  useEffect(() => {
    const onRefresh = () => {
      window.dispatchEvent(new CustomEvent('news-refreshing', { detail: true }))
      startTransition(() => {
        loadNews(mode, selectedSources, selectedCategory, searchQuery, true).then((fresh) => {
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
  }, [mode, selectedSources, selectedCategory, searchQuery])

  const visibleNews = mode === 'trending' ? itemsTrending : itemsLatest

  // CURSOR LOGIC (Ostane enak)
  useEffect(() => {
    if (mode === 'trending') return 
    if (!visibleNews.length) {
      setCursor(null)
      return
    }
    const minMs = visibleNews.reduce((acc, n) => Math.min(acc, n.publishedAt || acc), visibleNews[0].publishedAt || 0)
    setCursor(minMs || null)
  }, [visibleNews, mode])

  // PAGINACIJA FUNKCIJE (Ostanejo enake)
  async function fetchPage(cursorVal: number) {
    const qs = new URLSearchParams()
    qs.set('paged', '1')
    qs.set('limit', '25') 
    qs.set('cursor', String(cursorVal))
    if (selectedSources.length > 0) qs.set('source', selectedSources.join(','))
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setMode(next)
    if (next === 'latest') {
      setHasMore(true); setCursor(null)
    } else {
      setHasMore(false); setCursor(null)
      const now = Date.now()
      const isStale = (now - lastTrendingFetchRef.current) > 5 * 60_000
      if (!trendingLoaded || isStale) {
        try {
          const fresh = await loadNews('trending', [], 'vse', null)
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

  const activeSourceLabel = selectedSources.length === 0 
    ? 'Vse' 
    : selectedSources.length === 1 
      ? selectedSources[0] 
      : `${selectedSources.length} virov`

  const currentCategoryLabel = selectedCategory === 'vse' 
    ? '' 
    : CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory;

  return (
    <>
      <Header 
        onOpenFilter={() => setFilterModalOpen(true)}
        onSearch={setSearchQuery} 
        activeSource={activeSourceLabel}
        activeCategory={selectedCategory}
        onSelectCategory={(cat) => {
           startTransition(() => {
             setSelectedCategory(cat)
             if (cat !== 'vse') {
                setMode('latest')
                setHasMore(true)
                setCursor(null)
             }
           })
           window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        onReset={resetAll} 
      />

      <SourceFilter
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        value={selectedSources}
        onChange={(srcs) => setSelectedSources(srcs)}
      />

      <SeoHead title="Križišče" description="Agregator najnovejših novic." />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 md:px-8 lg:px-16 pt-0 pb-8">
        
        {/* --- SPREMENJENA ZGORNJA VRSTICA --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 min-h-[64px] gap-2">
           {selectedCategory === 'vse' ? (
             <div className="flex flex-wrap items-center gap-2">
                {/* 1. TABS */}
                <div className="scale-90 origin-left shrink-0">
                   <NewsTabs active={mode} onChange={handleTabChange} />
                </div>

                {/* 2. TRENDING BESEDE (Samo na Desktopu/Tablici zraven tabov) */}
                {mode === 'latest' && !searchQuery && (
                  <div className="hidden sm:block overflow-hidden max-w-[50vw]">
                     <TrendingBar 
                        words={initialTrendingWords}
                        selectedWord={searchQuery}
                        onSelectWord={(word) => {
                           window.scrollTo({ top: 0, behavior: 'smooth' })
                           setSearchQuery(word)
                        }}
                     />
                  </div>
                )}
             </div>
           ) : (
             <div className="flex items-center">
                <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white capitalize">
                  {currentCategoryLabel}
                </span>
             </div>
           )}
           
           {/* --- FILTRI / TRENDING NA MOBILNI --- */}
           <div className="flex items-center gap-2 justify-between w-full sm:w-auto">
              
              {/* Na mobilnih telefonih pokaži trende tukaj (spodaj) */}
              {mode === 'latest' && selectedCategory === 'vse' && !searchQuery && (
                 <div className="block sm:hidden flex-1 overflow-hidden">
                    <TrendingBar 
                       words={initialTrendingWords}
                       selectedWord={searchQuery}
                       onSelectWord={(word) => {
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                          setSearchQuery(word)
                       }}
                    />
                 </div>
              )}

              {selectedSources.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                   <div className="text-xs text-brand font-medium border border-brand/20 bg-brand/5 px-2 py-1 rounded whitespace-nowrap">
                     Filtri: {selectedSources.length}
                   </div>
                   <button 
                     onClick={() => setSelectedSources([])} 
                     className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" 
                   >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                   </button>
                </div>
              )}
           </div>
        </div>

        {/* --- PRIKAZ AKTIVNEGA ISKANJA --- */}
        {searchQuery && (
           <div className="mb-6 flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Rezultati za: <span className="font-bold text-gray-900 dark:text-white">"{searchQuery}"</span>
              </span>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
              >
                Počisti ✕
              </button>
           </div>
        )}

        {/* --- SEZNAM NOVIC (Enako kot prej) --- */}
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
                  <ArticleCard 
                     news={article as any} 
                     priority={i < 10} 
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* LOAD MORE BUTTON */}
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

/* ================= SSR: Tukaj nalagamo novice IN trende ================= */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=59'
  )

  const { createClient } = await import('@supabase/supabase-js')
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })

  // 1. Fetch News
  const newsPromise = supabase
    .from('news')
    .select('id, link, title, source, summary, contentsnippet, image, published_at, publishedat, category')
    .neq('category', 'oglas')
    .order('publishedat', { ascending: false })
    .order('id', { ascending: false })
    .limit(25)

  // 2. Fetch Trending Words (Server-side RPC klic)
  const trendsPromise = supabase.rpc('get_trending_words', {
     hours_lookback: 24,
     limit_count: 7 // Omejimo na 7 najbolj vročih
  })

  // Počakamo na oboje hkrati
  const [newsRes, trendsRes] = await Promise.all([newsPromise, trendsPromise])

  // Obdelava novic
  const rows = (newsRes.data ?? []) as any[]
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
      category: (r.category as CategoryId) || determineCategory({ link, categories: [] }) 
    }
  })

  // Obdelava trendov
  const initialTrendingWords: TrendingWord[] = (trendsRes.data as TrendingWord[]) || []

  return { 
    props: { 
      initialNews,
      initialTrendingWords 
    } 
  }
}
