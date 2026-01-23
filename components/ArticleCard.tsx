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
// Dodal sem manjše širine za horizontalni prikaz
const IMAGE_WIDTHS = [200, 320, 480, 640, 960]

interface Props {
  news: NewsItem & { [key: string]: any }
  priority?: boolean
  variant?: 'default' | 'horizontal' // NOV prop za preklapljanje izgleda
}

/* ================= HELPERJI (Enaki kot v TrendingCard za konsistentnost) ================= */
function formatRelativeTime(ms: number | null | undefined, now: number): string {
  if (!ms) return ''
  const diff = now - ms
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(min / 60)
  if (diff < 60_000) return 'zdaj'
  if (min < 60) return `${min}m`
  if (hr < 24) return `${hr}h`
  const d = new Date(ms)
  return new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'short' }).format(d)
}

export default function ArticleCard({ news, priority = false, variant = 'default' }: Props) {
  const isHorizontal = variant === 'horizontal'

  // --- TIME ---
  const [minuteTick, setMinuteTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setMinuteTick((x) => x + 1), 60000)
    return () => clearInterval(t)
  }, [])
  const now = Date.now()
  const primaryTime = useMemo(() => {
     return formatRelativeTime(news.publishedAt || 0, now)
  }, [news.publishedAt, minuteTick])

  const sourceColor = (sourceColors as Record<string, string>)[news.source] || '#fc9c6c'

  // --- IMAGE LOGIC (Robust) ---
  const rawImg = news.image ?? null
  const proxyInitiallyOn = !!rawImg

  const [useProxy, setUseProxy] = useState<boolean>(proxyInitiallyOn)
  const [useFallback, setUseFallback] = useState<boolean>(!rawImg)
  const [imgLoaded, setImgLoaded] = useState<boolean>(false)
  const [imgKey, setImgKey] = useState<number>(0)

  const currentSrc = useMemo(() => {
    if (!rawImg) return null
    // Za horizontalni pogled rabimo manjšo sliko (npr 240x135), za default 640x360
    const w = isHorizontal ? 320 : 640
    const h = isHorizontal ? 240 : 360 // Malo višje razmerje za horizontalno
    
    if (useProxy) return proxiedImage(rawImg, w, h, 1)
    return rawImg
  }, [rawImg, useProxy, isHorizontal])

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

  // --- ANALITIKA & KLIK ---
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      // Tu lahko dodaš sendBeacon logiko, če želiš enako sledenje kot pri TrendingCard
      // Zaenkrat pustimo preprosto
      if (e.ctrlKey || e.metaKey || e.button === 1) return
      // logClick() ...
  }
  
  // --- PREVIEW ---
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreviewBtn, setShowPreviewBtn] = useState(false)

  const triggerPrefetch = () => {
      if (canPrefetch()) {
          preloadPreview(news.link).catch(() => {})
          if (rawImg) warmImage(proxiedImage(rawImg, 1280, 720, 1))
      }
  }

  return (
    <>
    <a
      href={news.link}
      target="_blank"
      rel="noopener"
      onClick={handleClick}
      onMouseEnter={() => { setShowPreviewBtn(true); triggerPrefetch() }}
      onMouseLeave={() => setShowPreviewBtn(false)}
      onTouchStart={triggerPrefetch}
      className={`
        group relative block bg-white dark:bg-gray-800 rounded-xl overflow-hidden transition-all duration-200
        ${isHorizontal 
            ? 'flex flex-row items-stretch h-full hover:bg-gray-50 dark:hover:bg-gray-750 shadow-sm border border-transparent hover:border-gray-200 dark:border-gray-800 dark:hover:border-gray-700' 
            : 'shadow-md hover:translate-y-[-2px] hover:shadow-lg dark:border dark:border-gray-700'
        }
      `}
    >
      {/* --- SLIKA --- */}
      <div 
        className={`
            relative overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0
            ${isHorizontal 
                ? 'w-[130px] sm:w-[180px] md:w-[220px]' 
                : 'w-full aspect-[16/9]'
            }
        `}
      >
         {/* LQIP Blur Background */}
         {!imgLoaded && lqipSrc && !useFallback && (
             <div 
               className="absolute inset-0 bg-cover bg-center opacity-50 blur-lg scale-110"
               style={{ backgroundImage: `url(${lqipSrc})` }}
             />
         )}

         {/* Fallback ali Loader */}
         {useFallback || !currentSrc ? (
            <div className="absolute inset-0 grid place-items-center text-gray-400 bg-gray-100 dark:bg-gray-800">
                <svg className="w-8 h-8 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
         ) : (
            <img
                key={imgKey}
                src={currentSrc as string}
                srcSet={isHorizontal ? undefined : srcSet} // Za horizontal ne rabimo srcset toliko
                alt={news.title}
                className={`
                    absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105
                    ${imgLoaded ? 'opacity-100' : 'opacity-0'}
                `}
                onError={handleImgError}
                onLoad={() => setImgLoaded(true)}
                loading={priority ? 'eager' : 'lazy'}
            />
         )}

         {/* Preview Gumb (Samo če NI horizontal, ker tam ni prostora/ni lepo) */}
         {!isHorizontal && (
             <button
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  setPreviewUrl(news.link)
                }}
                className={`absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full
                            bg-white/90 dark:bg-gray-900/90 backdrop-blur text-gray-700 dark:text-gray-200
                            shadow-sm transition-all duration-200
                            ${showPreviewBtn ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
             >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
             </button>
         )}
      </div>

      {/* --- VSEBINA --- */}
      <div className={`flex flex-col flex-1 min-w-0 ${isHorizontal ? 'p-3 sm:p-4' : 'p-4'}`}>
         
         {/* Meta: Vir in Čas */}
         <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-[11px] sm:text-xs font-bold tracking-wide uppercase truncate pr-2" style={{ color: sourceColor }}>
                {news.source}
            </span>
            <span className="text-[10px] sm:text-[11px] text-gray-400 shrink-0 whitespace-nowrap">
                {primaryTime}
            </span>
         </div>

         {/* Naslov */}
         <h3 className={`
            font-bold text-gray-900 dark:text-gray-100 group-hover:text-brand transition-colors
            ${isHorizontal 
                ? 'text-[15px] sm:text-[17px] leading-snug line-clamp-3 mb-1' 
                : 'text-lg leading-tight line-clamp-3 mb-2'
            }
         `}>
            {news.title}
         </h3>

         {/* Snippet (Povzetek) */}
         {/* Logika: Na horizontalnem prikažemo snippet samo na večjih ekranih, da ne zabašemo mobile view-a */}
         {(news as any).contentSnippet && (
             <p className={`
                text-sm text-gray-500 dark:text-gray-400 mt-1
                ${isHorizontal ? 'hidden xl:line-clamp-2' : 'line-clamp-3'}
             `}>
                 {(news as any).contentSnippet}
             </p>
         )}

         {/* Če je horizontal, lahko dodamo še kakšen indikator spodaj, če želimo */}
      </div>
    </a>
    
    {previewUrl && <ArticlePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </>
  )
}
