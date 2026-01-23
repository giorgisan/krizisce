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

// Helperji
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

  // Image
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

  // Actions
  const handleClick = (e: MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.button === 1) return
    // Tu bi klical sendBeacon analitiko
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
      className="group block bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-gray-100 dark:border-gray-700/50"
    >
      {/* SLIKA */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-200 dark:bg-gray-700">
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
                <svg className="w-8 h-8 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
         )}
         
         {/* Preview Button */}
         <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(news.link) }}
            className={`absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-200 shadow-sm transition-all duration-200 ${hover ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
         >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" /></svg>
         </button>
      </div>

      {/* VSEBINA */}
      <div className="p-3.5 flex flex-col gap-1.5">
         <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-bold tracking-wider uppercase truncate" style={{ color: sourceColor }}>
                {news.source}
            </span>
            <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                {primaryTime}
            </span>
         </div>

         <h3 className="text-[15px] sm:text-[16px] font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-3 group-hover:text-brand transition-colors">
            {news.title}
         </h3>

         {(news as any).contentSnippet && (
             <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                 {(news as any).contentSnippet}
             </p>
         )}
      </div>
    </a>
    {previewUrl && <ArticlePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </>
  )
}
