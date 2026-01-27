'use client'

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
  compact?: boolean // Za sidebar prikaz
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
  const raw =
    news.storyArticles ||
    news.storyItems ||
    news.otherSources ||
    news.related ||
    news.members ||
    []

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
  const storyPrimary =
    Array.isArray(news.storyArticles) && news.storyArticles.length
      ? news.storyArticles[0]?.source
      : null
  return (
    storyPrimary ||
    news.primarySource ||
    news.mainSource ||
    news.lastSource ||
    news.source ||
    ''
  )
}

function formatRelativeTime(
  ms: number | null | undefined,
  now: number,
): string {
  if (!ms) return ''
  const diff = now - ms
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(min / 60)
  if (diff < 60_000) return 'zdaj'
  if (min < 60) return `pred ${min} min`
  if (hr < 24) return `pred ${hr} h`
  const d = new Date(ms)
  return new Intl.DateTimeFormat('sl-SI', {
    day: 'numeric',
    month: 'short',
  }).format(d)
}

export default function TrendingCard({ news, compact = false, rank }: Props) {
  // --- ČAS ---
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

  // --- TOUCH DETEKCIJA ---
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    try {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches
      const touchCap = ((navigator as any).maxTouchPoints || (navigator as any).msMaxTouchPoints) > 0
      setIsTouch(!!coarse || !!touchCap || 'ontouchstart' in window)
    } catch { setIsTouch(false) }
  }, [])

  // --- SLIKA ---
  const rawImg = news.image ?? null
  const proxyInitiallyOn = !!rawImg

  const [useProxy, setUseProxy] = useState<boolean>(proxyInitiallyOn)
  const [useFallback, setUseFallback] = useState<boolean>(!rawImg)
  const [imgLoaded, setImgLoaded] = useState<boolean>(false)
  const [imgKey, setImgKey] = useState<number>(0)

  const cardRef = useRef<HTMLAnchorElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const currentSrc = useMemo(() => {
    if (!rawImg) return null
    if (compact) return proxiedImage(rawImg, 320, 320, 1) // Večja kvaliteta za mobile
    if (useProxy) return proxiedImage(rawImg, 640, 360, 1)
    return rawImg
  }, [rawImg, useProxy, compact])

  const srcSet = useMemo(() => {
    if (!rawImg || !useProxy || compact) return ''
    return buildSrcSet(rawImg, IMAGE_WIDTHS, ASPECT)
  }, [rawImg, useProxy, compact])

  const lqipSrc = useMemo(() => {
    if (!rawImg) return null
    return proxiedImage(rawImg, 28, 16, 1)
  }, [rawImg])

  useEffect(() => {
    setUseProxy(!!rawImg)
    setUseFallback(!rawImg)
    setImgLoaded(false)
    setImgKey((k) => k + 1)
  }, [news.link, rawImg])

  const handleImgError = () => {
    if (rawImg && useProxy) {
      setUseProxy(false)
      setImgLoaded(false)
      setImgKey((k) => k + 1)
      return
    }
    if (!useFallback) {
      setUseFallback(true)
      setImgLoaded(false)
    }
  }

  // --- ANALITIKA ---
  const sendBeacon = (payload: any) => {
    try {
      const json = JSON.stringify(payload)
      if ('sendBeacon' in navigator) {
        navigator.sendBeacon('/api/click', new Blob([json], { type: 'application/json' }))
      } else {
        fetch('/api/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: json,
          keepalive: true,
        })
      }
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

  // --- PREVIEW ---
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  const preloadedRef = useRef(false)
  const triggerPrefetch = () => {
    if (!preloadedRef.current && canPrefetch()) {
      preloadedRef.current = true
      preloadPreview(news.link).catch(() => {})
      if (rawImg) {
         const url = proxiedImage(rawImg, 1280, 720, 1)
         warmImage(url)
      }
    }
  }

  // --- PODATKI ---
  const primarySource = getPrimarySource(news)
  const relatedAll = extractRelatedItems(news)
  const related = relatedAll.filter((r) => r.link !== news.link)

  // ================= RENDER: COMPACT (Sidebar + Mobile Trendi) =================
  if (compact) {
    return (
      <>
      <div 
        className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all p-3 sm:p-4 lg:p-3 flex gap-4 lg:gap-3"
        title={(news as any).contentSnippet || news.title}
      >
        
        <a 
          href={news.link}
          target="_blank"
          rel="noopener"
          onClick={handleClick}
          onMouseEnter={triggerPrefetch}
          className="absolute inset-0 z-0 rounded-xl"
          aria-hidden="true"
        />

        {rank && (
            <div className="absolute top-0 left-0 w-7 h-7 lg:w-6 lg:h-6 bg-gray-900 dark:bg-white flex items-center justify-center rounded-br-xl lg:rounded-br-lg z-20 shadow-md pointer-events-none">
                <span className="text-sm lg:text-xs font-bold text-white dark:text-gray-900 font-serif">{rank}</span>
            </div>
        )}

        {/* SLIKA: Večja na mobile (w-28), manjša na desktopu (lg:w-24) */}
        <div className="shrink-0 w-28 h-28 lg:w-24 lg:h-24 relative rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 z-10 pointer-events-auto shadow-sm">
             <div onClick={(e) => { handleClick(e as any) }} className="absolute inset-0 cursor-pointer">
                 {currentSrc && !useFallback ? (
                     <img 
                        key={imgKey}
                        src={currentSrc} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={handleImgError}
                        onLoad={() => setImgLoaded(true)}
                     />
                 ) : (
                     <div className="w-full h-full grid place-items-center text-[10px] text-gray-400">IMG</div>
                 )}
             </div>

             {/* OKO: Večje na mobile (h-9), manjše na desktopu (lg:h-8) */}
             <button
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  setPreviewUrl(news.link)
                }}
                className={`
                    absolute top-1 right-1 
                    h-9 w-9 lg:h-8 lg:w-8 grid place-items-center
                    bg-white/90 dark:bg-gray-900/90 rounded-full shadow-sm 
                    text-gray-700 dark:text-gray-200 
                    transition-all duration-200 hover:scale-110 z-20
                    opacity-100 lg:opacity-0 lg:group-hover:opacity-100
                `}
                title="Hitri predogled"
             >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
             </button>
        </div>

        {/* VSEBINA: Večji font na mobile */}
        <div className="flex flex-col min-w-0 flex-1 justify-center relative z-10 pointer-events-none">
            <div className="flex items-center gap-2 mb-1.5 lg:mb-1">
                <span className="text-[11px] lg:text-[10px] uppercase font-bold tracking-wider" style={{ color: sourceColor }}>
                    {news.source}
                </span>
                <span className="text-[11px] lg:text-[10px] text-gray-400">{primaryTime}</span>
            </div>
            
            {/* NASLOV: Večji na mobile (text-[15px]), manjši v sidebaru (lg:text-[14px]) */}
            <h4 className="text-[15px] lg:text-[14px] font-bold leading-snug text-gray-900 dark:text-gray-100 line-clamp-3 lg:line-clamp-2 group-hover:text-brand transition-colors mb-2 lg:mb-0">
                {news.title}
            </h4>

            {related.length > 0 && (
                <div className="mt-auto lg:mt-2 pt-2 lg:pt-1 border-t border-gray-100 dark:border-gray-700/50 flex items-center gap-2 lg:gap-1.5 pointer-events-auto">
                    <span className="text-[10px] lg:text-[9px] text-gray-400 whitespace-nowrap">Beri tudi:</span>
                    <div className="flex -space-x-1 hover:space-x-1 transition-all">
                        {related.slice(0, 4).map((r, i) => {
                             const logo = getSourceLogoPath(r.source)
                             return (
                                 <a 
                                    key={i} 
                                    href={r.link}
                                    target="_blank"
                                    rel="noopener"
                                    title={`Preberi na ${r.source}`}
                                    className="w-6 h-6 lg:w-5 lg:h-5 rounded-full bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center overflow-hidden hover:scale-125 hover:z-20 transition-transform shadow-sm cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation() 
                                        logClick('open_related', { parent: news.link, url: r.link })
                                    }}
                                 >
                                     {logo ? (
                                         <Image src={logo} alt={r.source} width={20} height={20} className="w-full h-full object-cover" />
                                     ) : (
                                         <span className="text-[8px] font-bold text-gray-500">{r.source[0]}</span>
                                     )}
                                 </a>
                             )
                        })}
                    </div>
                </div>
            )}
        </div>
      </div>
      
      {previewUrl && (
        <ArticlePreview 
            url={previewUrl} 
            onClose={() => setPreviewUrl(null)} 
        />
      )}
      </>
    )
  }

  // ================= RENDER: STANDARD (Nespremenjeno) =================
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
        onMouseLeave={() => { setEyeVisible(false)} }
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
          {(primarySource || related.length > 0) && (
            <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-700">
               <div className="flex items-center gap-1.5 mb-2 opacity-80">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                     Pokrivajo tudi
                  </span>
               </div>
               {related.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">Samo en vir.</span>
               ) : (
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
                   </div>
               )}
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
