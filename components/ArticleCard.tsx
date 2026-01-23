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
const ArticlePreview = dynamic(() => import('./ArticlePreview'), { ssr: false }) as ComponentType<PreviewProps>

const ASPECT = 16 / 9
const IMAGE_WIDTHS = [320, 480, 640]

interface Props {
  news: NewsItem & { [key: string]: any }
  priority?: boolean
}

function formatRelativeTime(ms: number | null | undefined, now: number): string {
  if (!ms) return ''
  const diff = now - ms
  if (diff < 60000) return 'zdaj'
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  return new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'short' }).format(new Date(ms))
}

export default function ArticleCard({ news, priority = false }: Props) {
  const [minuteTick, setMinuteTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setMinuteTick(x => x+1), 60000)
    return () => clearInterval(t)
  }, [])

  const now = Date.now()
  const primaryTime = useMemo(() => formatRelativeTime(news.publishedAt, now), [news.publishedAt, minuteTick])
  const sourceColor = (sourceColors as Record<string, string>)[news.source] || '#fc9c6c'

  // Image Logic
  const rawImg = news.image ?? null
  const [useProxy, setUseProxy] = useState(!!rawImg)
  const [useFallback, setUseFallback] = useState(!rawImg)
  const [imgLoaded, setImgLoaded] = useState(false)

  const currentSrc = useMemo(() => {
    if (!rawImg) return null
    return proxiedImage(rawImg, 640, 360, 1)
  }, [rawImg, useProxy])

  const srcSet = useMemo(() => {
    if (!rawImg || !useProxy) return ''
    return buildSrcSet(rawImg, IMAGE_WIDTHS, ASPECT)
  }, [rawImg, useProxy])

  const lqipSrc = useMemo(() => proxiedImage(rawImg, 28, 16, 1), [rawImg])

  const handleImgError = () => {
    if (useProxy) setUseProxy(false)
    else setUseFallback(true)
  }

  // Click handler (lahko dodaš sendBeacon tukaj če rabiš)
  const handleClick = (e: MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.button === 1) return
  }
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [hover, setHover] = useState(false)
  
  const triggerPrefetch = () => {
     if (canPrefetch()) {
         preloadPreview(news.link).catch(()=>{})
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
      onMouseEnter={() => { setHover(true); triggerPrefetch() }}
      onMouseLeave={() => setHover(false)}
      onTouchStart={triggerPrefetch}
      className="group flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-gray-700/50"
    >
      {/* SLIKA */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
         {!imgLoaded && lqipSrc && !useFallback && (
             <div className="absolute inset-0 bg-cover bg-center blur-lg opacity-50 scale-110" style={{ backgroundImage: `url(${lqipSrc})` }} />
         )}

         {currentSrc && !useFallback ? (
            <img
                src={currentSrc as string}
                srcSet={srcSet}
                alt={news.title}
                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onError={handleImgError}
                onLoad={() => setImgLoaded(true)}
                loading={priority ? 'eager' : 'lazy'}
            />
         ) : (
            <div className="absolute inset-0 grid place-items-center text-gray-400">
                <span className="text-xs">Brez slike</span>
            </div>
         )}
         
         <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(news.link) }}
            className={`absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 shadow-sm transition-all duration-200 ${hover ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
         >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" /></svg>
         </button>
      </div>

      {/* VSEBINA - Flex grow, da se poravna dno kartic */}
      <div className="p-4 flex flex-col flex-1">
         <div className="flex justify-between items-baseline mb-2">
            <span className="text-[10px] font-bold tracking-wider uppercase truncate pr-2" style={{ color: sourceColor }}>
                {news.source}
            </span>
            <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap font-medium">
                {primaryTime}
            </span>
         </div>

         {/* Naslov - Povečan line-clamp na 3 */}
         <h3 className="text-[17px] font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-3 group-hover:text-brand transition-colors mb-2">
            {news.title}
         </h3>

         {/* Snippet - Povečan line-clamp na 4 in večji font */}
         {(news as any).contentSnippet && (
             <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4 leading-relaxed mt-auto">
                 {(news as any).contentSnippet}
             </p>
         )}
      </div>
    </a>
    {previewUrl && <ArticlePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </>
  )
}
