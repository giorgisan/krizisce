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
import Image from 'next/image' // Samo za logotipe
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

type RelatedItem = {
  source: string
  title: string
  link: string
  publishedAt?: number | null
}

// --- HELPERJI (Ločeni samo zato, da je glavna funkcija lažja) ---

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
  if (min < 60) return `${min} min` // Malo krajši zapis za trending
  if (hr < 24) return `${hr} h`
  const d = new Date(ms)
  return new Intl.DateTimeFormat('sl-SI', {
    day: 'numeric',
    month: 'short',
  }).format(d)
}

export default function TrendingCard({ news }: Props) {
  // Osveževanje časa vsako minuto
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

  // --- LOGIKA DOTIKA (TOUCH) ---
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    try {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches
      const touchCap = ((navigator as any).maxTouchPoints || (navigator as any).msMaxTouchPoints) > 0
      setIsTouch(!!coarse || !!touchCap || 'ontouchstart' in window)
    } catch { setIsTouch(false) }
  }, [])

  // --- SLIKA (Vrnemo originalno logiko za hitrost) ---
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
  const showEye = isTouch ? true : eyeVisible

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

  // --- PRIPRAVA PODATKOV ---
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
        onClick={handleClick}
        onMouseEnter={() => { setEyeVisible(true); triggerPrefetch() }}
        onMouseLeave={() => setEyeVisible(false)}
        onTouchStart={triggerPrefetch}
        // ORIGINALNI STYLI:
        className="cv-auto block no-underline bg-gray-900/85 dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors duration-200 hover:bg-gray-900 dark:hover:bg-gray-700"
      >
        {/* SLIKA */}
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
            <div className="absolute inset-0 grid place-items-center bg-gray-800 animate-pulse">
              <span className="text-[10px] text-gray-500">Nalagam...</span>
            </div>
          )}

          {useFallback || !currentSrc ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <span className="text-sm text-gray-500">Ni slike</span>
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
            className={`peer absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full
                        bg-white/80 dark:bg-gray-900/80 backdrop-blur text-gray-700 dark:text-gray-200
                        transition-opacity duration-150 transform-gpu
                        ${showEye ? 'opacity-100' : 'opacity-0'}`}
            style={{ transform: eyeHover ? 'scale(1.2)' : 'scale(1)' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>

        {/* VSEBINA */}
        <div className="p-2.5 min-h-[11rem] flex flex-col gap-2">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-[12px] font-medium tracking-wide" style={{ color: sourceColor }}>
              {news.source}
            </span>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">
               {primaryTime}
            </span>
          </div>

          <h3 className="line-clamp-3 text-[15px] font-semibold leading-tight text-gray-50">
            {news.title}
          </h3>
          <p className="mt-1 line-clamp-3 text-[13px] text-gray-200">
            {(news as any).contentSnippet}
          </p>

          {/* --- DRUGI VIRI (Originalna logika) --- */}
          {(primarySource || related.length > 0) && (
            <div className="mt-auto pt-3 border-t border-gray-700/50">
               <div className="flex items-center gap-2 mb-2">
                  <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
                     <span className="text-[10px] text-indigo-300">▼</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                     Zadnja objava
                  </span>
               </div>
               
               {/* Prikaz virov */}
               {related.length > 0 && (
                   <div className="flex flex-col gap-1">
                       {related.map((item, idx) => {
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
                                   // TUKAJ JE BILA TEŽAVA: Uporabljamo 'group/rel' za hover efekt samo na tem gumbu
                                   className="group/rel w-full text-left rounded-lg bg-gray-900/60 hover:bg-gray-800 border border-gray-800/80 px-2 py-1.5 flex items-start gap-2 transition-colors relative"
                               >
                                   {/* Logo vira */}
                                   <div className="mt-[2px] shrink-0">
                                       {logo ? (
                                           <Image src={logo} alt={item.source} width={16} height={16} className="rounded-full bg-gray-200 opacity-60 group-hover/rel:opacity-100" />
                                       ) : (
                                           <span className="h-4 w-4 rounded-full bg-gray-700 flex items-center justify-center text-[8px] text-gray-300">
                                               {item.source.slice(0,1)}
                                           </span>
                                       )}
                                   </div>

                                   {/* Tekst */}
                                   <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-baseline">
                                            <span className="text-[11px] text-gray-300 font-medium truncate pr-2">
                                                {item.source}
                                            </span>
                                            <span className="text-[10px] text-gray-600 shrink-0">
                                                {relTime}
                                            </span>
                                       </div>
                                       <div className="text-[11px] text-gray-500 truncate group-hover/rel:text-gray-300 transition-colors">
                                           {item.title}
                                       </div>
                                   </div>

                                   {/* Mali preview gumb */}
                                   <div 
                                        role="button"
                                        onClick={(e) => {
                                            e.preventDefault(); e.stopPropagation();
                                            setPreviewUrl(item.link);
                                        }}
                                        className="ml-1 p-1 text-gray-500 hover:text-white opacity-0 group-hover/rel:opacity-100 transition-opacity"
                                   >
                                       <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                                            <circle cx="12" cy="12" r="3" />
                                       </svg>
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
        <ArticlePreview 
            url={previewUrl} 
            onClose={() => setPreviewUrl(null)} 
        />
      )}
    </>
  )
}
