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
  initialTrendingNews: NewsItem[] // <--- Trendi iz strežnika
}

export default function Home({ initialNews, initialTrendingWords, initialTrendingNews }: Props) {
  const [itemsLatest, setItemsLatest] = useState<NewsItem[]>(initialNews)
  
  // POPRAVEK: Začetno stanje napolnimo s podatki iz SSR
  const [itemsTrending, setItemsTrending] = useState<NewsItem[]>(initialTrendingNews || [])
  const [trendingLoaded, setTrendingLoaded] = useState(!!initialTrendingNews?.length)
     
  const [mode, setMode] = useState<Mode>('latest')
  const lastTrendingFetchRef = useRef<number>(Date.now()) 
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

  useEffect(() => {
    kickSyncIfStale(5 * 60_000)
    setBootRefreshed(true)
    const checkDesktop = () => setIsDesktopLogic(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // POPRAVEK: Ta efekt zdaj služi samo za osveževanje v ozadju, če so podatki stari
  useEffect(() => {
    if (isDesktopLogic && !isRefreshing && bootRefreshed) {
        // Če še nimamo trendov ali so starejši od 15 min, jih osveži
        const now = Date.now();
        if (!trendingLoaded || (now - lastTrendingFetchRef.current > 15 * 60_000)) {
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
    }
  }, [isDesktopLogic, trendingLoaded, isRefreshing, bootRefreshed])

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

  const missCountRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!bootRefreshed) return
    
    const runCheckSimple = async () => {
      if (!isDesktopLogic && mode !== 'latest') return
      if (searchQuery || tagQuery || selectedCategory !== 'vse' || selectedSources.length > 0) return

      kickSyncIfStale(10 * 60_000)
      
      const fresh = await loadNews('latest', [], 'vse', null, null)
      
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
      const hidden = document.visibilityState === 'hidden'
      const base = hidden ? HIDDEN_POLL_MS : POLL_MS
      const extra = missCountRef.current * 10_000
      
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = window.setInterval(runCheckSimple, base + extra) as unknown as number
    }

    const initialTimer = setTimeout(runCheckSimple, 15000) 
    schedule()
    
    const onVis = () => { if (document.visibilityState === 'visible') { runCheckSimple(); schedule(); } }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearTimeout(initialTimer)
      if (timerRef.current) window.clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [itemsLatest, bootRefreshed, mode, isDesktopLogic, searchQuery, tagQuery, selectedCategory, selectedSources])

  useEffect(() => {
    const onRefresh = () => {
      window.dispatchEvent(new CustomEvent('news-refreshing', { detail: true }))
      startTransition(() => {
        loadNews('latest', selectedSources, selectedCategory, searchQuery || null, tagQuery || null, true).then((fresh) => {
          if (fresh) {
             setItemsLatest(fresh)
             setHasMore(true)
             setCursor(null)
             loadNews('trending', [], 'vse', null, null, true).then(tr => { if (tr) setItemsTrending(tr) })
          }
          
          window.dispatchEvent(new CustomEvent('news-refreshing', { detail: false }))
          window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
          missCountRef.current = 0
        })
      })
    }
    window.addEventListener('refresh-news', onRefresh as EventListener)
    return () => window.removeEventListener('refresh-news', onRefresh as EventListener)
  }, [selectedSources, selectedCategory, searchQuery, tagQuery])

  const visibleNews = (mode === 'trending' && !isDesktopLogic) ? itemsTrending : itemsLatest
  useEffect(() => {
    if (mode === 'trending' && !isDesktopLogic) return 
    if (!visibleNews.length) { setCursor(null); return }
    const minMs = visibleNews.reduce((acc, n) => Math.min(acc, n.publishedAt || acc), visibleNews[0].publishedAt || 0)
    setCursor(minMs || null)
  }, [visibleNews, mode, isDesktopLogic])

  const handleLoadMore = async () => {
    if (mode !== 'latest' && !isDesktopLogic) return
    if (isLoadingMore || !hasMore || cursor == null || cursor <= 0) return
    setIsLoadingMore(true)
    try {
      const qs = new URLSearchParams()
      qs.set('paged', '1'); qs.set('limit', '24'); qs.set('cursor', String(cursor))
      if (selectedSources.length > 0) qs.set('source', selectedSources.join(','))
      if (selectedCategory !== 'vse') qs.set('category', selectedCategory)
      if (searchQuery) qs.set('q', searchQuery)
      if (tagQuery) qs.set('tag', tagQuery) 
      
      const res = await fetch(`/api/news?${qs.toString()}`, { cache: 'no-store' })
      if (res.ok) {
          const { items, nextCursor } = await res.json()
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
      // Osvežimo samo, če je preteklo več časa (npr. 5 min)
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

            {/* --- ZGORNJA KONTROLNA VRSTICA (POPRVALJENO ZA MOBILE RAZMIK) --- */}
            <div className="pt-1 pb-1 flex flex-col md:flex-row md:items-center gap-0">
                <div className="flex items-center gap-0 w-full md:w-auto">
                    {/* Levo: Zavihki ali Naslov (shrink-0 prepreči stiskanje) */}
                    <div className="lg:hidden scale-90 origin-left shrink-0">
                        {selectedCategory === 'vse' ? (
                            <NewsTabs active={mode} onChange={handleTabChange} />
                        ) : (
                            <span className="text-xl font-bold capitalize mr-1">{currentCategoryLabel}</span>
                        )}
                    </div>
                    {/* Desktop naslov */}
                    <div className="hidden lg:block shrink-0">
                        {selectedCategory !== 'vse' && <span className="text-2xl font-bold capitalize mr-4">{currentCategoryLabel}</span>}
                    </div>

                    {/* Iskalnik (Mobile): flex-1 in ml-0 popolnoma odstranita razmik */}
                    <div className="md:hidden flex-1 relative ml-0">
                        <input
                          type="search"
                          placeholder="Išči ..."
                          className="w-full h-9 pl-3 pr-4 bg-gray-200 dark:bg-gray-800 rounded-full text-sm outline-none focus:ring-1 focus:ring-brand/20"
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

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                
                <div className={`flex-1 w-full min-w-0 ${mode === 'trending' ? 'hidden lg:block' : 'block'}`}>
                    
                    <div className={`mb-1 min-w-0 w-full overflow-hidden ${(!isDesktopLogic && (searchQuery || tagQuery)) ? 'hidden' : 'block'}`}>
                          <TrendingBar 
                            words={initialTrendingWords} 
                            selectedWord={tagQuery || searchQuery} 
                            onSelectWord={handleTrendingClick} 
                          />
                    </div>

                    {(searchQuery || tagQuery) && (
                        <div className="mb-4 flex items-center gap-2 text-sm">
                            <span>Rezultati za: <b>"{tagQuery || searchQuery}"</b></span>
                            <button onClick={() => { setSearchQuery(''); setTagQuery(''); }} className="text-brand text-xs underline">Počisti</button>
                        </div>
                    )}

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
                                    priority={i < 4} // POPRAVEK 1: Zmanjšan priority (prej 8)
                                />
                            ))}
                        </div>
                    )}

                    {hasMore && itemsLatest.length > 0 && (
                        <div className="text-center mt-12">
                            <button onClick={handleLoadMore} disabled={isLoadingMore} className="px-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 shadow-sm text-sm font-bold tracking-wide transition-all hover:shadow-md">
                                {isLoadingMore ? 'Nalagam ...' : 'NALOŽI VEČ'}
                            </button>
                        </div>
                    )}
                </div>

                {/* --- SIDEBAR (POPRAVLJEN: Scroll samo na Desktopu) --- */}
                {/* POPRAVEK 2: Dodan 'transform-gpu' za strojno pospeševanje sticky elementa */}
                <aside className={`w-full lg:w-[340px] xl:w-[380px] shrink-0 lg:sticky lg:top-24 transform-gpu 
                    ${mode === 'trending' ? 'block' : 'hidden lg:block'}
                `}>
                    {/* NIELSEN UX: Visok kontrast ozadja sidebara */}
                    {/* POPRAVEK 3: Zmanjšan blur iz xl na md za hitrejši scroll */}
                    <div className={`
                        bg-gray-200/70 dark:bg-gray-800/90 rounded-2xl backdrop-blur-md shadow-inner flex flex-col
                        lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden /* Samo desktop omejitev */
                    `}>
                        
                        {/* NASLOV (Fiksiran na vrhu samo na desktopu) */}
                        <div className="flex items-center gap-2 mb-0 p-4 pb-2 border-b border-gray-300/50 dark:border-gray-700 shrink-0 z-10 bg-inherit rounded-t-2xl">
                             <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                             <span className="text-xs font-bold uppercase tracking-wide text-gray-900 dark:text-gray-100">
                                Aktualno
                             </span>
                        </div>

                        {/* VSEBINA (Scrollable samo na desktopu) */}
                        <div className="p-4 pt-2 space-y-3 lg:overflow-y-auto lg:custom-scrollbar">
                            {itemsTrending.length === 0 && !trendingLoaded ? (
                                 <div className="flex flex-col gap-3 animate-pulse">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/60 dark:bg-gray-700/50 shadow-sm">
                                            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-600 rounded-lg shrink-0" />
                                            <div className="flex-1 flex flex-col justify-center gap-2">
                                                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded" />
                                                <div className="h-4 w-full bg-gray-200 dark:bg-gray-600 rounded" />
                                                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-600 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                 </div>
                            ) : itemsTrending.length === 0 ? (
                                <div className="py-10 px-4 text-center">
                                    <div className="text-4xl mb-2 grayscale opacity-50">☕</div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                        Jutranje zatišje. <br/>
                                        Zbiramo aktualne novice.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {itemsTrending.slice(0, 10).map((article, i) => (
                                        /* UX: Bela kartica na temnem ozadju za maksimalen fokus */
                                        <div key={article.link + 'tr' + i} className="bg-white dark:bg-gray-700/60 rounded-xl shadow-md overflow-hidden transition-shadow hover:shadow-lg hover:z-10 relative shrink-0">
                                            <TrendingCard 
                                                news={article} 
                                                compact={true} 
                                                rank={i + 1}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
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

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })

  // 1. POIZVEDBA: Glavne novice
  const newsPromise = supabase.from('news').select('id, link, title, source, contentsnippet, image, published_at, publishedat, category').neq('category', 'oglas').order('publishedat', { ascending: false }).order('id', { ascending: false }).limit(24)
  
  // 2. POIZVEDBA: Tagi
  const trendsWordsPromise = supabase.from('trending_ai').select('words').order('updated_at', { ascending: false }).limit(1).single()

  // 3. POIZVEDBA: Trending Novice (Iz Cacha v bazi - NOVO!)
  const trendingGroupsPromise = supabase.from('trending_groups_cache').select('data').order('updated_at', { ascending: false }).limit(1).single()

  const [newsRes, wordsRes, groupsRes] = await Promise.all([newsPromise, trendsWordsPromise, trendingGroupsPromise])

  // Obdelava glavnih novic
  const rows = (newsRes.data ?? []) as any[]
  const initialNews: NewsItem[] = rows.map((r) => ({
    title: r.title,
    link: r.link || '',
    source: r.source,
    contentSnippet: r.contentsnippet ?? '',
    image: r.image ?? null,
    publishedAt: (r.publishedat ?? (r.published_at ? Date.parse(r.published_at) : 0)) || 0,
    isoDate: r.published_at,
    category: (r.category as CategoryId) || determineCategory({ link: r.link || '', categories: [] }) 
  }))

  // Obdelava tagov
  let trendsData: any[] = []
  const aiData = wordsRes.data
  if (aiData?.words?.length) {
     trendsData = aiData.words.map((w: string) => ({ word: w, count: 1 }))
  } else {
     // Fallback če ni AI podatkov
     const sqlTrends = await supabase.rpc('get_trending_words', { hours_lookback: 48, limit_count: 8 })
     trendsData = sqlTrends.data || []
  }

  // Obdelava Trending Novic
  // Podatki v bazi so že v pravem formatu (JSON), samo preberemo jih
  const initialTrendingNews = groupsRes.data?.data || []

  return { props: { initialNews, initialTrendingWords: trendsData, initialTrendingNews } }
}
