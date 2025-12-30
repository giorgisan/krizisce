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
import { proxiedImage } from '@/lib/img' 
import { preloadPreview, canPrefetch, warmImage } from '@/lib/previewPrefetch'
import { sourceColors } from '@/lib/sources'
import { getSourceLogoPath } from '@/lib/sourceMeta'
import { CATEGORIES, determineCategory } from '@/lib/categories'

type PreviewProps = { url: string; onClose: () => void }
const ArticlePreview = dynamic(() => import('./ArticlePreview'), { ssr: false }) as ComponentType<PreviewProps>

// Dimenzije za cache
const TARGET_WIDTH_DESKTOP = 640 
const TARGET_HEIGHT_DESKTOP = 360

interface Props { news: NewsItem; priority?: boolean }

export default function ArticleCard({ news, priority = false }: Props) {
  // --- TIME LOGIC ---
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timeToNextMinute = 60000 - (Date.now() % 60000)
    const timeoutId = setTimeout(() => {
      setNow(Date.now())
      const intervalId = setInterval(() => {
        setNow(Date.now())
      }, 60000)
      return () => clearInterval(intervalId)
    }, timeToNextMinute)
    return () => clearTimeout(timeoutId)
  }, [])

  const formattedDate = useMemo(() => {
    const ms = news.publishedAt || 0
    if (!ms) return ''
    const diff = now - ms
    const oneDayMs = 24 * 60 * 60 * 1000
    if (diff > oneDayMs) {
       const d = new Date(ms)
       return new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'short' }).format(d)
    }
    const min = Math.floor(diff / 60_000)
    const hr  = Math.floor(min / 60)
    if (diff < 60_000) return 'zdaj'
    if (min  < 60)       return `${min} min`
    if (hr   < 24)       return `${hr} h`
    return ''
  }, [news.publishedAt, now])

  const sourceColor = useMemo(() => {
    return (sourceColors as Record<string, string>)[news.source] || '#fc9c6c'
  }, [news.source])

  const logoPath = useMemo(() => {
    return getSourceLogoPath(news.source)
  }, [news.source])

  const categoryDef = useMemo(() => {
    const catId = news.category || determineCategory({ link: news.link, categories: [] })
    return CATEGORIES.find(c => c.id === catId)
  }, [news.category, news.link])

  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    try {
      const coarse   = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
      const touchCap = typeof navigator !== 'undefined' && ((navigator as any).maxTouchPoints || (navigator as any).msMaxTouchPoints) > 0
      setIsTouch(!!coarse || !!touchCap || 'ontouchstart' in window)
    } catch {
      setIsTouch(false)
    }
  }, [])

  const rawImg = news.image ?? null
  const proxyInitiallyOn = !!rawImg 

  const [useProxy, setUseProxy]         = useState<boolean>(proxyInitiallyOn)
  const [useFallback, setUseFallback] = useState<boolean>(!rawImg)
  const [imgLoaded, setImgLoaded]       = useState<boolean>(false)
   
  const cardRef = useRef<HTMLAnchorElement>(null)

  const currentSrc = useMemo(() => {
    if (!rawImg) return null
    if (useProxy) return proxiedImage(rawImg, TARGET_WIDTH_DESKTOP, TARGET_HEIGHT_DESKTOP, 1)
    return rawImg
  }, [rawImg, useProxy])

  const lqipSrc = useMemo(() => {
    if (!rawImg) return null
    return proxiedImage(rawImg, 28, 16, 1)
  }, [rawImg])

  useEffect(() => {
    setUseProxy(!!rawImg)
    setUseFallback(!rawImg)
  }, [news.link, rawImg])

  const handleImgError = () => {
    if (rawImg && useProxy) {
      setUseProxy(false) 
      setImgLoaded(false)
      return
    }
    if (!useFallback) {
      setUseFallback(true) 
      setImgLoaded(false)
    }
  }

  // --- ANALYTICS ---
  const sendBeacon = (payload: any) => {
    try {
      const json = JSON.stringify(payload)
      if ('sendBeacon' in navigator) {
        navigator.sendBeacon('/api/click', new Blob([json], { type: 'application/json' }))
      } else {
        fetch('/api/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json, keepalive: true })
      }
    } catch {}
  }
  const logClick = () => { sendBeacon({ source: news.source, url: news.link, action: 'open' }) }
   
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return
    e.preventDefault()
    window.open(news.link, '_blank', 'noopener')
    logClick()
  }
  const handleAuxClick = (e: MouseEvent<HTMLAnchorElement>) => { if (e.button === 1) logClick() }

  // --- PREVIEW ---
  const [showPreview, setShowPreview] = useState(false)
  const previewOpenedAtRef = useRef<number | null>(null)
  useEffect(() => {
    if (showPreview) {
      previewOpenedAtRef.current = Date.now()
      sendBeacon({ source: news.source, url: news.link, action: 'preview_open' })
    } else if (previewOpenedAtRef.current) {
      const duration = Date.now() - previewOpenedAtRef.current
      previewOpenedAtRef.current = null
      sendBeacon({ source: news.source, url: news.link, action: 'preview_close', meta: { duration_ms: duration } })
    }
  }, [showPreview, news.source, news.link])

  const preloadedRef = useRef(false)
  const triggerPrefetch = () => {
    if (!preloadedRef.current && canPrefetch()) {
      preloadedRef.current = true
      preloadPreview(news.link).catch(() => {})
      if (rawImg) {
         const largeUrl = proxiedImage(rawImg, 1280, 720, 1)
         warmImage(largeUrl)
      }
    }
  }

  const [eyeVisible, setEyeVisible] = useState(false)
  const [eyeHover,   setEyeHover]   = useState(false)
  const showEye = isTouch ? true : eyeVisible

  return (
    <>
      <a
        ref={cardRef}
        href={news.link}
        target="_blank"
        rel="noopener"
        referrerPolicy="strict-origin-when-cross-origin"
        onClick={handleClick}
        onAuxClick={handleAuxClick}
        onMouseEnter={() => { setEyeVisible(true); triggerPrefetch() }}
        onMouseLeave={() => { setEyeVisible(false); setEyeHover(false) }}
        onFocus={() => { setEyeVisible(true); triggerPrefetch() }}
        onBlur={() => { setEyeVisible(false); setEyeHover(false) }}
        onTouchStart={() => { triggerPrefetch() }}
        
        data-umami-event="Click News"
        data-umami-event-source={news.source} 
        data-umami-event-type="feed"          

        // Glavni wrapper
        // flex-row za mobile, flex-col za desktop
        className="cv-auto group flex flex-row md:flex-col h-auto md:h-full no-underline bg-white dark:bg-gray-800 rounded-lg shadow-sm md:shadow-md overflow-hidden transition-all duration-200 hover:scale-[1.01] md:hover:scale-[1.02] hover:shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        {/* --- IMAGE CONTAINER --- */}
        <div
          // KLJUČNO: 'flex-none' prepreči raztegovanje.
          // Uporabimo style={{ aspectRatio }} kot varovalko.
          className="relative flex-none overflow-hidden
                     w-[130px] md:w-full"
          style={{ 
             // Mobile: 4/3, Desktop: 16/9. To povozi kakršnokoli raztegovanje Grida.
             aspectRatio: typeof window !== 'undefined' && window.innerWidth >= 768 ? '16/9' : '4/3' 
          }}
        >
          {/* Skeleton */}
          {!imgLoaded && !useFallback && !!currentSrc && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none
                            bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200
                            dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse">
            </div>
          )}

          {/* Lqip blur background if needed */}
           <div 
             className="absolute inset-0 z-0"
             style={
                !imgLoaded && lqipSrc
                  ? { backgroundImage: `url(${lqipSrc})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(12px)', transform: 'scale(1.05)' }
                  : undefined
              }
           />

          {useFallback || !currentSrc ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
               <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                 Križišče
               </span>
            </div>
          ) : (
            <Image
              src={currentSrc as string}
              alt={news.title}
              fill
              className="object-cover z-10 transition-opacity duration-200 opacity-0 data-[ok=true]:opacity-100"
              sizes="(max-width: 768px) 150px, (max-width: 1200px) 50vw, 33vw"
              onError={handleImgError}
              onLoadingComplete={() => setImgLoaded(true)}
              priority={priority} 
              data-ok={imgLoaded}
              unoptimized={true}
            />
          )}

          {/* Kategorija Label: Samo Desktop */}
          {categoryDef && categoryDef.id !== 'ostalo' && (
             <span className={`hidden md:block absolute bottom-2 right-2 z-20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-900 dark:text-white bg-white/30 dark:bg-black/30 backdrop-blur-md rounded shadow-sm border border-white/20 dark:border-white/10 pointer-events-none`}>
               {categoryDef.label}
             </span>
          )}

          {/* Preview Gumb */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPreview(true) }}
            onMouseEnter={() => setEyeHover(true)}
            onMouseLeave={() => setEyeHover(false)}
            onFocus={() => setEyeHover(true)}
            onBlur={() => setEyeHover(false)}
            aria-label="Predogled"
            className={`peer absolute z-30 h-8 w-8 grid place-items-center rounded-full
                        shadow-sm ring-1 ring-black/5 dark:ring-white/10 text-gray-700 dark:text-gray-200
                        bg-white/90 dark:bg-gray-900/80 backdrop-blur transition-all duration-150 transform-gpu
                        
                        bottom-1 right-1 
                        md:bottom-auto md:top-2 md:right-2

                        ${showEye ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} 
                        ${isTouch ? '' : 'md:opacity-0 md:group-hover:opacity-100'}`}
            style={{ transform: eyeHover ? 'scale(1.15)' : 'scale(1)' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>
        </div>

        {/* ========== BESEDILO ========== */}
        <div className="p-3 flex flex-col flex-1 min-w-0 justify-center md:justify-start">
          
          <div className="mb-1.5 md:mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {logoPath && (
                <div className="relative h-4 w-4 shrink-0 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <Image 
                    src={logoPath} 
                    alt={news.source} 
                    width={16} 
                    height={16}
                    className="object-cover h-full w-full"
                    unoptimized={true}
                  />
                </div>
              )}
              <span className="truncate text-[12px] font-medium tracking-[0.01em]" style={{ color: sourceColor }}>
                {news.source}
              </span>
            </div>
            
            <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
               {formattedDate}
            </span>
          </div>
          
          <h3 className="line-clamp-3 text-[14px] leading-snug md:text-[15px] md:leading-tight font-semibold text-gray-900 dark:text-gray-100 mb-0 md:mb-1">
            {news.title}
          </h3>
          
          <p className="hidden md:block mt-1 line-clamp-3 text-[13px] text-gray-600 dark:text-gray-400 flex-1">
            {news.contentSnippet}
          </p>
        </div>
      </a>

      {showPreview && <ArticlePreview url={news.link} onClose={() => setShowPreview(false)} />}
    </>
  )
}
