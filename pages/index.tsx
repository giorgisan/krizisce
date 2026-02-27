/* pages/index.tsx */
import React, {
  useEffect,
  useState,
  startTransition,
  useRef,
} from 'react'
import { GetServerSideProps } from 'next'
import Link from 'next/link'

import { NewsItem } from '@/types'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import ArticleCard from '@/components/ArticleCard'
import TrendingCard from '@/components/TrendingCard'
import TrendingBar, { TrendingWord } from '@/components/TrendingBar' 
import AiBriefing from '@/components/AiBriefing'
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
      const data = await res.json()
      if (Array.isArray(data)) {
          return data 
      } else if (data && Array.isArray(data.items)) {
          return data.items 
      }
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
  initialTrendingNews: NewsItem[]
  aiSummary: string | null
  aiTime: string | null
}

export default function Home({ initialNews, initialTrendingWords, initialTrendingNews, aiSummary, aiTime }: Props) {
  const [itemsLatest, setItemsLatest] = useState<NewsItem[]>(initialNews)
  const [itemsTrending, setItemsTrending] = useState<NewsItem[]>(initialTrendingNews || [])
  const [trendingLoaded, setTrendingLoaded] = useState(!!initialTrendingNews?.length)
  
  const [currentAiSummary, setCurrentAiSummary] = useState(aiSummary)
  const [currentAiTime, setCurrentAiTime] = useState(aiTime)
      
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

  useEffect(() => {
    if (isDesktopLogic && !isRefreshing && bootRefreshed) {
        const now = Date.now();
        if (!trendingLoaded || (now - lastTrendingFetchRef.current > 15 * 60_000)) {
              const fetchTrendingSide = async () => {
                try {
                  const res = await fetch('/api/news?variant=trending')
                  const data = await res.json()
                  if (data) {
                      const freshItems = Array.isArray(data) ? data : (data.items || [])
                      setItemsTrending(freshItems)
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
          }
        })
        fetch('/api/news?variant=trending&forceFresh=1&_t=' + Date.now())
          .then(res => res.json())
          .then(data => {
            if (data) {
                if (data.items && Array.isArray(data.items)) setItemsTrending(data.items);
                else if (Array.isArray(data)) setItemsTrending(data);
                if (data.aiSummary) {
                    setCurrentAiSummary(data.aiSummary);
                    setCurrentAiTime(data.aiTime);
                }
            }
          })
          .catch(() => {})
        window.dispatchEvent(new CustomEvent('news-refreshing', { detail: false }))
        window.dispatchEvent(new CustomEvent('news-has-new', { detail: false }))
        missCountRef.current = 0
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
          const data = await res.json()
          const items = Array.isArray(data) ? data : (data.items || [])
          const nextCursor = data.nextCursor
          const seen = new Set(itemsLatest.map((n) => n.link))
          const fresh = items
            .filter((i: any) => !seen.has(i.link))
            .map((i: any) => ({ ...i, category: i.category || determineCategory({ link: i.link, categories: [] }) }))
          if (fresh.length) setItemsLatest((prev) => [...prev, ...fresh])
          if (items.length === 0) {
            setHasMore(false); setCursor(null)
          } else {
             const newCursor = nextCursor || items[items.length - 1].publishedAt
             setCursor(newCursor); setHasMore(true)
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
      if (!trendingLoaded || (now - lastTrendingFetchRef.current) > 5 * 60_000) {
        setIsRefreshing(true)
        try {
          const res = await fetch('/api/news?variant=trending')
          const data = await res.json()
          if (data) {
              const items = Array.isArray(data) ? data : (data.items || [])
              setItemsTrending(items)
              setTrendingLoaded(true)
              lastTrendingFetchRef.current = Date.now()
          }
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

  const isSearchOrTag = !!(searchQuery || tagQuery);
  const showHeaderElements = !isSearchOrTag;
  const showHeroSection = showHeaderElements && selectedCategory === 'vse' && mode === 'latest';

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
             if (cat !== 'vse' || mode !== 'latest') { setMode('latest'); setHasMore(true); setCursor(null) }
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

            {selectedCategory === 'vse' && !isSearchOrTag && (
                <div className="lg:hidden mt-3 mb-2">
                    <NewsTabs active={mode} onChange={handleTabChange} />
                </div>
            )}

            {selectedCategory !== 'vse' && !isSearchOrTag && (
                <div className="lg:hidden mt-4 mb-4">
                    <h1 className="text-2xl font-bold capitalize">{currentCategoryLabel}</h1>
                </div>
            )}

            {/* --- TOP TRENDING BAR --- */}
            {showHeroSection && (
                 <div className="mt-2 mb-4 min-w-0 w-full overflow-hidden">
                    <TrendingBar 
                        words={initialTrendingWords} 
                        selectedWord={tagQuery || searchQuery} 
                        onSelectWord={handleTrendingClick} 
                    />
                 </div>
            )}

            {(searchQuery || tagQuery) && (
                <div className="mt-4 mb-4 flex items-center gap-2 text-sm">
                    <span>Rezultati za: <b>"{tagQuery || searchQuery}"</b></span>
                    <button onClick={() => { setSearchQuery(''); setTagQuery(''); }} className="text-brand text-xs underline">Počisti</button>
                </div>
            )}

            {/* --- HERO SEKCIJA: AI Briefing (Levo) & Medijski Monitor (Desno) --- */}
            {showHeroSection && (
                 <div className="flex flex-col lg:flex-row gap-8 items-stretch mb-6">
                     
                     {/* Levi stolpec - Ai Briefing */}
                     <div className="flex-1 w-full min-w-0">
                         {currentAiSummary && (
                             <AiBriefing summary={currentAiSummary} time={currentAiTime} />
                         )}
                     </div>

                     {/* Desni stolpec - Medijski Monitor Banner (Incognito stil) */}
                     <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0">
                         <Link href="/analiza" className="group block h-full bg-white/60 dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 hover:shadow-md hover:bg-white dark:hover:bg-gray-800 hover:border-brand/30 transition-all duration-300 overflow-hidden relative">
                             <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                             <div className="flex items-center justify-between gap-4 relative z-10 h-full">
                                 <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/50 text-gray-400 group-hover:bg-brand/10 group-hover:text-brand flex items-center justify-center shrink-0 transition-all duration-300 border border-gray-100/50 dark:border-gray-700/50 group-hover:border-brand/20 shadow-sm group-hover:shadow-none">
                                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672Zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5" />
                                         </svg>
                                     </div>
                                     <div>
                                         <h3 className="text-[15px] font-bold text-gray-700 dark:text-gray-300 mb-0.5 group-hover:text-brand transition-colors">Medijski Monitor</h3>
                                         <p className="text-[12px] text-gray-500/80 dark:text-gray-400/80 transition-colors group-hover:text-gray-500 dark:group-hover:text-gray-400">Analiza pristopa k poročanju.</p>
                                     </div>
                                 </div>
                                 <div className="shrink-0 text-brand text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-all opacity-70 group-hover:opacity-100">
                                     Preveri <span className="text-lg leading-none">›</span>
                                 </div>
                             </div>
                         </Link>
                     </div>
                 </div>
            )}

            {/* --- GLAVNA GRID SEKCIJA --- */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                
                {/* --- LEVI STOLPEC (Novice) --- */}
                <div className={`flex-1 w-full min-w-0 ${mode === 'trending' ? 'hidden lg:block' : 'block'}`}>
                    
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
                                    priority={i < 4} 
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

                {/* --- DESNI STOLPEC (Trending Sidebar) --- */}
                <div className={`w-full lg:w-[340px] xl:w-[380px] shrink-0 lg:sticky lg:top-24 transform-gpu 
                    ${mode === 'trending' ? 'block' : 'hidden lg:block'}
                `}>
                    {mode === 'trending' && !isDesktopLogic ? (
                         <div className="flex flex-col gap-4">
                            {itemsTrending.slice(0, 10).map((article, i) => (
                                <TrendingCard 
                                    key={article.link + 'tr' + i}
                                    news={article} 
                                    compact={true} 
                                    rank={i + 1}
                                />
                            ))}
                         </div>
                    ) : (
                        <div className={`
                            bg-gray-200/70 dark:bg-gray-800/90 rounded-2xl backdrop-blur-md shadow-inner flex flex-col
                            lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden
                        `}>
                            <div className="flex items-center gap-2 mb-0 p-4 pb-2 border-b border-gray-300/50 dark:border-gray-700 shrink-0 z-10 bg-inherit rounded-t-2xl">
                                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-900 dark:text-gray-100">
                                    Aktualno
                                </span>
                            </div>

                            <div className="p-4 pt-2 space-y-3 lg:overflow-y-auto lg:custom-scrollbar">
                                {itemsTrending.length === 0 && !trendingLoaded ? (
                                    <div className="flex flex-col gap-3 animate-pulse">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="h-24 bg-gray-300 dark:bg-gray-700 rounded-xl" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {itemsTrending.slice(0, 10).map((article, i) => (
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
                    )}
                </div>
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

  const newsPromise = supabase.from('news').select('id, link, title, source, contentsnippet, image, published_at, publishedat, category').neq('category', 'oglas').order('publishedat', { ascending: false }).order('id', { ascending: false }).limit(24)
  const trendsWordsPromise = supabase.from('trending_ai').select('words, summary, updated_at').order('updated_at', { ascending: false }).limit(1).single()
  const trendingGroupsPromise = supabase.from('trending_groups_cache').select('data').order('updated_at', { ascending: false }).limit(1).single()

  const [newsRes, wordsRes, groupsRes] = await Promise.all([newsPromise, trendsWordsPromise, trendingGroupsPromise])

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

  let trendsData: any[] = []
  let aiSummary = null;
  let aiTime = null;

  const aiData = wordsRes.data
  if (aiData) {
      if (aiData.words?.length) {
          trendsData = aiData.words.map((w: string) => ({ word: w, count: 1 }))
      }
      if (aiData.summary) {
          aiSummary = aiData.summary
      }
      if (aiData.updated_at) {
          aiTime = aiData.updated_at;
      }
  } 
  
  if (trendsData.length === 0) {
      const sqlTrends = await supabase.rpc('get_trending_words', { hours_lookback: 48, limit_count: 8 })
      trendsData = sqlTrends.data || []
  }

  const initialTrendingNews = groupsRes.data?.data || []

  return { props: { initialNews, initialTrendingWords: trendsData, initialTrendingNews, aiSummary, aiTime } }
}
