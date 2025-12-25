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
import Image from 'next/image' // Uporabljamo samo za ikone virov
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

// --- HELPER FUNKCIJE ---

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
      if (r.link === news.link) return null // Prepreči duplikat glavne novice
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
  if (min < 60) return `${min} min` // Krajši zapis za trending kartico
  if (hr < 24) return `${hr} h`
  const d = new Date(ms)
  return new Intl.DateTimeFormat('sl-SI', {
    day: 'numeric',
    month: 'short',
  }).format(d)
}

// --- GLAVNA KOMPONENTA ---

export default function TrendingCard({ news }: Props) {
  // Časovni odtis (osveževanje minut)
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

  const sourceColor = (sourceColors as Record<string, string>)[news.source] || '#fc9c6c'

  // --- LOGIKA SLIKE (Vrnemo originalno logiko z navadnim <img> za hitrost) ---
  const rawImg = news.image ?? null
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  
  // URL slike: Uporabimo proxy za optimizacijo velikosti, če ni napake
  const finalImgSrc = useMemo(() => {
      if (!rawImg) return null;
      if (imgError) return rawImg; // Fallback na original, če proxy odpove
      return proxiedImage(rawImg, 640, 360, 1);
  }, [rawImg, imgError]);

  const finalSrcSet = useMemo(() => {
      if (!rawImg || imgError) return undefined;
      return buildSrcSet(rawImg, IMAGE_WIDTHS, ASPECT);
  }, [rawImg, imgError]);

  const lqipSrc = useMemo(() => {
    if (!rawImg) return null
    return proxiedImage(rawImg, 28, 16, 1)
  }, [rawImg])

  // Reset stanja ob spremembi novice
  useEffect(() => {
      setImgLoaded(false)
      setImgError(false)
  }, [news.link, rawImg])


  // --- INTERAKCIJA ---
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

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return
    e.preventDefault()
    window.open(news.link, '_blank', 'noopener')
    sendBeacon({ source: news.source, url: news.link, action: 'open' })
  }

  // Preview logika
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [eyeHover, setEyeHover] = useState(false)

  // Prefetch
  const preloadedRef = useRef(false)
  const triggerPrefetch = () => {
    if (!preloadedRef.current && canPrefetch()) {
      preloadedRef.current = true
      preloadPreview(news.link).catch(() => {})
      if (finalImgSrc) warmImage(finalImgSrc)
    }
  }

  // Priprava podatkov
  const primarySource = getPrimarySource(news)
  const relatedAll = extractRelatedItems(news)
  // Filtriramo, da ne kažemo linkov, ki so enaki glavni novici
  const related = relatedAll.filter((r) => r.link !== news.link)

  return (
    <>
      <a
        href={news.link}
        target="_blank"
        rel="noopener"
        onClick={handleClick}
        onMouseEnter={triggerPrefetch}
        onTouchStart={triggerPrefetch}
        // SPREMEMBA: Odstranjen 'hover:bg-gray-900' na glavnem containerju
        className="group cv-auto block no-underline bg-gray-900/85 dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors duration-200"
      >
        {/* --- SLIKA CONTAINER --- */}
        <div
          className="relative w-full aspect-[16/9] overflow-hidden bg-gray-800"
          style={
            !imgLoaded && lqipSrc && !imgError
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
          {/* Navaden IMG tag za takojšnje nalaganje */}
          {finalImgSrc ? (
             <img
               src={finalImgSrc}
               srcSet={finalSrcSet}
               alt={news.title}
               className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
               sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 20vw"
               loading="lazy" 
               decoding="async"
               onLoad={() => setImgLoaded(true)}
               onError={() => setImgError(true)}
             />
          ) : (
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gray-600 text-xs">Ni slike</span>
             </div>
          )}

          {/* Gumb za predogled (Eye) */}
          <button
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              setPreviewUrl(news.link)
            }}
            onMouseEnter={() => setEyeHover(true)}
            onMouseLeave={() => setEyeHover(false)}
            className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full
                       bg-white/80 dark:bg-gray-900/80 backdrop-blur text-gray-700 dark:text-gray-200
                       opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>

        {/* --- VSEBINA --- */}
        <div className="p-2.5 min-h-[11rem] flex flex-col gap-2">
          {/* Header vrstica */}
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span 
                className="truncate text-[12px] font-medium tracking-wide" 
                style={{ color: sourceColor }}
            >
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

          {/* --- DRUGI VIRI (Footer kartice) --- */}
          {(primarySource || related.length > 0) && (
            <div className="mt-auto pt-3 border-t border-gray-700/50">
               {/* Naslov sekcije */}
               <div className="flex items-center gap-2 mb-2">
                  <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-300">
                     ▼
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                     Zadnja objava
                  </span>
               </div>
               
               {/* Glavni vir (če ni isti) */}
               {primarySource && primarySource !== news.source && (
                   <div className="mb-2 px-2 py-1 bg-gray-800/50 rounded flex items-center gap-2 opacity-80">
                       <SimpleSourceLogo source={primarySource} />
                       <span className="text-[11px] text-gray-300">{primarySource}</span>
                   </div>
               )}

               {/* Seznam povezanih člankov */}
               {related.length > 0 && (
                   <div className="flex flex-col gap-1">
                       {related.map((item, idx) => (
                           <button
                               key={item.link + idx}
                               onClick={(e) => {
                                   e.preventDefault(); e.stopPropagation();
                                   window.open(item.link, '_blank');
                                   sendBeacon({ source: item.source, url: item.link, action: 'open_related', meta: { parent: news.link } });
                               }}
                               // SPREMEMBA: Tu ohranimo hover efekt samo za ta gumb
                               className="group/rel w-full text-left rounded-lg bg-gray-900/60 hover:bg-gray-800 border border-gray-800/80 px-2 py-1.5 flex items-start gap-2 transition-colors relative"
                           >
                               <div className="mt-[2px] shrink-0">
                                   <SimpleSourceLogo source={item.source} />
                               </div>
                               <div className="flex-1 min-w-0">
                                   <div className="flex justify-between items-baseline">
                                        <span className="text-[11px] text-gray-300 font-medium truncate pr-2">
                                            {item.source}
                                        </span>
                                        <span className="text-[10px] text-gray-600 shrink-0">
                                            {formatRelativeTime(item.publishedAt, now)}
                                        </span>
                                   </div>
                                   <div className="text-[11px] text-gray-500 truncate group-hover/rel:text-gray-300 transition-colors">
                                       {item.title}
                                   </div>
                               </div>
                               {/* Mali gumb za preview znotraj vrstice */}
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
                       ))}
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

// Preprosta komponenta za logotipe
function SimpleSourceLogo({ source }: { source: string }) {
    const logo = getSourceLogoPath(source)
    if (logo) {
        return (
            <Image 
                src={logo} 
                alt={source} 
                width={16} 
                height={16} 
                className="rounded-full bg-gray-200"
                unoptimized
            />
        )
    }
    return (
        <span className="h-4 w-4 rounded-full bg-gray-700 flex items-center justify-center text-[8px] text-gray-300">
            {source.slice(0, 1)}
        </span>
    )
}
