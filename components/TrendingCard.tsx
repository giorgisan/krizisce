'use client'

import { NewsItem } from '@/types'
import {
  MouseEvent,
  useMemo,
  useState,
  useEffect,
  useRef,
  ComponentType,
  memo
} from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { proxiedImage, buildSrcSet } from '@/lib/img'
import { preloadPreview, canPrefetch, warmImage } from '@/lib/previewPrefetch'
import { sourceColors } from '@/lib/sources'
import { getSourceLogoPath } from '@/lib/sourceMeta'

// Dinamični import za preview modal
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

// --- HELPERJI (Izven komponente, da se ne re-kreirajo) ---

function extractRelatedItems(news: any): RelatedItem[] {
  const raw =
    news.storyArticles ||
    news.storyItems ||
    news.otherSources ||
    news.related ||
    news.members ||
    []

  if (!Array.isArray(raw)) return []
  
  // Tu bi lahko dodal filter za "napačne novice", če bi imel kriterij
  // Npr. if (LevenshteinDistance(news.title, r.title) > threshold) return null;
  
  return raw
    .map((r: any): RelatedItem | null => {
      if (!r || !r.link || !r.title || !r.source) return null
      // Prepreči podvajanje glavne novice
      if (r.link === news.link) return null
      
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
  const storyPrimary = Array.isArray(news.storyArticles) && news.storyArticles.length
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

function formatRelativeTime(ms: number | null | undefined, now: number): string {
  if (!ms) return ''
  const diff = now - ms
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(min / 60)
  if (diff < 60_000) return 'zdaj'
  if (min < 60) return `pred ${min} min`
  if (hr < 24) return `pred ${hr} h`
  
  // Za starejše od 24h
  const d = new Date(ms)
  return new Intl.DateTimeFormat('sl-SI', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

// --- SUB-KOMPONENTA ZA ČAS (Optimizacija re-renderjev) ---
const TimeAgo = memo(({ ms }: { ms: number | null | undefined }) => {
    const [text, setText] = useState(() => formatRelativeTime(ms, Date.now()))

    useEffect(() => {
        const update = () => setText(formatRelativeTime(ms, Date.now()))
        // Posodobi vsako minuto
        const interval = setInterval(update, 60000)
        return () => clearInterval(interval)
    }, [ms])

    return <>{text}</>
})
TimeAgo.displayName = 'TimeAgo'


// --- GLAVNA KOMPONENTA ---
export default function TrendingCard({ news }: Props) {
  // 1. Priprava podatkov
  const primarySource = getPrimarySource(news)
  const related = useMemo(() => extractRelatedItems(news), [news]) // useMemo, ker je map/filter
  const sourceColor = (sourceColors as Record<string, string>)[news.source] || '#fc9c6c'

  // 2. Stanje slike
  const rawImg = news.image ?? null
  const [useProxy, setUseProxy] = useState(!!rawImg)
  const [useFallback, setUseFallback] = useState(!rawImg)
  const [imgLoaded, setImgLoaded] = useState(false)
  
  // Reset state, če se URL novice spremeni (recikliranje komponent)
  useEffect(() => {
      setUseProxy(!!rawImg)
      setUseFallback(!rawImg)
      setImgLoaded(false)
  }, [news.link, rawImg])

  // 3. Izračun URL-jev slike
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


  // 4. Interakcije (Click, Analytics)
  const sendBeacon = (payload: any) => {
    try {
      const json = JSON.stringify(payload)
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/click', new Blob([json], { type: 'application/json' }))
      } else {
        fetch('/api/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: json,
          keepalive: true,
        }).catch(() => {})
      }
    } catch {}
  }

  const logClick = (action: string = 'open', extra: any = {}) => {
      sendBeacon({ source: news.source, url: news.link, action, ...extra })
  }

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return
    e.preventDefault()
    window.open(news.link, '_blank', 'noopener')
    logClick()
  }

  // 5. Preview logika
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewOpenedAtRef = useRef<number | null>(null)

  useEffect(() => {
      if (previewUrl) {
          previewOpenedAtRef.current = Date.now()
          sendBeacon({ source: news.source, url: previewUrl, action: 'preview_open' })
      } else if (previewOpenedAtRef.current) {
          const duration = Date.now() - previewOpenedAtRef.current
          previewOpenedAtRef.current = null
          sendBeacon({ 
              source: news.source, 
              url: news.link, 
              action: 'preview_close', 
              meta: { duration_ms: duration } 
          })
      }
  }, [previewUrl]) // news dependencies niso nujni, ker so stable v okviru sessiona

  // 6. Prefetch logika
  const preloadedRef = useRef(false)
  const cardRef = useRef<HTMLAnchorElement>(null)

  const triggerPrefetch = () => {
    if (!preloadedRef.current && canPrefetch()) {
      preloadedRef.current = true
      preloadPreview(news.link).catch(() => {})
      // Warmup slike
      if (rawImg && currentSrc) {
           warmImage(currentSrc) 
      }
    }
  }

  // --- RENDER ---
  return (
    <>
      <a
        ref={cardRef}
        href={news.link}
        target="_blank"
        rel="noopener"
        referrerPolicy="strict-origin-when-cross-origin"
        onClick={handleClick}
        onMouseEnter={triggerPrefetch}
        onTouchStart={triggerPrefetch}
        className="group cv-auto block no-underline bg-gray-900/85 dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors duration-200 hover:bg-gray-900 dark:hover:bg-gray-700"
      >
        {/* --- SLIKA --- */}
        <div
          className="relative w-full aspect-[16/9] overflow-hidden bg-gray-800"
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
          {/* Skeleton / Fallback */}
          {(!imgLoaded && !useFallback && currentSrc) && (
             <div className="absolute inset-0 grid place-items-center bg-gray-800 animate-pulse">
                <span className="text-[10px] text-gray-500">Nalagam...</span>
             </div>
          )}
          
          {(useFallback || !currentSrc) ? (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <span className="text-sm text-gray-500">Ni slike</span>
             </div>
          ) : (
             <img
               src={currentSrc}
               srcSet={srcSet}
               alt={news.title}
               className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
               sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 20vw"
               onError={() => {
                   if (useProxy) setUseProxy(false)
                   else setUseFallback(true)
               }}
               onLoad={() => setImgLoaded(true)}
               loading="lazy"
               decoding="async"
             />
          )}

          {/* Gumb za predogled (Eye) */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setPreviewUrl(news.link)
            }}
            aria-label="Predogled"
            className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full
                       bg-white/80 dark:bg-gray-900/80 backdrop-blur text-gray-700 dark:text-gray-200
                       opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200"
          >
             <EyeIcon />
          </button>
        </div>

        {/* --- VSEBINA --- */}
        <div className="p-2.5 min-h-[11rem] flex flex-col gap-2">
          {/* Header novice */}
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-[12px] font-medium tracking-wide" style={{ color: sourceColor }}>
              {news.source}
            </span>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">
               <TimeAgo ms={news.publishedAt} />
            </span>
          </div>

          <h3 className="line-clamp-3 text-[15px] font-semibold leading-tight text-gray-100">
            {news.title}
          </h3>
          <p className="mt-1 line-clamp-3 text-[13px] text-gray-400">
            {(news as any).contentSnippet}
          </p>

          {/* --- POVEZANE NOVICE --- */}
          {(primarySource || related.length > 0) && (
            <div className="mt-auto pt-3 border-t border-gray-700/50">
               {/* Zadnja objava indikator */}
               <div className="flex items-center gap-2 mb-2">
                  <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
                     <span className="text-[10px] text-indigo-300">▼</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                     Zadnja objava
                  </span>
               </div>
               
               {/* Glavni vir (če ni isti kot trenutni) */}
               {primarySource && primarySource !== news.source && (
                   <div className="mb-2 px-2 py-1 bg-gray-800/50 rounded flex items-center gap-2">
                       <SourceLogo source={primarySource} />
                       <span className="text-[11px] text-gray-300">{primarySource}</span>
                   </div>
               )}

               {/* Drugi viri */}
               {related.length > 0 && (
                   <div className="flex flex-col gap-1">
                       {related.map((item, idx) => (
                           <RelatedItemRow 
                               key={item.link + idx} 
                               item={item} 
                               onPreview={(url) => setPreviewUrl(url)}
                               onOpen={(url, src) => logClick('open_related', { parent: news.link, url, source: src })}
                           />
                       ))}
                   </div>
               )}
            </div>
          )}
        </div>
      </a>

      {/* --- PREVIEW MODAL --- */}
      {previewUrl && (
        <ArticlePreview 
            url={previewUrl} 
            onClose={() => setPreviewUrl(null)} 
        />
      )}
    </>
  )
}

// --- MANJŠE KOMPONENTE (Za čistočo) ---

const EyeIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
)

const SourceLogo = ({ source }: { source: string }) => {
    const logo = getSourceLogoPath(source)
    if (!logo) {
        return (
            <span className="h-4 w-4 rounded-full bg-gray-700 flex items-center justify-center text-[8px] text-gray-300">
                {source.slice(0, 1)}
            </span>
        )
    }
    return (
        <Image 
            src={logo} 
            alt={source} 
            width={16} 
            height={16} 
            className="rounded-full bg-gray-200"
        />
    )
}

const RelatedItemRow = ({ item, onPreview, onOpen }: { 
    item: RelatedItem, 
    onPreview: (url: string) => void,
    onOpen: (url: string, source: string) => void
}) => {
    return (
        <div className="group/rel relative pl-2 pr-1 py-1 rounded hover:bg-gray-800 flex items-center justify-between transition-colors">
            <button 
                className="flex-1 flex items-center gap-2 min-w-0 text-left"
                onClick={(e) => {
                    e.preventDefault()
                    window.open(item.link, '_blank')
                    onOpen(item.link, item.source)
                }}
            >
                <SourceLogo source={item.source} />
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                         <span className="text-[11px] text-gray-300 font-medium truncate pr-2">{item.source}</span>
                         <span className="text-[10px] text-gray-600 shrink-0"><TimeAgo ms={item.publishedAt} /></span>
                    </div>
                    <div className="text-[11px] text-gray-500 truncate group-hover/rel:text-gray-400">
                        {item.title}
                    </div>
                </div>
            </button>
            
            <button
                className="ml-2 p-1 text-gray-500 hover:text-white opacity-0 group-hover/rel:opacity-100 transition-opacity"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onPreview(item.link)
                }}
            >
                <EyeIcon />
            </button>
        </div>
    )
}
