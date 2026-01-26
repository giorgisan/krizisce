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
import TrendingBar, { TrendingWord } from '@/components/TrendingBar' 
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
  tag: string | null,
  forceRefresh = false, 
  signal?: AbortSignal
): Promise<NewsItem[] | null> {
    
  const qs = new URLSearchParams()
    
  if (mode === 'trending') qs.set('variant', 'trending')
  if (source.length > 0) qs.set('source', source.join(','))
  if (category !== 'vse') qs.set('category', category)
  if (query) qs.set('q', query)
  if (tag) qs.set('tag', tag)
    
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
    
  if (mode === 'latest' && source.length === 0 && category === 'vse' && !query && !tag && !forceRefresh) {
    return null 
  }
  return null
}

/* ================= Page Component ================= */

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
  const [isDesktopLogic, setIsDesktopLogic] = useState(false)

  const [selectedSources, setSelectedSources] = useState<string[]>([]) 
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'vse'>('vse')
  const [searchQuery, setSearchQuery] = useState<string>('') 
  const [tagQuery, setTagQuery] = useState<string>('') 

  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
    
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [bootRefreshed, setBootRefreshed] = useState(false)

  // --- INIT ---
  useEffect(() => {
    kickSyncIfStale(5 * 60_000)
    setBootRefreshed(true)
    const checkDesktop = () => setIsDesktopLogic(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Auto-load trending on desktop logic only
  useEffect(() => {
    if (isDesktopLogic && !trendingLoaded && !isRefreshing && bootRefreshed) {
      const fetchTrendingSide = async () => {
        try {
          const fresh = await loadNews('trending', [], 'vse', null, null)
          if (fresh) {
            setItemsTrending(fresh)
            setTrendingLoaded(true)
            lastTrendingFetchRef.current = Date.now()
          }
        } catch {}
      }
      fetchTrendingSide()
    }
  }, [isDesktopLogic, trendingLoaded, isRefreshing, bootRefreshed])

  // --- LOGIKA ---
  const resetAll = () => {
    startTransition(() => {
      setSelectedSources([])
      setSelectedCategory('vse')
      setSearchQuery('')
      setTagQuery('')
      setMode('latest')
      setCursor(null)
      setHasMore(true)
      setItemsLatest(initialNews) 
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // --- FETCHING ---
  useEffect(() => {
    if (!bootRefreshed) return
    if (mode === 'trending' && !searchQuery && !tagQuery && !isDesktopLogic) return

    const fetchData = async () => {
        setIsRefreshing(true)
        setCursor(null)
        setHasMore(true)
        const fresh = await loadNews('latest', selectedSources, selectedCategory, searchQuery || null, tagQuery || null)
        if (fresh) setItemsLatest(fresh)
        else setItemsLatest([])
        setIsRefreshing(false)
    }
    
    if (searchQuery) {
        const timeoutId = setTimeout(fetchData, 500)
        return () => clearTimeout(timeoutId)
    } else {
        fetchData()
    }
  }, [selectedSources, selectedCategory, searchQuery, tagQuery, mode, bootRefreshed, isDesktopLogic])

  // --- REFRESH EVENT ---
  useEffect(() => {
    const onRefresh = () => {
      window.dispatchEvent(new CustomEvent('news-refreshing', { detail: true }))
      startTransition(() => {
        const targetMode = (mode === 'trending' && !isDesktopLogic) ? 'trending' : 'latest'
        loadNews(targetMode, selectedSources, selectedCategory, searchQuery || null, tagQuery || null, true).then((fresh) => {
          if (fresh) {
            if (targetMode === 'latest') { setItemsLatest(fresh); setHasMore(true); setCursor(null) } 
            else { setItemsTrending(fresh); setTrendingLoaded(true); lastTrendingFetchRef.current = Date.now() }
          }
          if (isDesktopLogic && targetMode === 'latest') {
             loadNews('trending', [], 'vse', null, null, true).then(tr => { if (tr) setItemsTrending(tr) })
          }
          window.dispatchEvent(new CustomEvent('news-refreshing', { detail: false }))
        })
      })
    }
    window.addEventListener('refresh-news', onRefresh as EventListener)
    return () => window.removeEventListener('refresh-news', onRefresh as EventListener)
  }, [mode, selectedSources, selectedCategory, searchQuery, tagQuery, isDesktopLogic])

  // --- PAGINATION ---
  const visibleNews = (mode === 'trending' && !isDesktopLogic) ? itemsTrending : itemsLatest
  useEffect(() => {
    if (mode === 'trending' && !isDesktopLogic) return 
    if (!visibleNews.length) { setCursor(null); return }
    const minMs = visibleNews.reduce((acc, n) => Math.min(acc, n.publishedAt || acc), visibleNews[0].publishedAt || 0)
    setCursor(minMs || null)
  }, [visibleNews, mode, isDesktopLogic])

  async function fetchPage(cursorVal: number) {
    const qs = new URLSearchParams()
    qs.set('paged', '1'); qs.set('limit', '25'); qs.set('cursor', String(cursorVal))
    if (selectedSources.length > 0) qs.set('source', selectedSources.join(','))
    if (selectedCategory !== 'vse') qs.set('category', selectedCategory)
    if (searchQuery) qs.set('q', searchQuery)
    if (tagQuery) qs.set('tag', tagQuery) 
    const res = await fetch(`/api/news?${qs.toString()}`, { cache: 'no-store' })
    if (!res.ok) return { items: [], nextCursor: null }
    return await res.json()
  }

  const handleLoadMore = async () => {
    if (mode !== 'latest' && !isDesktopLogic) return
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
    if (next === 'latest') { setHasMore(true); setCursor(null) } 
    else {
      setHasMore(false); setCursor(null)
      const now = Date.now()
      if (!trendingLoaded || (now - lastTrendingFetchRef.current) > 5 * 60_000) {
        setIsRefreshing(true)
        try {
          const fresh = await loadNews('trending', [], 'vse', null, null)
          if (fresh) { setItemsTrending(fresh); setTrendingLoaded(true); lastTrendingFetchRef.current = Date.now() }
        } catch (e) { console.error(e) } finally { setIsRefreshing(false) }
      }
    }
  }

  const activeSourceLabel = selectedSources.length === 0 ? 'Vse' : selectedSources.length === 1 ? selectedSources[0] : `${selectedSources.length} virov`
  const currentCategoryLabel = selectedCategory === 'vse' ? '' : CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory;

  const handleTrendingClick = (word: string) => {
    let clean = word.replace(/^#/, '').trim();
    setItemsLatest([]); setIsRefreshing(true); 
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setSearchQuery(''); setTagQuery(clean) 
    if (mode === 'trending') { setMode('latest'); setHasMore(true); setCursor(null); }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  return (
    <>
      <Header 
        onOpenFilter={() => setFilterModalOpen(true)}
        onSearch={(q) => { setSearchQuery(q); setTagQuery(''); }} 
        activeSource={activeSourceLabel}
        activeCategory={selectedCategory}
        onSelectCategory={(cat) => {
           startTransition(() => {
             setSelectedCategory(cat)
             if (cat !== 'vse') { setMode('latest'); setHasMore(true); setCursor(null) }
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

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-12">
        <div className="max-w-[1800px] mx-auto w-full px-4 md:px-8 lg:px-16">

            {/* --- ZGORNJA KONTROLNA VRSTICA (Samo naslov/tabi/search) --- */}
            <div className="py-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
                    <div className="lg:hidden scale-90 origin-left">
                        {selectedCategory === 'vse' ? (
                            <NewsTabs active={mode} onChange={handleTabChange} />
                        ) : (
                            <span className="text-xl font-bold capitalize">{currentCategoryLabel}</span>
                        )}
                    </div>
                    <div className="hidden lg:block">
                        {selectedCategory !== 'vse' && <span className="text-2xl font-bold capitalize mr-4">{currentCategoryLabel}</span>}
                    </div>
                    <div className="md:hidden flex-1 relative">
                        <input
                          type="search"
                          placeholder="Išči ..."
                          className="w-full h-9 pl-3 pr-4 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
                          value={searchQuery}
                          onChange={handleSearchChange}
                        />
                    </div>
                </div>
                
                {selectedSources.length > 0 && (
                  <div className="ml-auto">
                      <button onClick={() => setSelectedSources([])} className="hidden md:flex text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full whitespace-nowrap">
                         Počisti filtre ({selectedSources.length})
                      </button>
                  </div>
                )}
            </div>

            {/* --- GLAVNI LAYOUT (2 Stolpca) --- */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                
                {/* 1. LEVI STOLPEC (Tags + Novice) */}
                <div className={`flex-1 w-full min-w-0 ${mode === 'trending' ? 'hidden lg:block' : 'block'}`}>
                    
                    {/* TRENDI BAR (Tagi) */}
                    <div className={`mb-2 min-w-0 w-full overflow-hidden ${(!isDesktopLogic && (searchQuery || tagQuery)) ? 'hidden' : 'block'}`}>
                          <TrendingBar 
                            words={initialTrendingWords} 
                            selectedWord={tagQuery || searchQuery} 
                            onSelectWord={handleTrendingClick} 
                          />
                    </div>

                    {/* Rezultati iskanja */}
                    {(searchQuery || tagQuery) && (
                        <div className="mb-4 flex items-center gap-2 text-sm">
                            <span>Rezultati za: <b>"{tagQuery || searchQuery}"</b></span>
                            <button onClick={() => { setSearchQuery(''); setTagQuery(''); }} className="text-brand text-xs underline">Počisti</button>
                        </div>
                    )}

                    {/* GRID: POPRAVLJENO NA 4 STOLPCE (xl:grid-cols-4) */}
                    {isRefreshing && itemsLatest.length === 0 ? (
                        <div className="py-20 text-center opacity-50">Nalagam novice ...</div>
                    ) : itemsLatest.length === 0 ? (
                        <div className="py-20 text-center opacity-50">Ni novic.</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {itemsLatest.map((article, i) => (
                                <ArticleCard 
                                    key={article.link + i} 
                                    news={article} 
                                    priority={i < 8} 
                                />
                            ))}
                        </div>
                    )}

                    {/* Load More */}
                    {hasMore && itemsLatest.length > 0 && (
                        <div className="text-center mt-12">
                            <button onClick={handleLoadMore} disabled={isLoadingMore} className="px-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 shadow-sm text-sm font-bold tracking-wide transition-all hover:shadow-md">
                                {isLoadingMore ? 'Nalagam ...' : 'NALOŽI VEČ'}
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. DESNI STOLPEC (Sidebar) */}
                <aside className={`w-full lg:w-[340px] xl:w-[380px] shrink-0 sticky top-32 
                    ${mode === 'trending' ? 'block' : 'hidden lg:block'}
                `}>
                    <div className="bg-white/50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-xl">
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                             <span className="text-xl font-bold">🔥 Aktualno</span>
                        </div>

                        {itemsTrending.length === 0 && !trendingLoaded ? (
                             <div className="py-8 text-center text-xs opacity-50">Nalagam ...</div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {itemsTrending.slice(0, 10).map((article, i) => (
                                    <TrendingCard 
                                        key={article.link + 'tr' + i} 
                                        news={article} 
                                        compact={true} 
                                        rank={i + 1}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

            </div>
        </div>
      </main>

      <BackToTop threshold={300} />
      <Footer />
    </>
  )
}

/* ================= SSR ================= */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })

  const newsPromise = supabase.from('news').select('id, link, title, source, summary, contentsnippet, image, published_at, publishedat, category').neq('category', 'oglas').order('publishedat', { ascending: false }).order('id', { ascending: false }).limit(25)
  
  let trendsData: any[] = []
  const { data: aiData } = await supabase.from('trending_ai').select('words').order('updated_at', { ascending: false }).limit(1).single()
  
  if (aiData?.words?.length) {
     trendsData = aiData.words.map((w: string) => ({ word: w, count: 1 }))
  } else {
     const sqlTrends = await supabase.rpc('get_trending_words', { hours_lookback: 48, limit_count: 8 })
     trendsData = sqlTrends.data || []
  }

  const [newsRes] = await Promise.all([newsPromise])
  const rows = (newsRes.data ?? []) as any[]
  const initialNews: NewsItem[] = rows.map((r) => ({
    title: r.title,
    link: r.link || '',
    source: r.source,
    contentSnippet: r.contentsnippet ?? r.summary ?? '',
    image: r.image ?? null,
    publishedAt: (r.publishedat ?? (r.published_at ? Date.parse(r.published_at) : 0)) || 0,
    isoDate: r.published_at,
    category: (r.category as CategoryId) || determineCategory({ link: r.link || '', categories: [] }) 
  }))

  return { props: { initialNews, initialTrendingWords: trendsData } }
}
