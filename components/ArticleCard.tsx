'use client'

/* =========================================================
   ArticleCard.tsx — robustno nalaganje slik (mobile friendly)
   - IntersectionObserver: <img> se doda šele, ko je kartica v pogledu
   - Retry: proxy -> direct -> fallback
   - Global "circuit breaker" za proxy (če večkrat pade)
   - Skeleton z napisom "Nalagam sliko …" do onLoad()
   ========================================================= */

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
import { proxiedImage, buildSrcSet } from '@/lib/img'
import { preloadPreview, canPrefetch, warmImage } from '@/lib/previewPrefetch'
import { sourceColors } from '@/lib/sources'

/* ========== SECTION A: dynamic import za predogled ========== */
type PreviewProps = { url: string; onClose: () => void }
const ArticlePreview = dynamic(() => import('./ArticlePreview'), { ssr: false }) as ComponentType<PreviewProps>

/* ========== SECTION B: konstante ========== */
const ASPECT = 16 / 9
const IMAGE_WIDTHS = [320, 480, 640, 960, 1280]

// Globalni števec napak na proxyju (circuit breaker)
let PROXY_FAILS = 0
const PROXY_TRIP = 6 // po 6 napakah v eni seji prenehamo uporabljati proxy

/* =========================================================
   KOMPONENTA
   ========================================================= */
interface Props { news: NewsItem; priority?: boolean }

export default function ArticleCard({ news, priority = false }: Props) {
  /* ========== SECTION 1: osnovni podatki ========== */
  const formattedDate = useMemo(() => {
    const ms = news.publishedAt ?? (news.isoDate ? Date.parse(news.isoDate) : 0)
    if (!ms) return ''
    const diff = Date.now() - ms
    const min = Math.floor(diff / 60_000)
    const hr  = Math.floor(min / 60)
    if (diff < 60_000) return 'pred nekaj sekundami'
    if (min  < 60)     return `pred ${min} min`
    if (hr   < 24)     return `pred ${hr} h`
    const d    = new Date(ms)
    const date = new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'short' }).format(d)
    const time = new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(d)
    return `${date}, ${time}`
  }, [news.publishedAt, news.isoDate])

  const sourceColor = useMemo(() => {
    return (sourceColors as Record<string, string>)[news.source] || '#fc9c6c'
  }, [news.source])

  /* ========== SECTION 2: zaznavanje touch naprave (ostane) ========== */
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

  /* ========== SECTION 3: image pipeline (proxy -> direct -> fallback) ========== */
  const rawImg = news.image ?? null

  // Circuit breaker: če je proxy že "pade", začni direktno
  const proxyInitiallyOn = !!rawImg && PROXY_FAILS < PROXY_TRIP

  const [useProxy, setUseProxy]       = useState<boolean>(proxyInitiallyOn)
  const [useFallback, setUseFallback] = useState<boolean>(!rawImg)
  const [imgLoaded, setImgLoaded]     = useState<boolean>(false)
  const [imgKey, setImgKey]           = useState<number>(0) // prisili re-render <img> ob preklopu vira

  // Kartico narišamo "lahko", ampak <img> prikažemo šele, ko je v pogledu
  const cardRef = useRef<HTMLAnchorElement>(null)
  const imgRef  = useRef<HTMLImageElement>(null)
  const [inView, setInView] = useState<boolean>(false)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) setInView(true)
        })
      },
      { rootMargin: '200px 0px' } // začni malo prej
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Izračun trenutnega vira (proxy ali direct)
  const currentSrc = useMemo(() => {
    if (!rawImg) return null
    if (useProxy) {
      // Default: 640x360, DPR upošteva brskalnik prek srcseta
      return proxiedImage(rawImg, 640, 360, 1)
    }
    return rawImg
  }, [rawImg, useProxy])

  // srcset samo ko imamo izvorno sliko
  const srcSet = useMemo(() => {
    if (!rawImg) return ''
    return buildSrcSet(rawImg, IMAGE_WIDTHS, ASPECT)
  }, [rawImg])

  // mini LQIP kot ozadje (≈1KB) — samo ko imamo sliko
  const lqipSrc = useMemo(() => {
    if (!rawImg) return null
    const w = 28, h = Math.max(1, Math.round(w / ASPECT))
    return proxiedImage(rawImg, w, h, 1)
  }, [rawImg])

  // Resetiraj stanje, ko se zamenja članek
  useEffect(() => {
    setUseProxy(!!rawImg && PROXY_FAILS < PROXY_TRIP)
    setUseFallback(!rawImg)
    setImgLoaded(false)
    setImgKey(k => k + 1)
  }, [news.link, rawImg])

  const handleImgError = () => {
    if (rawImg && useProxy) {
      PROXY_FAILS++                               // globalno beleži napake
      setUseProxy(false)                          // preklopi na direkt
      setImgLoaded(false)
      setImgKey(k => k + 1)                       // prisili nov <img>
      return
    }
    if (!useFallback) {
      setUseFallback(true)                        // pokaži fallback "Ni slike"
      setImgLoaded(false)
    }
  }

  /* ========== SECTION 4: priority preload (prva kartica) ========== */
  const [isPriority, setIsPriority] = useState<boolean>(priority)
  useEffect(() => { if (priority) setIsPriority(true) }, [priority])

  // Preload za LCP – samo za priority + ko je kartica v pogledu
  useEffect(() => {
    if (!isPriority || !rawImg || !inView) return
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
  }, [isPriority, rawImg, inView])

  /* ========== SECTION 5: click & preview tracking (tvoje – nespremenjeno) ========== */
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
        meta: {
          dpr: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
          vw:  typeof window !== 'undefined' ? window.innerWidth  : null,
          vh:  typeof window !== 'undefined' ? window.innerHeight : null,
        },
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

  // Prefetch predogleda + “warm” slike ob hover/focus
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

  /* ========== SECTION 6: UI stanja za gumb “oko” ========== */
  const [eyeVisible, setEyeVisible] = useState(false)
  const [eyeHover,   setEyeHover]   = useState(false)
  const showEye = isTouch ? true : eyeVisible

  /* =========================================================
     RENDER
     ========================================================= */
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
        onMouseLeave={() => setEyeVisible(false)}
        onFocus={() => { setEyeVisible(true); triggerPrefetch() }}
        onBlur={() => setEyeVisible(false)}
        onTouchStart={() => { triggerPrefetch() }}
        className="cv-auto group block no-underline bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {/* ========== SECTION 7: MEDIA blok (LQIP + skeleton + retry) ========== */}
        <div
          className="relative w-full aspect-[16/9] overflow-hidden"
          style={
            // LQIP kot ozadje, dokler prava slika ni naložena
            !imgLoaded && lqipSrc
              ? {
                  backgroundImage: `url(${lqipSrc})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(12px)',
                  transform: 'scale(1.05)',
                }
              : undefined
          }
        >
          {/* Skeleton z napisom "Nalagam sliko …" prikažemo, ko <img> še ni naložen */}
          {!imgLoaded && !useFallback && !!currentSrc && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none
                            bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200
                            dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse">
              <span className="px-2 py-1 rounded text-[12px] font-medium
                               bg-black/30 text-white backdrop-blur">
                Nalagam sliko …
              </span>
            </div>
          )}

          {/* Fallback “Ni slike” */}
          {useFallback || !currentSrc || !inView ? (
            (useFallback || !currentSrc)
              ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200
                                  dark:from-gray-700 dark:via-gray-800 dark:to-gray-700" />
                  <span className="relative z-10 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ni slike
                  </span>
                </div>
              )
              : null
          ) : (
            <img
              key={imgKey}
              ref={imgRef}
              src={currentSrc}
              srcSet={srcSet}
              alt={news.title}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200
                         opacity-0 data-[ok=true]:opacity-100"
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

          {/* Oko (predogled) */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPreview(true) }}
            onMouseEnter={() => setEyeHover(true)}
            onMouseLeave={() => setEyeHover(false)}
            onFocus={() => setEyeHover(true)}
            onBlur={() => setEyeHover(false)}
            aria-label="Predogled"
            className={`peer absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full
                        ring-1 ring-black/10 dark:ring-white/10 text-gray-700 dark:text-gray-200
                        bg-white/80 dark:bg-gray-900/80 backdrop-blur
                        transition-opacity duration-150 transform-gpu
                        ${showEye ? 'opacity-100' : 'opacity-0'}
                        ${isTouch ? '' : 'md:opacity-0 md:group-hover:opacity-100'}`}
            style={{ transform: eyeHover ? 'translateY(0) scale(1.30)' : 'translateY(0) scale(1)' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>

          {!isTouch && (
            <span
              className="hidden md:block pointer-events-none absolute top-2 right-[calc(0.5rem+2rem+8px)]
                             rounded-md px-2 py-1 text-xs font-medium bg-black/60 text-white backdrop-blur-sm drop-shadow-lg
                             opacity-0 -translate-x-1 transition-opacity transition-transform duration-150
                             peer-hover:opacity-100 peer-hover:translate-x-0"
            >
              Predogled&nbsp;novice
            </span>
          )}
        </div>

        {/* ========== SECTION 8: BESEDILO ========== */}
        <div className="p-2.5 min-h-[10rem] sm:min-h-[10rem] md:min-h-[9.75rem] lg:min-h-[9.5rem] xl:min-h-[9.5rem] overflow-hidden">
          <div className="mb-1 grid grid-cols-[1fr_auto] items-baseline gap-x-2">
            <span className="truncate text-[12px] font-medium tracking-[0.01em]" style={{ color: sourceColor }}>
              {news.source}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{formattedDate}</span>
          </div>
          <h3 className="line-clamp-3 text-[15px] font-semibold leading-tight text-gray-900 dark:text-gray-100">{news.title}</h3>
          <p className="mt-1 line-clamp-3 text-[13px] text-gray-700 dark:text-gray-300">{news.contentSnippet}</p>
        </div>
      </a>

      {showPreview && <ArticlePreview url={news.link} onClose={() => setShowPreview(false)} />}
    </>
  )
}
