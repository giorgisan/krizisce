'use client'

/* =========================================================
   TrendingCard.tsx — glavni članek + mini kartice ostalih virov
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

type StoryArticle = {
  source: string
  link: string
  title: string
  summary: string | null
  publishedAt: number
}

type TrendingNewsItem = NewsItem & {
  storyArticles?: StoryArticle[]
}

type PreviewProps = { url: string; onClose: () => void }
const ArticlePreview = dynamic(() => import('./ArticlePreview'), { ssr: false }) as ComponentType<PreviewProps>

const ASPECT = 16 / 9
const IMAGE_WIDTHS = [320, 480, 640, 960, 1280]

interface Props { news: TrendingNewsItem; priority?: boolean }

export default function TrendingCard({ news, priority = false }: Props) {
  const storyArticles: StoryArticle[] = Array.isArray(news.storyArticles) ? news.storyArticles : []
  const otherArticles = storyArticles.filter(a => a.source !== news.source)

  // minute tick
  const [minuteTick, setMinuteTick] = useState(0)
  useEffect(() => {
    const onMinute = () => setMinuteTick((m) => (m + 1) % 60)
    window.addEventListener('ui:minute', onMinute as EventListener)
    return () => window.removeEventListener('ui:minute', onMinute as EventListener)
  }, [])

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
  }, [news.publishedAt, news.isoDate, minuteTick])

  const sourceColor = useMemo(() => {
    return (sourceColors as Record<string, string>)[news.source] || '#fc9c6c'
  }, [news.source])

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

  const [useProxy, setUseProxy]       = useState<boolean>(proxyInitiallyOn)
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

  const logClick = () => {
    sendBeacon({ source: news.source, url: news.link, action: 'open' })
  }

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return
    e.preventDefault()
    window.open(news.link, '_blank', 'noopener')
    logClick()
  }

  const handleAuxClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 1) logClick()
  }

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

  const handleRelatedClick = (e: MouseEvent<HTMLButtonElement>, article: StoryArticle) => {
    e.stopPropagation()
    window.open(article.link, '_blank', 'noopener')
    sendBeacon({ source: article.source, url: article.link, action: 'open_related' })
  }

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
        className="cv-auto group block no-underline bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
      >
        <div
          className="relative w-full aspect-[16/9] overflow-hidden"
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
              <span className="px-2 py-1 rounded text-[12px] font-medium bg-black/30 text-white backdrop-blur">
                Nalagam sliko …
              </span>
            </div>
          )}

          {useFallback || !currentSrc ? (
            (useFallback || !currentSrc)
              ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700" />
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

          {!isTouch && (
            <span className="hidden md:block pointer-events-none absolute top-2 right-[calc(0.5rem+2rem+8px)]
                             rounded-md px-2 py-1 text-xs font-medium bg-black/60 text-white backdrop-blur-sm drop-shadow-lg
                             opacity-0 -translate-x-1 transition-opacity transition-transform duration-150 peer-hover:opacity-100 peer-hover:translate-x-0">
              Predogled&nbsp;novice
            </span>
          )}
        </div>

        {/* ========== BESEDILO + MINI KARTICE ========== */}
        <div className="p-2.5 min-h-[12.5rem] sm:min-h-[12.5rem] md:min-h-[12.25rem] lg:min-h-[12.25rem] xl:min-h-[12.25rem] overflow-hidden">
          <div className="mb-1 grid grid-cols-[1fr_auto] items-baseline gap-x-2">
            <span className="truncate text-[12px] font-medium tracking-[0.01em]" style={{ color: sourceColor }}>
              {news.source}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{formattedDate}</span>
          </div>

          <h3 className="line-clamp-3 text-[15px] font-semibold leading-tight text-gray-900 dark:text-gray-100">
            {news.title}
          </h3>

          <p className="mt-1 line-clamp-3 text-[13px] text-gray-700 dark:text-gray-300">
            {news.contentSnippet}
          </p>

          <div className="mt-2 space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
            <div>
              Zadnja objava:{' '}
              <span className="font-medium">
                {news.source}
              </span>
            </div>

            {otherArticles.length > 0 && (
              <div className="mt-1">
                <div className="font-medium mb-1">Drugi viri:</div>
                <div className="space-y-1">
                  {otherArticles.map((a) => (
                    <button
                      key={a.source + a.link}
                      type="button"
                      onClick={(e) => handleRelatedClick(e, a)}
                      className="w-full text-left rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                      <div className="text-[11px] font-semibold text-gray-900 dark:text-gray-50">
                        {a.source}
                      </div>
                      <div className="text-[11px] text-gray-700 dark:text-gray-200 line-clamp-2">
                        {a.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </a>

      {showPreview && <ArticlePreview url={news.link} onClose={() => setShowPreview(false)} />}
    </>
  )
}
