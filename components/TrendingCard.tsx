/* components/TrendingCard.tsx */
import { NewsItem } from '@/types'
import {
  MouseEvent,
  useMemo,
  useRef,
  useState,
  useEffect,
  ComponentType,
} from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { proxiedImage, buildSrcSet } from '@/lib/img'
import { preloadPreview, canPrefetch, warmImage } from '@/lib/previewPrefetch'
import { sourceColors } from '@/lib/sources'
import { getSourceLogoPath } from '@/lib/sourceMeta'

type PreviewProps = { url: string; onClose: () => void }
const ArticlePreview = dynamic(() => import('./ArticlePreview'), {
  ssr: false,
}) as ComponentType<PreviewProps>

const ASPECT = 16 / 9
const IMAGE_WIDTHS = [320, 480, 640, 960, 1280]

interface Props {
  news: NewsItem & { [key: string]: any }
  compact?: boolean // Za sidebar in mobile trending prikaz
  rank?: number     // Zaporedna številka
}

type RelatedItem = {
  source: string
  title: string
  link: string
  publishedAt?: number | null
}

/* ================= HELPERJI ================= */

function extractRelatedItems(news: any): RelatedItem[] {
  const raw = news.storyArticles || news.storyItems || news.otherSources || news.related || news.members || []
  if (!Array.isArray(raw)) return []
  return raw
    .map((r: any): RelatedItem | null => {
      if (!r || !r.link || !r.title || !r.source) return null
      return {
        source: String(r.source),
        title: String(r.title),
        link: String(r.link),
        publishedAt: typeof r.publishedAt === 'number' ? r.publishedAt : null,
      }
    })
    .filter(Boolean) as RelatedItem[]
}

function getPrimarySource(news: any): string {
  const storyPrimary = Array.isArray(news.storyArticles) && news.storyArticles.length ? news.storyArticles[0]?.source : null
  return storyPrimary || news.primarySource || news.mainSource || news.lastSource || news.source || ''
}

function formatRelativeTime(ms: number | null | undefined, now: number): string {
  if (!ms) return ''
  const diff = now - ms
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(min / 60)
  if (diff < 60_000) return 'zdaj'
  if (min < 60) return `pred ${min} min`
  if (hr < 24) return `pred ${hr} h`
  const d = new Date(ms)
  return new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'short' }).format(d)
}

export default function TrendingCard({ news, compact = false, rank }: Props) {
  if (!news || !news.title) return null
  
  const [minuteTick, setMinuteTick] = useState(0)
  useEffect(() => {
    const onMinute = () => setMinuteTick((m) => (m + 1) % 60)
    window.addEventListener('ui:minute', onMinute as EventListener)
    return () => window.removeEventListener('ui:minute', onMinute as EventListener)
  }, [])

  const now = Date.now()
  const primaryTime = useMemo(() => {
    const ms = (news as any).publishedAt || 0
    return formatRelativeTime(ms, now)
  }, [news.publishedAt, minuteTick])

  const sourceColor = useMemo(() => {
    return (sourceColors as Record<string, string>)[news.source] || '#fc9c6c'
  }, [news.source])

  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    try {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches
      const touchCap = ((navigator as any).maxTouchPoints || (navigator as any).msMaxTouchPoints) > 0
      setIsTouch(!!coarse || !!touchCap || 'ontouchstart' in window)
    } catch { setIsTouch(false) }
  }, [])

  const rawImg = news.image ?? null
  const proxyInitiallyOn = !!rawImg

  const [useProxy, setUseProxy] = useState<boolean>(proxyInitiallyOn)
  const [useFallback, setUseFallback] = useState<boolean>(!rawImg)
  const [imgLoaded, setImgLoaded] = useState<boolean>(false)
  const [imgKey, setImgKey] = useState<number>(0)

  const cardRef = useRef<HTMLAnchorElement>(null)

  const currentSrc = useMemo(() => {
    if (!rawImg) return null
    if (compact) return proxiedImage(rawImg, 320, 320, 1) 
    if (useProxy) return proxiedImage(rawImg, 640, 360, 1)
    return rawImg
  }, [rawImg, useProxy, compact])

  const srcSet = useMemo(() => {
    if (!rawImg || !useProxy || compact) return ''
    return buildSrcSet(rawImg, IMAGE_WIDTHS, ASPECT)
  }, [rawImg, useProxy, compact])

  useEffect(() => {
    setUseProxy(!!rawImg)
    setUseFallback(!rawImg)
    setImgLoaded(false)
    setImgKey((k) => k + 1)
  }, [news.link, rawImg])

  const handleImgError = () => {
    if (rawImg && useProxy) {
      setUseProxy(false); setImgLoaded(false); setImgKey((k) => k + 1); return
    }
    if (!useFallback) { setUseFallback(true); setImgLoaded(false); }
  }

  const sendBeacon = (payload: any) => {
    try {
      const json = JSON.stringify(payload)
      if ('sendBeacon' in navigator) navigator.sendBeacon('/api/click', new Blob([json], { type: 'application/json' }))
      else fetch('/api/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json, keepalive: true })
    } catch {}
  }

  const logClick = (action = 'open', meta = {}) => {
    sendBeacon({ source: news.source, url: news.link, action, ...meta })
  }

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return
    e.preventDefault()
    window.open(news.link, '_blank', 'noopener')
    logClick()
  }

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const preloadedRef = useRef(false)
  const triggerPrefetch = () => {
    if (!preloadedRef.current && canPrefetch()) {
      preloadedRef.current = true
      preloadPreview(news.link).catch(() => {})
      if (rawImg) warmImage(proxiedImage(rawImg, 1280, 720, 1))
    }
  }

  const relatedAll = extractRelatedItems(news)
  const related = relatedAll.filter((r) => r.link !== news.link)

  // ================= RENDER: COMPACT (Sidebar + Mobile Trendi) =================
  if (compact) {
    return (
      <>
      <div className="group relative bg-transparent flex flex-col gap-3 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
        
        {/* GLAVNA VRSTICA (Slika + Naslov) */}
        <div className="flex gap-4 items-start">
            <a 
              href={news.link} target="_blank" rel="noopener" onClick={handleClick} onMouseEnter={triggerPrefetch}
              className="absolute inset-0 z-0" aria-hidden="true"
            />

            {/* SLIKA Z RANKOM */}
            <div className="shrink-0 w-24 h-24 relative rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 z-10 pointer-events-auto shadow-sm border border-gray-100 dark:border-white/5">
                 {rank && (
                    <div className="absolute top-0 left-0 w-6 h-6 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-br-lg z-20">
                        <span className="text-xs font-bold text-white">{rank}</span>
                    </div>
                 )}
                 <div onClick={(e) => { handleClick(e as any) }} className="absolute inset-0 cursor-pointer">
                     {currentSrc && !useFallback ? (
                         <img key={imgKey} src={currentSrc} alt="" className="w-full h-full object-cover" onError={handleImgError} onLoad={() => setImgLoaded(true)} />
                     ) : (
                         <div className="w-full h-full grid place-items-center text-[10px] text-gray-400">IMG</div>
                     )}
                 </div>
            </div>

            {/* NASLOV IN META */}
            <div className="flex flex-col min-w-0 flex-1 justify-start relative z-10 pointer-events-none pt-0.5">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded text-white shadow-sm" style={{ backgroundColor: sourceColor }}>
                        {news.source}
                    </span>
                    <span className="text-[11px] text-gray-400">{primaryTime}</span>
                </div>
                
                <h4 className="text-[16px] font-bold leading-snug text-gray-900 dark:text-gray-100 line-clamp-3 group-hover:text-brand transition-colors">
                    {news.title}
                </h4>
            </div>
        </div>

        {/* RELATED ITEMS (V svojem bloku spodaj) */}
        {related.length > 0 && (
            <div className="mt-0 pl-28 z-10 pointer-events-auto relative">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                    Pokrivajo tudi:
                </p>
                <div className="flex flex-col gap-2">
                    {related.slice(0, 3).map((r, i) => {
                        const logo = getSourceLogoPath(r.source)
                        return (
                            <a 
                               key={i} href={r.link} target="_blank" rel="noopener"
                               onClick={(e) => { e.stopPropagation(); logClick('open_related', { parent: news.link, url: r.link }) }}
                               className="flex items-start gap-2.5 group/rel hover:bg-gray-50 dark:hover:bg-gray-800/50 p-1.5 -ml-1.5 rounded transition-colors"
                            >
                                <div className="w-4 h-4 rounded-sm overflow-hidden shrink-0 mt-0.5">
                                    {logo ? <Image src={logo} alt={r.source} width={16} height={16} className="w-full h-full object-contain grayscale group-hover/rel:grayscale-0 opacity-80" /> : <div className="w-full h-full bg-gray-300"/>}
                                </div>
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate group-hover/rel:text-brand transition-colors leading-tight">
                                        {r.title}
                                    </span>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                        <span>{r.source}</span>
                                    </div>
                                </div>
                            </a>
                        )
                    })}
                    {related.length > 3 && (
                        <span className="text-[10px] text-gray-400 italic pl-7 hover:text-brand cursor-pointer">+ {related.length - 3} ostalih virov</span>
                    )}
                </div>
            </div>
        )}
      </div>
      
      {previewUrl && <ArticlePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />}
      </>
    )
  }

  // ================= RENDER: STANDARD (Article Card style with grouping) =================
  const [eyeVisible, setEyeVisible] = useState(false)
  const [eyeHover, setEyeHover] = useState(false)
  const showEye = isTouch ? true : eyeVisible

  return (
    <>
      <a
        ref={cardRef}
        href={news.link}
        target="_blank"
        rel="noopener"
        onClick={handleClick}
        onMouseEnter={() => { setEyeVisible(true); triggerPrefetch() }}
        onMouseLeave={() => setEyeVisible(false)}
        onTouchStart={triggerPrefetch}
        className="group block bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:border dark:border-gray-700/50"
      >
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-200 dark:bg-gray-700">
          {useFallback || !currentSrc ? (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400"><span className="text-xs">Ni slike</span></div>
          ) : (
             <img src={currentSrc as string} srcSet={srcSet} alt={news.title} className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 opacity-0 data-[ok=true]:opacity-100 group-hover:scale-105" onError={handleImgError} onLoad={() => setImgLoaded(true)} data-ok={imgLoaded} />
          )}
          
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(news.link) }}
            onMouseEnter={() => setEyeHover(true)}
            onMouseLeave={() => setEyeHover(false)}
            className={`absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur text-gray-700 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 transform-gpu ${showEye ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
            style={{ transform: eyeHover ? 'scale(1.1)' : undefined }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
          
          <div className="absolute bottom-2 left-2"><span className="text-[10px] font-bold text-white px-2 py-0.5 rounded shadow-sm backdrop-blur-md" style={{ backgroundColor: sourceColor }}>{news.source}</span></div>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-white line-clamp-3 group-hover:text-brand transition-colors">{news.title}</h3>
          <div className="flex items-center justify-between text-xs text-gray-500">
             <span>{primaryTime}</span>
             {(news as any).contentSnippet && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-400">Povzetek</span>}
          </div>
          {(related.length > 0) && (
            <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-700">
               <div className="flex items-center gap-1.5 mb-2 opacity-80">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                      Pokrivajo tudi
                  </span>
               </div>
               <div className="flex flex-col gap-1">
                   {related.slice(0, 3).map((item, idx) => {
                       const logo = getSourceLogoPath(item.source)
                       const relTime = formatRelativeTime(item.publishedAt, now)
                       return (
                           <button
                               key={item.link + idx}
                               onClick={(e) => {
                                   e.preventDefault(); e.stopPropagation();
                                   window.open(item.link, '_blank');
                                   logClick('open_related', { parent: news.link, url: item.link });
                               }}
                               className="group/rel w-full text-left p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-start gap-2 transition-colors"
                           >
                               <div className="mt-0.5 shrink-0">
                                   {logo ? (
                                       <Image src={logo} alt={item.source} width={16} height={16} className="rounded-sm opacity-70 group-hover/rel:opacity-100" />
                                   ) : (
                                       <div className="w-4 h-4 rounded-sm bg-gray-200 flex items-center justify-center text-[8px]">{item.source[0]}</div>
                                   )}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <div className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate group-hover/rel:text-brand transition-colors">
                                       {item.title}
                                   </div>
                                   <div className="flex justify-between items-center text-[10px] text-gray-400 mt-0.5">
                                       <span>{item.source}</span>
                                       <span>{relTime}</span>
                                   </div>
                               </div>
                           </button>
                       )
                   })}
                   
                   {related.length > 3 && (
                       <div className="px-1.5 py-1 text-xs text-gray-400 italic">
                           In še {related.length - 3} drugih virov...
                       </div>
                   )}
               </div>
            </div>
          )}
        </div>
      </a>

      {previewUrl && (
        <ArticlePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </>
  )
}
