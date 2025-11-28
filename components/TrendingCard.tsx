// components/TrendingCard.tsx
'use client'

/* =========================================================
   TrendingCard.tsx — kartica za zavihek "Aktualno"
   ---------------------------------------------------------
   - Glavna kartica (slika + naslov + povzetek)
   - Spodaj "Zadnja objava" + "Drugi viri" (vsi sorodni članki)
   - Drugi viri v timeline stilu, z logoti (fade + hover) in
     majhnim očesom za predogled članka.
   ========================================================= */

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
import { NewsItem } from '@/types'
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

/* ============ helperji za trending ============ */

type RelatedItem = {
  source: string
  title: string
  link: string
  publishedAt?: number | null
  isoDate?: string | null
}

/**
 * Domneva:
 *  - news.storyArticles | news.storyItems | news.otherSources | news.related | news.members
 *    je array objektov { source, title, link, publishedAt?, isoDate? }
 */
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
        publishedAt:
          typeof r.publishedAt === 'number' ? r.publishedAt : null,
        isoDate: typeof r.isoDate === 'string' ? r.isoDate : null,
      }
    })
    .filter(Boolean) as RelatedItem[]
}

/** Izberi primarni vir (zadnja objava); fallback je news.source */
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

/** Formatiraj "pred X min" / datumski fallback */
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

/* =================== komponenta =================== */

export default function TrendingCard({ news }: Props) {
  /* --------- "pred X min" tick (ui:minute iz Headerja) --------- */
  const [minuteTick, setMinuteTick] = useState(0)
  useEffect(() => {
    const onMinute = () => setMinuteTick((m) => (m + 1) % 60)
    window.addEventListener('ui:minute', onMinute as EventListener)
    return () =>
      window.removeEventListener('ui:minute', onMinute as EventListener)
  }, [])

  const now = Date.now()
  const formattedDate = useMemo(() => {
    const ms =
      (news as any).publishedAt ??
      ((news as any).isoDate ? Date.parse((news as any).isoDate) : 0)
    return formatRelativeTime(ms, now)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(news as any).publishedAt, (news as any).isoDate, minuteTick])

  const sourceColor = useMemo(() => {
    return (sourceColors as Record<string, string>)[news.source] || '#f97316'
  }, [news.source])

  /* --------- touch detection (za oko / hover ipd.) --------- */
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    try {
      const coarse =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(pointer: coarse)').matches
      const touchCap =
        typeof navigator !== 'undefined' &&
        ((navigator as any).maxTouchPoints ||
          (navigator as any).msMaxTouchPoints) > 0
      setIsTouch(!!coarse || !!touchCap || 'ontouchstart' in window)
    } catch {
      setIsTouch(false)
    }
  }, [])

  /* --------- slika --------- */
  const rawImg = (news as any).image ?? null
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

  useEffect(() => {
    if (!isPriority || !rawImg) return
    const rectW = Math.max(
      1,
      Math.round(cardRef.current?.getBoundingClientRect().width || 480),
    )
    const dpr =
      (typeof window !== 'undefined' && window.devicePixelRatio) || 1
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

  /* --------- tracking --------- */

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
    } catch {
      // ignore
    }
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

  /* --------- preview (glavni + related) --------- */

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewOpenedAtRef = useRef<number | null>(null)
  const previewSourceRef = useRef<string | null>(null)

  const openPreview = (url: string, source: string, meta?: any) => {
    setPreviewUrl(url)
    previewOpenedAtRef.current = Date.now()
    previewSourceRef.current = source
    sendBeacon({
      source,
      url,
      action: 'preview_open',
      meta,
    })
  }

  const closePreview = (reason: string = 'close_button') => {
    if (previewUrl && previewOpenedAtRef.current && previewSourceRef.current) {
      const duration = Date.now() - previewOpenedAtRef.current
      sendBeacon({
        source: previewSourceRef.current,
        url: previewUrl,
        action: 'preview_close',
        meta: { duration_ms: duration, reason },
      })
    }
    previewOpenedAtRef.current = null
    previewSourceRef.current = null
    setPreviewUrl(null)
  }

  useEffect(() => {
    const onUnload = () => {
      if (previewUrl) {
        closePreview('unload')
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl])

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

  /* --------- trending meta --------- */

  const primarySource = getPrimarySource(news)
  const relatedAll = extractRelatedItems(news)
  const related = relatedAll.filter((r) => r.link !== news.link)

  const primaryTime = useMemo(() => {
    const ms =
      (news as any).publishedAt ??
      ((news as any).isoDate ? Date.parse((news as any).isoDate) : null)
    return formatRelativeTime(ms, now)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(news as any).publishedAt, (news as any).isoDate, minuteTick])

  /* ================== RENDER ================== */

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
        className="group block no-underline rounded-2xl bg-slate-900/95 dark:bg-slate-900 shadow-md overflow-hidden transition-all duration-200 hover:shadow-xl hover:bg-slate-900"
      >
        {/* Slika */}
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
                         bg-gradient-to-br from-slate-200 via-slate-300 to-slate-200
                         dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 animate-pulse"
            >
              <span className="px-2 py-1 rounded text-[12px] font-medium bg-black/30 text-white backdrop-blur">
                Nalagam sliko …
              </span>
            </div>
          )}

          {useFallback || !currentSrc ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700" />
              <span className="relative z-10 text-sm font-medium text-slate-700 dark:text-slate-200">
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

          {/* gumb za predogled glavne novice */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openPreview(news.link, news.source, { kind: 'main' })
            }}
            onMouseEnter={() => setEyeHover(true)}
            onMouseLeave={() => setEyeHover(false)}
            onFocus={() => setEyeHover(true)}
            onBlur={() => setEyeHover(false)}
            aria-label="Predogled"
            className={`peer absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full
                        ring-1 ring-black/10 dark:ring-white/10 text-slate-800 dark:text-slate-200
                        bg-white/85 dark:bg-slate-900/85 backdrop-blur transition-opacity duration-150 transform-gpu
                        ${showEye ? 'opacity-100' : 'opacity-0'} ${
              isTouch ? '' : 'md:opacity-0 md:group-hover:opacity-100'
            }`}
            style={{
              transform: eyeHover
                ? 'translateY(0) scale(1.28)'
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

        {/* Besedilo + meta */}
        <div className="p-3 flex flex-col gap-2">
          {/* glava */}
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span
              className="truncate text-[12px] font-medium tracking-[0.01em]"
              style={{ color: sourceColor }}
            >
              {news.source}
            </span>
            <span className="text-[11px] text-slate-400">
              {formattedDate}
            </span>
          </div>

          <h3 className="line-clamp-3 text-[15px] font-semibold leading-tight text-slate-50">
            {news.title}
          </h3>
          <p className="mt-1 line-clamp-3 text-[13px] text-slate-200/90">
            {(news as any).contentSnippet}
          </p>

          {/* Lijak: Zadnja objava + drugi viri */}
          {(primarySource || related.length > 0) && (
            <div className="mt-3 rounded-2xl border border-slate-800/90 bg-slate-950/90 shadow-inner overflow-hidden">
              {/* Zadnja objava */}
              <div className="px-3 pt-2.5 pb-2.5 flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-white/90 shadow-sm">
                  ↓
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Zadnja objava
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {(() => {
                      const logo = getSourceLogoPath(primarySource)
                      return (
                        <>
                          {logo && (
                            <Image
                              src={logo}
                              alt={primarySource}
                              width={18}
                              height={18}
                              className="h-4 w-4 rounded-full bg-slate-100 dark:bg-slate-700 object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                            />
                          )}
                          <span className="text-[12px] font-medium text-slate-100 truncate">
                            {primarySource}
                          </span>
                          {primaryTime && (
                            <span className="text-[10px] text-slate-500 ml-2 shrink-0">
                              {primaryTime}
                            </span>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Divider */}
              {related.length > 0 && (
                <div className="h-px mx-3 bg-slate-800/80" />
              )}

              {/* Drugi viri */}
              {related.length > 0 && (
                <div className="px-3 pb-2.5 pt-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      Drugi viri
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {related.length}
                    </span>
                  </div>

                  <div className="relative pl-3">
                    {/* vertikalna linija */}
                    <div className="pointer-events-none absolute left-[4px] top-2 bottom-2 w-px bg-slate-800/80" />
                    <div className="flex flex-col gap-1.5">
                      {related.map((item, idx) => {
                        const logo = getSourceLogoPath(item.source)
                        const relTime = formatRelativeTime(
                          item.publishedAt ?? item.isoDate ?? null,
                          now,
                        )

                        const openRelated = (
                          e: MouseEvent<HTMLButtonElement>,
                        ) => {
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

                        const openRelatedPreview = (
                          e: MouseEvent<HTMLButtonElement>,
                        ) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openPreview(item.link, item.source, {
                            parent: news.link,
                            index: idx,
                            kind: 'related',
                          })
                        }

                        return (
                          <button
                            key={item.link + '|' + idx}
                            onClick={openRelated}
                            className="group w-full text-left rounded-xl bg-slate-900/70 hover:bg-slate-800/95 border border-slate-800/90 px-2.5 py-1.5 flex items-start gap-2 transition-colors"
                          >
                            {/* bullet + logo stack */}
                            <div className="flex flex-col items-center mt-[2px]">
                              <div className="h-1.5 w-1.5 rounded-full bg-slate-500 mb-1" />
                              {logo ? (
                                <Image
                                  src={logo}
                                  alt={item.source}
                                  width={20}
                                  height={20}
                                  className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-700 object-cover opacity-55 group-hover:opacity-100 transition-opacity"
                                />
                              ) : (
                                <span className="h-5 w-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-200 opacity-70 group-hover:opacity-100 transition-opacity">
                                  {item.source.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-[11px] font-medium text-slate-100">
                                  {item.source}
                                </span>
                                {relTime && (
                                  <span className="text-[10px] text-slate-500 shrink-0">
                                    {relTime}
                                  </span>
                                )}
                              </div>
                              <p className="text-[12px] text-slate-200 line-clamp-2">
                                {item.title}
                              </p>
                            </div>

                            {/* majhno oko za preview */}
                            <button
                              onClick={openRelatedPreview}
                              aria-label="Predogled sorodnega članka"
                              className="ml-1 mt-[2px] h-6 w-6 flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="14"
                                height="14"
                                aria-hidden="true"
                              >
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
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </a>

      {previewUrl && (
        <ArticlePreview url={previewUrl} onClose={() => closePreview()} />
      )}
    </>
  )
}
