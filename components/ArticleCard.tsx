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
import { CATEGORIES, determineCategory } from '@/lib/categories'

type PreviewProps = { url: string; onClose: () => void }
const ArticlePreview = dynamic(() => import('./ArticlePreview'), { ssr: false }) as ComponentType<PreviewProps>

const ASPECT = 16 / 9
const IMAGE_WIDTHS = [320, 480, 640, 960, 1280]

interface Props { news: NewsItem; priority?: boolean }

export default function ArticleCard({ news, priority = false }: Props) {
  // --- ZAGOTOVLJENO OSVEŽEVANJE ČASA ---
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

  // --- LOGIKA ZA DATUM ---
  const formattedDate = useMemo(() => {
    const ms = news.publishedAt ?? (news.isoDate ? Date.parse(news.isoDate) : 0)
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
    if (min  < 60)      return `pred ${min} min`
    if (hr   < 24)      return `pred ${hr} h`
    
    return ''
  }, [news.publishedAt, news.isoDate, now])

  const sourceColor = useMemo(() => {
    return (sourceColors as Record<string, string>)[news.source] || '#fc9c6c'
  }, [news.source])

  const logoPath = useMemo(() => {
    return getSourceLogoPath(news.source)
  }, [news.source])

  // Kategorija za prikaz na sliki
  const categoryDef = useMemo(() => {
    const catId = news.category || determineCategory({ link: news.link, categories: [] })
    return CATEGORIES.find(c => c.id === catId)
  }, [news.category, news.link])

  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    try {
      const coarse   = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
      const touchCap = typeof navigator !== 'undefined' && (navigator.maxTouchPoints || (navigator as any).msMaxTouchPoints) > 0
      setIsTouch(!!coarse || !!touchCap || 'ontouchstart' in window)
    } catch {
      setIsTouch(false)
    }
  }, [])

  const rawImg = news.image ?? null
  const proxyInitiallyOn = !!rawImg 

  const [useProxy, setUseProxy]        = useState<boolean>(proxyInitiallyOn)
  const [useFallback, setUseFallback] = useState<boolean>(!rawImg)
  const [imgLoaded, setImgLoaded]     = useState<boolean>(false)
  const [imgKey, setImgKey]           = useState<number>(0)

  const cardRef = useRef<HTMLAnchorElement>(null)
  const imgRef  = useRef<HTMLImageElement>(null)

  const currentSrc = useMemo(() => {
    if (!rawImg) return null
    if (useProxy) return proxiedImage(rawImg, 640, 360, 1)
    return rawImg
  }, [rawImg, useProxy])

  const srcSet = useMemo(() => {
    if (!rawImg || !useProxy) return ''
    return buildSrcSet(rawImg, IMAGE_WIDTHS, ASPECT)
  }, [rawImg, useProxy])

  const lqipSrc = useMemo(() => {
    if (!rawImg) return null
    const w = 28, h = Math.max(1, Math.round(w / ASPECT))
    return proxiedImage(rawImg, w, h, 1)
  }, [rawImg])

  useEffect(() => {
    setUseProxy(!!rawImg)
    setUseFallback(!rawImg)
    setImgLoaded(false)
    setImgKey(k => k + 1)
  }, [news.link, rawImg])

  const handleImgError = () => {
    if (rawImg && useProxy) {
      setUseProxy(false)
      setImgLoaded(false)
      setImgKey(k => k + 1)
      return
    }
    if (!useFallback) {
      setUseFallback(true)
      setImgLoaded(false)
    }
  }

  const [isPriority, setIsPriority] = useState<boolean>(priority)
  useEffect(() => { if (priority) setIsPriority(true) }, [priority])

  useEffect(() => {
    if (!isPriority || !rawImg) return
    const rectW  = Math.max(1, Math.round(cardRef.current?.getBoundingClientRect().width || 480))
    const dpr    = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
    const targetW = Math.min(1280, Math.round(rectW * dpr))
    const targetH = Math.round(targetW / ASPECT)
    const link    = document.createElement('link')
    link.rel      = 'preload'
    link.as       = 'image'
    link.href     = proxiedImage(rawImg, targetW, targetH, dpr)
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [isPriority, rawImg])

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

  const [showPreview, setShowPreview] = useState(false)
  const previewOpenedAtRef = useRef<number | null>(null)
  useEffect(() => {
    if (showPreview) {
      previewOpenedAtRef.current = Date.now()
      sendBeacon({
        source: news.source,
        url:    news.link,
        action: 'preview_open',
      })
    } else if (previewOpenedAtRef.current) {
      const duration = Date.now() - previewOpenedAtRef.current
      previewOpenedAtRef.current = null
      sendBeacon({ source: news.source, url: news.link, action: 'preview_close', meta: { duration_ms: duration } })
    }
  }, [showPreview, news.source, news.link])
  useEffect(() => {
    const onUnload = () => {
      if (previewOpenedAtRef.current) {
        const duration = Date.now() - previewOpenedAtRef.current
        sendBeacon({ source: news.source, url: news.link, action: 'preview_close', meta: { duration_ms: duration, closed_by: 'unload' } })
        previewOpenedAtRef.current = null
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [news.source, news.link])

  const preloadedRef = useRef(false)
  const triggerPrefetch = () => {
    if (!preloadedRef.current && canPrefetch()) {
      preloadedRef.current = true
      preloadPreview(news.link).catch(() => {})
      if (rawImg && cardRef.current) {
        const rectW = Math.max(1, Math.round(cardRef.current.getBoundingClientRect().width || 480))
        const dpr   = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
        const targetW = Math.min(1280, Math.round(rectW * dpr))
        const targetH = Math.round(targetW / ASPECT)
        const url = proxiedImage(rawImg, targetW, targetH, dpr)
        warmImage(url)
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
        className="cv-auto group flex flex-col h-full no-underline bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <div
          className="relative w-full aspect-[16/9] overflow-hidden shrink-0"
          style={
            !imgLoaded && lqipSrc
              ? { backgroundImage: `url(${lqipSrc})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(12px)', transform: 'scale(1.05)' }
              : undefined
          }
        >
          {!imgLoaded && !useFallback && !!currentSrc && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none
                            bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200
                            dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse">
            </div>
          )}

          {useFallback || !currentSrc ? (
            (useFallback || !currentSrc)
              ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700" />
                  <span className="relative z-10 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Križišče
                  </span>
                </div>
              )
              : null
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
              loading={isPriority ? 'eager' : 'lazy'}
              fetchPriority={isPriority ? 'high' : 'auto'}
              decoding="async"
              width={640}
              height={360}
              referrerPolicy="strict-origin-when-cross-origin"
              crossOrigin="anonymous"
              data-ok={imgLoaded}
            />
          )}

          {/* KATEGORIJA NA SLIKI - SPODAJ DESNO */}
          {categoryDef && categoryDef.id !== 'ostalo' && (
             <span className={`absolute bottom-2 right-2 z-10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-900 dark:text-white bg-white/60 dark:bg-black/60 backdrop-blur-md rounded shadow-sm border border-white/20 dark:border-white/10 pointer-events-none`}>
               {categoryDef.label}
             </span>
          )}

          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPreview(true) }}
            onMouseEnter={() => setEyeHover(true)}
            onMouseLeave={() => setEyeHover(false)}
            onFocus={() => setEyeHover(true)}
            onBlur={() => setEyeHover(false)}
            aria-label="Predogled"
            className={`peer absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full
                        ring-1 ring-black/10 dark:ring-white/10 text-gray-700 dark:text-gray-200
                        bg-white/80 dark:bg-gray-900/80 backdrop-blur transition-opacity duration-150 transform-gpu
                        ${showEye ? 'opacity-100' : 'opacity-0'} ${isTouch ? '' : 'md:opacity-0 md:group-hover:opacity-100'}`}
            style={{ transform: eyeHover ? 'translateY(0) scale(1.30)' : 'translateY(0) scale(1)' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>
        </div>

        {/* ========== BESEDILO (BREZ KATEGORIJE SPODAJ) ========== */}
        <div className="p-3 flex flex-col flex-1">
          <div className="mb-2 flex items-center justify-between flex-wrap gap-y-1">
            <div className="flex items-center gap-2 min-w-0">
              {logoPath && (
                <div className="relative h-4 w-4 shrink-0 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <Image 
                    src={logoPath} 
                    alt={news.source} 
                    width={16} 
                    height={16}
                    className="object-cover h-full w-full"
                  />
                </div>
              )}
              <span className="truncate text-[12px] font-medium tracking-[0.01em]" style={{ color: sourceColor }}>
                {news.source}
              </span>
            </div>
            
            {/* TUKAJ JE SAMO ŠE ČAS */}
            <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
               {formattedDate}
            </span>
          </div>
          
          <h3 className="line-clamp-3 text-[15px] font-semibold leading-tight text-gray-900 dark:text-gray-100 mb-1">{news.title}</h3>
          
          <p className="line-clamp-3 text-[13px] text-gray-600 dark:text-gray-400 flex-1">{news.contentSnippet}</p>
        </div>
      </a>

      {showPreview && <ArticlePreview url={news.link} onClose={() => setShowPreview(false)} />}
    </>
  )
}
