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
  rank?: number     // Zaporedna številka za sidebar
}

type RelatedItem = {
  source: string
  title: string
  link: string
  publishedAt?: number | null
}

/* ================= HELPERJI (Ohranjeni) ================= */

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
  if (min < 60) return `${min}m` 
  if (hr < 24) return `${hr}h`
  const d = new Date(ms)
  return new Intl.DateTimeFormat('sl-SI', {
    day: 'numeric',
    month: 'short',
  }).format(d)
}

export default function TrendingCard({ news, compact = false, rank }: Props) {
  // Osveževanje časa
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

  // --- TOUCH LOGIKA ---
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    try {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches
      const touchCap = ((navigator as any).maxTouchPoints || (navigator as any).msMaxTouchPoints) > 0
      setIsTouch(!!coarse || !!touchCap || 'ontouchstart' in window)
    } catch { setIsTouch(false) }
  }, [])

  // --- SLIKA (Robustna logika) ---
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
    // Če je compact, rabimo manjšo sliko (npr 200px), sicer 640px
    const targetW = compact ? 200 : 640
    const targetH = compact ? 200 : 360 // 1:1 za compact, 16:9 za full
    
    if (useProxy) return proxiedImage(rawImg, targetW, targetH, 1)
    return rawImg
  }, [rawImg, useProxy, compact])

  const srcSet = useMemo(() => {
    if (!rawImg || !useProxy || compact) return '' // Za compact ne rabimo srcset
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
  const [eyeVisible, setEyeVisible] = useState(false)
  const [eyeHover, setEyeHover] = useState(false)
  // V compact načinu preview gumba ne kažemo (premajhno)
  const showEye = !compact && (isTouch ? true : eyeVisible)

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

  // --- RELATIONS ---
  const primarySource = getPrimarySource(news)
  const relatedAll = extractRelatedItems(news)
  const related = relatedAll.filter((r) => r.link !== news.link)

  // ================= RENDER: COMPACT VIEW =================
  if (compact) {
    return (
      <a
        ref={cardRef}
        href={news.link}
        target="_blank"
        rel="noopener"
        onClick={handleClick}
        onMouseEnter={triggerPrefetch}
        className="group flex gap-3 items-start p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700/50"
      >
        {/* Rank # (če obstaja) */}
        {rank && (
            <span className="text-xl font-bold text-gray-300 dark:text-gray-700 font-serif italic -mt-1 select-none">
                {rank}
            </span>
        )}

        {/* Mala Slika (Thumbnail) */}
        <div className="shrink-0 w-[72px] h-[72px] relative rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-700">
             {!imgLoaded && !useFallback && !!currentSrc && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
             )}
             
             {useFallback || !currentSrc ? (
                 <div className="w-full h-full grid place-items-center text-xs text-gray-400 bg-gray-100 dark:bg-gray-800">
                    <span className="opacity-50 text-[10px]">NO IMG</span>
                 </div>
             ) : (
                 <img 
                    key={imgKey}
                    src={currentSrc} 
                    alt="" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={handleImgError}
                    onLoad={() => setImgLoaded(true)}
                 />
             )}
        </div>

        {/* Tekstovna Vsebina */}
        <div className="flex flex-col min-w-0 flex-1 justify-center py-0.5">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700/50" style={{ color: sourceColor }}>
                    {news.source}
                </span>
                <span className="text-[10px] text-gray-400">{primaryTime}</span>
            </div>
            <h4 className="text-[13px] sm:text-[14px] font-semibold leading-tight text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-brand transition-colors">
                {news.title}
            </h4>
        </div>
      </a>
    )
  }

  // ================= RENDER: STANDARD VIEW (Mobile/Original) =================
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
        className="block bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg dark:border dark:border-gray-700/50"
      >
        {/* SLIKA */}
        <div
          className="relative w-full aspect-[16/9] overflow-hidden bg-gray-200 dark:bg-gray-700"
          style={
            !imgLoaded && lqipSrc && !useFallback
              ? {
                  backgroundImage: `url(${lqipSrc})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(12px)',
                }
              : undefined
          }
        >
          {/* Loader */}
          {!imgLoaded && !useFallback && !!currentSrc && (
            <div className="absolute inset-0 grid place-items-center bg-gray-200 dark:bg-gray-800 animate-pulse">
               <span className="text-[10px] text-gray-400">Nalagam...</span>
            </div>
          )}

          {/* Fallback */}
          {useFallback || !currentSrc ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
               <svg className="w-8 h-8 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          ) : (
            <img
              key={imgKey}
              ref={imgRef}
              src={currentSrc as string}
              srcSet={srcSet}
              alt={news.title}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200 opacity-0 data-[ok=true]:opacity-100"
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 20vw"
              onError={handleImgError}
              onLoad={() => setImgLoaded(true)}
              loading="lazy"
              decoding="async"
              data-ok={imgLoaded}
            />
          )}

          {/* Gumb za predogled */}
          <button
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              setPreviewUrl(news.link)
            }}
            onMouseEnter={() => setEyeHover(true)}
            onMouseLeave={() => setEyeHover(false)}
            className={`absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full
                        bg-white/90 dark:bg-gray-900/90 backdrop-blur text-gray-700 dark:text-gray-200
                        shadow-sm border border-gray-200 dark:border-gray-700
                        transition-all duration-200 transform-gpu
                        ${showEye ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
            style={{ transform: eyeHover ? 'scale(1.1)' : undefined }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          
          {/* Overlay Tag */}
          <div className="absolute bottom-2 left-2">
             <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded shadow-sm backdrop-blur-md" 
                   style={{ backgroundColor: sourceColor }}>
                {news.source}
             </span>
          </div>
        </div>

        {/* VSEBINA */}
        <div className="p-3 sm:p-4 flex flex-col gap-2">
          
          <h3 className="line-clamp-3 text-[15px] sm:text-[16px] font-bold leading-snug text-gray-900 dark:text-white">
            {news.title}
          </h3>
          
          <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
             <span>{primaryTime}</span>
             {(news as any).contentSnippet && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-400">
                    Povzetek
                </span>
             )}
          </div>

          {/* --- DRUGI VIRI (Samo v Standard View) --- */}
          {(primarySource || related.length > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
               <div className="flex items-center gap-1.5 mb-2 opacity-80">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                     Povezane novice
                  </span>
               </div>
               
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
                           {/* Logo */}
                           <div className="mt-0.5 shrink-0">
                               {logo ? (
                                   <Image src={logo} alt={item.source} width={14} height={14} className="rounded-sm opacity-60 group-hover/rel:opacity-100" />
                               ) : (
                                   <div className="w-3.5 h-3.5 rounded-sm bg-gray-200 flex items-center justify-center text-[8px]">{item.source[0]}</div>
                               )}
                           </div>
                           <div className="flex-1 min-w-0">
                               <div className="text-[12px] text-gray-600 dark:text-gray-300 font-medium truncate group-hover/rel:text-brand transition-colors">
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
      </a>

      {previewUrl && (
        <ArticlePreview 
            url={previewUrl} 
            onClose={() => setPreviewUrl(null)} 
        />
      )}
    </>
  )
}
