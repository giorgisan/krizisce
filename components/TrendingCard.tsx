// components/TrendingCard.tsx
'use client'

/* =========================================================
   TrendingCard.tsx — kartica za zavihek "Trending"/"Aktualno"
   ---------------------------------------------------------
   - temelji na ArticleCard (klik, tracking, proxy slike…)
   - spodaj pokaže "Zadnja objava" + mini kartice "Drugi viri"
   - logotipi se berejo iz /public/logos/<slug>.png prek getSourceLogoPath
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
}

// ==== helper tipi za trending ====

type RelatedItem = {
  source: string
  title: string
  link: string
  publishedAt?: number | null
  isoDate?: string | null
}

/**
 * POSODOBI, ČE IMAŠ DRUGAČNA POLJA NA /api/news?variant=trending
 *
 * Domneva:
 *  - eden izmed news.storyItems | news.otherSources | news.related
 *    je array objektov { source, title, link, publishedAt?, isoDate? }
 */
function extractRelatedItems(news: any): RelatedItem[] {
  const raw =
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
        publishedAt:
          typeof r.publishedAt === 'number' ? r.publishedAt : null,
        isoDate: typeof r.isoDate === 'string' ? r.isoDate : null,
      }
    })
    .filter(Boolean) as RelatedItem[]
}

/** Izberi primarni vir (zadnja objava); fallback je news.source */
function getPrimarySource(news: any): string {
  return (
    news.primarySource ||
    news.mainSource ||
    news.lastSource ||
    news.source ||
    ''
  )
}

/** Formatiraj "pred X min" za primarni članek / related */
function formatRelativeTime(
  msOrIso: number | string | null | undefined,
  now: number,
): string {
  let ms: number | null = null
  if (typeof msOrIso === 'number') ms = msOrIso
  else if (typeof msOrIso === 'string') {
    const t = Date.parse(msOrIso)
    ms = Number.isNaN(t) ? null : t
  }
  if (!ms) return ''
  const diff = now - ms
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(min / 60)
  if (diff < 60_000) return 'pred nekaj sekundami'
  if (min < 60) return `pred ${min} min`
  if (hr < 24) return `pred ${hr} h`
  const d = new Date(ms)
  const date = new Intl.DateTimeFormat('sl-SI', {
    day: 'numeric',
    month: 'short',
  }).format(d)
  const time = new Intl.DateTimeFormat('sl-SI', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return `${date}, ${time}`
}

export default function TrendingCard({ news }: Props) {
  // --- minute tick za živ "pred X min" (poslušamo 'ui:minute' iz Headerja)
  const [minuteTick, setMinuteTick] = useState(0)
  useEffect(() => {
    const onMinute = () => setMinuteTick((m) => (m + 1) % 60)
    window.addEventListener('ui:minute', onMinute as EventListener)
    return () => window.removeEventListener('ui:minute', onMinute as EventListener)
  }, [])

  const now = Date.now()
  const formattedDate = useMemo(() => {
    const ms = news.publishedAt ?? (news.isoDate ? Date.parse(news.isoDate) : 0)
    return formatRelativeTime(ms, now)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [news.publishedAt, news.isoDate, minuteTick])

  const sourceColor = useMemo(() => {
    return (sourceColors as Record<string, string>)[news.source] || '#fc9c6c'
  }, [news.source])

  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    try {
      const coarse =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(pointer: coarse)').matches
      const touchCap =
        typeof navigator !== 'undefined' &&
        (navigator.maxTouchPoints ||
          (navigator as any).msMaxTouchPoints) > 0
      setIsTouch(!!coarse || !!touchCap || 'ontouchstart' in window)
    } catch {
      setIsTouch(false)
    }
  }, [])

  // ==== slika ====
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
    if (useProxy) return proxiedImage(rawImg, 640, 360, 1)
    return rawImg
  }, [rawImg, useProxy])

  const srcSet = useMemo(() => {
    if (!rawImg || !useProxy) return ''
    return buildSrcSet(rawImg, IMAGE_WIDTHS, ASPECT)
  }, [rawImg, useProxy])

  const lqipSrc = useMemo(() => {
    if (!rawImg) return null
    const w = 28
    const h = Math.max(1, Math.round(w / ASPECT))
    return proxiedImage(rawImg, w, h, 1)
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

  const [isPriority] = useState<boolean>(false) // trending kartice niso priority

  // preload (malo bolj konzervativno kot ArticleCard)
  useEffect(() => {
    if (!isPriority || !rawImg) return
    const rectW = Math.max(
      1,
      Math.round(cardRef.current?.getBoundingClientRect().width || 480),
    )
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
    const targetW = Math.min(1280, Math.round(rectW * dpr))
    const targetH = Math.round(targetW / ASPECT)
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = proxiedImage(rawImg, targetW, targetH, dpr)
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [isPriority, rawImg])

  // ==== tracking ====
  const sendBeacon = (payload: any) => {
    try {
      const json = JSON.stringify(payload)
      if ('sendBeacon' in navigator) {
        navigator.sendBeacon(
          '/api/click',
          new Blob([json], { type: 'application/json' }),
        )
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
        url: news.link,
        action: 'preview_open',
      })
    } else if (previewOpenedAtRef.current) {
      const duration = Date.now() - previewOpenedAtRef.current
      previewOpenedAtRef.current = null
      sendBeacon({
        source: news.source,
        url: news.link,
        action: 'preview_close',
        meta: { duration_ms: duration },
      })
    }
  }, [showPreview, news.source, news.link])
  useEffect(() => {
    const onUnload = () => {
      if (previewOpenedAtRef.current) {
        const duration = Date.now() - previewOpenedAtRef.current
        sendBeacon({
          source: news.source,
          url: news.link,
          action: 'preview_close',
          meta: { duration_ms: duration, closed_by: 'unload' },
        })
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
        const rectW = Math.max(
          1,
          Math.round(cardRef.current.getBoundingClientRect().width || 480),
        )
        const dpr =
          (typeof window !== 'undefined' && window.devicePixelRatio) || 1
        const targetW = Math.min(1280, Math.round(rectW * dpr))
        const targetH = Math.round(targetW / ASPECT)
        const url = proxiedImage(rawImg, targetW, targetH, dpr)
        warmImage(url)
      }
    }
  }

  const [eyeVisible, setEyeVisible] = useState(false)
  const [eyeHover, setEyeHover] = useState(false)
  const showEye = isTouch ? true : eyeVisible

  // ==== trending metadata ====
  const primarySource = getPrimarySource(news)
  const relatedAll = extractRelatedItems(news)
  const related = relatedAll.filter((r) => r.link !== news.link)

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
        onMouseEnter={() => {
          setEyeVisible(true)
          triggerPrefetch()
        }}
        onMouseLeave={() => setEyeVisible(false)}
        onFocus={() => {
          setEyeVisible(true)
          triggerPrefetch()
        }}
        onBlur={() => setEyeVisible(false)}
        onTouchStart={() => {
          triggerPrefetch()
        }}
        className="cv-auto group block no-underline bg-gray-900/85 dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:bg-gray-900 dark:hover:bg-gray-700"
      >
        {/* SLika */}
        <div
          className="relative w-full aspect-[16/9] overflow-hidden"
          style={
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
          {!imgLoaded && !useFallback && !!currentSrc && (
            <div
              className="absolute inset-0 grid place-items-center pointer-events-none
                            bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200
                            dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse"
            >
              <span className="px-2 py-1 rounded text-[12px] font-medium bg-black/30 text-white backdrop-blur">
                Nalagam sliko …
              </span>
            </div>
          )}

          {useFallback || !currentSrc ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700" />
              <span className="relative z-10 text-sm font-medium text-gray-700 dark:text-gray-300">
                Ni slike
              </span>
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

          {/* gumb za predogled */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowPreview(true)
            }}
            onMouseEnter={() => setEyeHover(true)}
            onMouseLeave={() => setEyeHover(false)}
            onFocus={() => setEyeHover(true)}
            onBlur={() => setEyeHover(false)}
            aria-label="Predogled"
            className={`peer absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full
                        ring-1 ring-black/10 dark:ring-white/10 text-gray-700 dark:text-gray-200
                        bg-white/80 dark:bg-gray-900/80 backdrop-blur transition-opacity duration-150 transform-gpu
                        ${showEye ? 'opacity-100' : 'opacity-0'} ${
              isTouch ? '' : 'md:opacity-0 md:group-hover:opacity-100'
            }`}
            style={{
              transform: eyeHover
                ? 'translateY(0) scale(1.30)'
                : 'translateY(0) scale(1)',
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
              <circle
                cx="12"
                cy="12"
                r="3.5"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </button>

          {!isTouch && (
            <span
              className="hidden md:block pointer-events-none absolute top-2 right-[calc(0.5rem+2rem+8px)]
                             rounded-md px-2 py-1 text-xs font-medium bg-black/60 text-white backdrop-blur-sm drop-shadow-lg
                             opacity-0 -translate-x-1 transition-opacity transition-transform duration-150 peer-hover:opacity-100 peer-hover:translate-x-0"
            >
              Predogled&nbsp;novice
            </span>
          )}
        </div>

        {/* ========== BESEDILO + TRENDING META ========== */}
        <div className="p-2.5 min-h-[11rem] overflow-hidden flex flex-col gap-2">
          {/* glava */}
          <div className="mb-1 grid grid-cols-[1fr_auto] items-baseline gap-x-2">
            <span
              className="truncate text-[12px] font-medium tracking-[0.01em]"
              style={{ color: sourceColor }}
            >
              {news.source}
            </span>
            <span className="text-[11px] text-gray-400">{formattedDate}</span>
          </div>

          <h3 className="line-clamp-3 text-[15px] font-semibold leading-tight text-gray-50">
            {news.title}
          </h3>
          <p className="mt-1 line-clamp-3 text-[13px] text-gray-200">
            {news.contentSnippet}
          </p>

          {/* Primarni vir + drugi viri */}
          <div className="mt-2 pt-2 border-t border-gray-800 flex flex-col gap-1">
            {/* Zadnja objava */}
            <div className="flex items-center gap-2 text-[12px] text-gray-300">
              <span className="text-gray-400">Zadnja objava:</span>
              {(() => {
                const logo = getSourceLogoPath(primarySource)
                return (
                  <span className="inline-flex items-center gap-1">
                    {logo && (
                      <Image
                        src={logo}
                        alt={primarySource}
                        width={18}
                        height={18}
                        className="h-4 w-4 rounded-full bg-gray-100 dark:bg-gray-700 object-cover"
                      />
                    )}
                    <span className="font-medium">{primarySource}</span>
                  </span>
                )
              })()}
            </div>

            {/* Drugi viri */}
            {related.length > 0 && (
              <div className="mt-1 flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wide text-gray-500">
                  Drugi viri:
                </span>
                <div className="flex flex-col gap-1">
                  {related.slice(0, 4).map((item, idx) => {
                    const logo = getSourceLogoPath(item.source)
                    const relTime = formatRelativeTime(
                      item.publishedAt ?? item.isoDate ?? null,
                      now,
                    )

                    const onClickRelated = (e: React.MouseEvent) => {
                      e.preventDefault()
                      e.stopPropagation()
                      window.open(item.link, '_blank', 'noopener')
                      sendBeacon({
                        source: item.source,
                        url: item.link,
                        action: 'open_related',
                        meta: { parent: news.link, index: idx },
                      })
                    }

                    return (
                      <button
                        key={item.link + '|' + idx}
                        onClick={onClickRelated}
                        className="w-full text-left rounded-md bg-gray-800/90 hover:bg-gray-700/90 px-2 py-1.5 flex items-start gap-2 transition"
                      >
                        {logo ? (
                          <Image
                            src={logo}
                            alt={item.source}
                            width={20}
                            height={20}
                            className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-700 object-cover mt-[2px]"
                          />
                        ) : (
                          <span className="mt-[2px] h-5 w-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300">
                            {item.source.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[11px] font-medium text-gray-200">
                              {item.source}
                            </span>
                            {relTime && (
                              <span className="text-[10px] text-gray-500">
                                {relTime}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-gray-300 line-clamp-2">
                            {item.title}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </a>

      {showPreview && (
        <ArticlePreview
          url={news.link}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  )
}
