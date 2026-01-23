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
  // --- STATE ---
  const [itemsLatest, setItemsLatest] = useState<NewsItem[]>(initialNews)
  const [itemsTrending, setItemsTrending] = useState<NewsItem[]>([])
     
  const [mode, setMode] = useState<Mode>('latest')
  const [trendingLoaded, setTrendingLoaded] = useState(false)
  const lastTrendingFetchRef = useRef<number>(0)

  // Novo: Desktop detekcija za 2-stolpčni layout
  const [isDesktop, setIsDesktop] = useState(false)

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

  // --- INIT & RESIZE ---
  useEffect(() => {
    kickSyncIfStale(5 * 60_000)
    setBootRefreshed(true)

    // Detekcija širine zaslona
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Samodejno nalaganje TRENDING novic, če smo na desktopu (ker rabimo zapolniti desni stolpec)
  useEffect(() => {
    if (isDesktop && !trendingLoaded && !isRefreshing && bootRefreshed) {
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
  }, [isDesktop, trendingLoaded, isRefreshing, bootRefreshed])

  // --- RESET ---
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

  // --- FETCHING GLAVNE VSEBINE ---
  useEffect(() => {
    if (!bootRefreshed) return
    // Na desktopu "mode" ne vpliva na skrivanje vsebine, ampak na mobilcu da.
    // Če iščemo (search/tag), ponavadi iščemo po "latest" endpointu.
    if (mode === 'trending' && !searchQuery && !tagQuery && !isDesktop) return

    const fetchData = async () => {
        setIsRefreshing(true)
        setCursor(null)
        setHasMore(true)
        
        const fresh = await loadNews('latest', selectedSources, selectedCategory, searchQuery || null, tagQuery || null)
        
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

  }, [selectedSources, selectedCategory, searchQuery, tagQuery, mode, bootRefreshed, isDesktop])

  // --- POLLING ZA NOVE NOVICE (Samo Latest) ---
  const missCountRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!bootRefreshed) return
    const runCheckSimple = async () => {
      // Polling samo, če gledamo latest
      if (mode !== 'latest' && !isDesktop) return
      if (searchQuery || tagQuery) return

      kickSyncIfStale(10 * 60_000)
      const fresh = await loadNews('latest', selectedSources, selectedCategory, null, null)
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
      if (mode !== 'latest' && !isDesktop) return
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
  }, [itemsLatest, bootRefreshed, mode, selectedSources, selectedCategory, searchQuery, tagQuery, isDesktop])

  // --- USER REFRESH ---
  useEffect(() => {
    const onRefresh = () => {
      window.dispatchEvent(new CustomEvent('news-refreshing', { detail: true }))
      startTransition(() => {
        // Refreshamo tisto, kar je trenutno glavni fokus. 
        // Na desktopu lahko oboje, ampak primarno 'latest'.
        const targetMode = (mode === 'trending' && !isDesktop) ? 'trending' : 'latest'

        loadNews(targetMode, selectedSources, selectedCategory, searchQuery || null, tagQuery || null, true).then((fresh) => {
          if (fresh) {
            if (targetMode === 'latest') {
              setItemsLatest(fresh)
              setHasMore(true)
              setCursor(null)
            } else {
              setItemsTrending(fresh)
              setTrendingLoaded(true)
              lastTrendingFetchRef.current = Date.now() 
            }
          }
          // Če smo na desktopu, osvežimo še trending v ozadju
          if (isDesktop && targetMode === 'latest') {
             loadNews('trending', [], 'vse', null, null, true).then(tr => {
                 if (tr) setItemsTrending(tr)
             })
          }

          window.dispatchEvent(new CustomEvent('news-refreshing', { detail: false }))
          window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
          missCountRef.current = 0
        })
      })
    }
    window.addEventListener('refresh-news', onRefresh as EventListener)
    return () => window.removeEventListener('refresh-news', onRefresh as EventListener)
  }, [mode, selectedSources, selectedCategory, searchQuery, tagQuery, isDesktop])

  // --- PAGINATION CURSOR ---
  const visibleNews = (mode === 'trending' && !isDesktop) ? itemsTrending : itemsLatest

  useEffect(() => {
    if (mode === 'trending' && !isDesktop) return 
    if (!visibleNews.length) {
      setCursor(null)
      return
    }
    const minMs = visibleNews.reduce((acc, n) => Math.min(acc, n.publishedAt || acc), visibleNews[0].publishedAt || 0)
    setCursor(minMs || null)
  }, [visibleNews, mode, isDesktop])

  async function fetchPage(cursorVal: number) {
    const qs = new URLSearchParams()
    qs.set('paged', '1')
    qs.set('limit', '25') 
    qs.set('cursor', String(cursorVal))
    if (selectedSources.length > 0) qs.set('source', selectedSources.join(','))
    if (selectedCategory !== 'vse') qs.set('category', selectedCategory)
    if (searchQuery) qs.set('q', searchQuery)
    if (tagQuery) qs.set('tag', tagQuery) 
    const res = await fetch(`/api/news?${qs.toString()}`, { cache: 'no-store' })
    if (!res.ok) return { items: [], nextCursor: null }
    return await res.json()
  }

  const handleLoadMore = async () => {
    // Load more dela samo za 'latest' seznam
    if (mode !== 'latest' && !isDesktop) return
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
        setIsRefreshing(true)
        try {
          const fresh = await loadNews('trending', [], 'vse', null, null)
          if (fresh) {
            setItemsTrending(fresh); 
            setTrendingLoaded(true); 
            lastTrendingFetchRef.current = Date.now() 
          }
        } catch (e) { 
            console.error(e) 
        } finally {
            setIsRefreshing(false)
        }
      }
    }
  }

  const activeSourceLabel = selectedSources.length === 0 
    ? 'Vse' 
    : selectedSources.length === 1 
      ? selectedSources[0] 
      : `${selectedSources.length} virov`

  const currentCategoryLabel = selectedCategory === 'vse' 
    ? '' 
    : CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory;

  const handleTrendingClick = (word: string) => {
    let clean = word.replace(/^#/, '').trim();
     
    // Ko kliknemo tag, gremo vedno na iskanje po Latest
    setItemsLatest([]); 
    setIsRefreshing(true); 

    window.scrollTo({ top: 0, behavior: 'smooth' })
    setSearchQuery('') 
    setTagQuery(clean) 
     
    if (mode === 'trending') {
        setMode('latest');
        setHasMore(true); 
        setCursor(null);
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // --- LAYOUT LOGIC ---
  // Na desktopu sta prikazana oba stolpca. Na mobilcu se izmenjujeta glede na 'mode'.
  const showLatest = isDesktop || mode === 'latest'
  const showTrending = isDesktop || mode === 'trending'

  return (
    <>
      <Header 
        onOpenFilter={() => setFilterModalOpen(true)}
        onSearch={(q) => { 
            setSearchQuery(q); 
            setTagQuery(''); 
        }} 
        activeSource={activeSourceLabel}
        activeCategory={selectedCategory}
        onSelectCategory={(cat) => {
           startTransition(() => {
             setSelectedCategory(cat)
             // Če nismo 'vse', avtomatsko preklopimo na 'latest' pregled
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

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-8">
        
        <div className="max-w-[1800px] mx-auto w-full">

            {/* --- ZGORNJA VRSTICA: Kontrole & Tags --- */}
            <div className="px-4 md:px-8 lg:px-16 pt-2 pb-1 flex flex-col md:flex-row md:items-center gap-y-2 md:gap-4 border-b border-transparent mb-4">
                
                {/* LEVO: Tabi (samo Mobile) ali Naslov Kategorije */}
                <div className="flex items-center justify-between gap-2 w-full md:w-auto shrink-0">
                    
                    {/* Mobile Tabs - skriti na desktopu, ker imamo 2 stolpca */}
                    <div className="lg:hidden scale-90 origin-left shrink-0 -ml-2 -mr-3">
                        {selectedCategory === 'vse' ? (
                            <NewsTabs active={mode} onChange={handleTabChange} />
                        ) : (
                            <div className="px-2 py-1">
                                <span className="text-xl font-bold tracking-tight capitalize">
                                    {currentCategoryLabel}
                                </span>
                            </div>
                        )}
                    </div>
                    
                    {/* Desktop Category Label */}
                    <div className="hidden lg:block">
                        {selectedCategory !== 'vse' && (
                             <span className="text-2xl font-bold tracking-tight capitalize mr-4">
                                {currentCategoryLabel}
                             </span>
                        )}
                    </div>

                    {/* Mobile Search Input */}
                    <div className="md:hidden flex-1 min-w-0 ml-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="search"
                          placeholder="Išči ..."
                          className="w-full h-9 pl-9 pr-4 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-sm placeholder-gray-500 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand/50"
                          value={searchQuery}
                          onChange={handleSearchChange}
                        />
                    </div>
                </div>

                {/* SREDINA/DESNO: Trending Keywords (Vedno vidno na desktopu, pogojno na mobile) */}
                {(isDesktop || (mode === 'latest' && selectedCategory === 'vse' && !searchQuery && !tagQuery)) && (
                  <div className="min-w-0 overflow-hidden w-full md:flex-1 mt-0.5 md:mt-0">
                      <TrendingBar 
                        words={initialTrendingWords}
                        selectedWord={tagQuery || searchQuery} 
                        onSelectWord={handleTrendingClick} 
                      />
                  </div>
                )}
                
                {/* DESNO: Filtri gumb */}
                {selectedSources.length > 0 && (
                  <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">
                    <div className="text-xs text-brand font-medium border border-brand/20 bg-brand/5 px-2 py-1 rounded whitespace-nowrap">
                      Filtri: {selectedSources.length}
                    </div>
                    <button 
                      onClick={() => setSelectedSources([])} 
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md" 
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                  </div>
                )}
            </div>

            {/* --- GLAVNA VSEBINA: 2 STOLPCA NA DESKTOPU --- */}
            <div className="px-4 md:px-8 lg:px-16 flex flex-col lg:flex-row gap-8">
                
                {/* 1. LEVI STOLPEC: LATEST (2/3) */}
                <div className={`flex-1 min-w-0 ${!showLatest ? 'hidden' : ''}`}>
                    
                    {(searchQuery || tagQuery) && (
                        <div className="mb-6 flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                                Rezultati za: <span className="font-bold text-gray-900 dark:text-white">"{tagQuery || searchQuery}"</span>
                            </span>
                            <button 
                                onClick={() => { setSearchQuery(''); setTagQuery(''); }}
                                className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                            >
                                Počisti ✕
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {isRefreshing && itemsLatest.length === 0 ? (
                        <div className="flex flex-col items-center justify-center pt-20 pb-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-4"></div>
                            <p className="opacity-60">Iščem novice ...</p>
                        </div>
                    ) : itemsLatest.length === 0 ? (
                        <div className="flex flex-col items-center justify-center pt-20 pb-20 text-center">
                            {(searchQuery || tagQuery) ? (
                                <p className="opacity-60">Ni rezultatov za iskanje &quot;{tagQuery || searchQuery}&quot;.</p>
                            ) : (
                                <p className="opacity-60">Trenutno ni novic s temi filtri.</p>
                            )}
                        </div>
                    ) : (
                        // Grid za novice
                        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                            {itemsLatest.map((article, i) => (
                                <div key={article.link + '|' + i} className="col-span-1">
                                    <ArticleCard 
                                        news={article} 
                                        priority={i < 6} 
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Load More Button */}
                    {hasMore && itemsLatest.length > 0 && (
                        <div className="text-center mt-10 mb-4">
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                className="px-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm font-medium disabled:opacity-50"
                            >
                                {isLoadingMore ? 'Nalagam...' : 'Naloži starejše novice'}
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. DESNI STOLPEC: TRENDING (1/3) - Sidebar na Desktopu */}
                <aside className={`lg:w-[380px] xl:w-[420px] shrink-0 ${!showTrending ? 'hidden' : ''}`}>
                    
                    <div className="lg:sticky lg:top-24 transition-all">
                        {/* Naslov na Desktopu */}
                        <div className="hidden lg:flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
                             <span className="text-lg font-bold text-gray-900 dark:text-white">🔥 Aktualno</span>
                        </div>

                        {/* Loading State za Trending */}
                        {itemsTrending.length === 0 && !trendingLoaded ? (
                             <div className="py-12 text-center opacity-50 text-sm">Nalagam aktualno ...</div>
                        ) : (
                            // Grid ali Stack, odvisno od naprave
                            <div className={`
                                ${isDesktop ? 'flex flex-col gap-5' : 'grid gap-4 sm:grid-cols-2'}
                            `}>
                                {itemsTrending.map((article, i) => (
                                    <div key={article.link + '|tr|' + i}>
                                        <TrendingCard news={article} />
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Footer v sidebaru na desktopu */}
                        <div className="hidden lg:block mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-xs text-gray-400 text-center">
                                © 2026 Križišče. Vse pravice pridržane.
                            </p>
                        </div>
                    </div>
                </aside>

            </div>
        </div>

      </main>

      <BackToTop threshold={200} />
      {/* Footer prikažemo na mobilcu vedno, na desktopu ga lahko skrijemo, če ga imamo v sidebaru, ali pa pustimo na dnu */}
      <div className="lg:hidden">
         <Footer />
      </div>
    </>
  )
}

/* ================= SSR ================= */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  )

  const { createClient } = await import('@supabase/supabase-js')
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })

  const newsPromise = supabase
    .from('news')
    .select('id, link, title, source, summary, contentsnippet, image, published_at, publishedat, category')
    .neq('category', 'oglas')
    .order('publishedat', { ascending: false })
    .order('id', { ascending: false })
    .limit(25)

  let trendsData: any[] = []

  const { data: aiData } = await supabase
    .from('trending_ai')
    .select('words')
    .order('updated_at', { ascending: false }) 
    .limit(1) 
    .single()

  if (aiData && aiData.words && Array.isArray(aiData.words) && aiData.words.length > 0) {
     trendsData = aiData.words.map((w: string) => ({ 
       word: w, 
       count: 1 
     }))
  } else {
     const sqlTrends = await supabase.rpc('get_trending_words', {
       hours_lookback: 48,
       limit_count: 8
     })
     trendsData = sqlTrends.data || []
  }

  const [newsRes] = await Promise.all([newsPromise])

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

  const initialTrendingWords: TrendingWord[] = trendsData as TrendingWord[]

  return { 
    props: { 
      initialNews, 
      initialTrendingWords 
    } 
  }
}
