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
import { proxiedImage } from '@/lib/img' 
import { sourceColors } from '@/lib/sources'
import { getSourceLogoPath } from '@/lib/sourceMeta'
import { CATEGORIES, determineCategory } from '@/lib/categories'

type PreviewProps = { url: string; onClose: () => void }
const ArticlePreview = dynamic(() => import('./ArticlePreview'), { ssr: false }) as ComponentType<PreviewProps>

const TARGET_WIDTH = 640 
const TARGET_HEIGHT = 360

interface Props { news: NewsItem; priority?: boolean }

export default function ArticleCard({ news, priority = false }: Props) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timeToNextMinute = 60000 - (Date.now() % 60000)
    const timeoutId = setTimeout(() => {
      setNow(Date.now())
      const intervalId = setInterval(() => {
        setNow(Date.now())
      }, 60000)
      return () => clearInterval(intervalId)
    }, timeToNextMinute)
    return () => clearTimeout(timeoutId)
  }, [])

  const formattedDate = useMemo(() => {
    const ms = news.publishedAt || 0
    if (!ms) return ''
    const diff = now - ms
    const oneDayMs = 24 * 60 * 60 * 1000
    if (diff > oneDayMs) {
       const d = new Date(ms)
       return new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'short' }).format(d)
    }
    const min = Math.floor(diff / 60_000)
    const hr  = Math.floor(min / 60)
    if (diff < 60_000) return 'zdaj'
    if (min  < 60)       return `pred ${min} min`
    if (hr   < 24)       return `pred ${hr} h`
    return ''
  }, [news.publishedAt, now])

  const sourceColor = useMemo(() => {
    return (sourceColors as Record<string, string>)[news.source] || '#fc9c6c'
  }, [news.source])

  const logoPath = useMemo(() => {
    return getSourceLogoPath(news.source)
  }, [news.source])

  const categoryDef = useMemo(() => {
    const catId = news.category || determineCategory({ link: news.link, categories: [] })
    return CATEGORIES.find(c => c.id === catId)
  }, [news.category, news.link])

  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    try {
      const coarse   = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
      const touchCap = typeof navigator !== 'undefined' && ((navigator as any).maxTouchPoints || (navigator as any).msMaxTouchPoints) > 0
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
  
  const cardRef = useRef<HTMLAnchorElement>(null)

  const currentSrc = useMemo(() => {
    if (!rawImg) return null
    if (useProxy) return proxiedImage(rawImg, TARGET_WIDTH, TARGET_HEIGHT, 1)
    return rawImg
  }, [rawImg, useProxy])

  const lqipSrc = useMemo(() => {
    if (!rawImg) return null
    return proxiedImage(rawImg, 28, 16, 1)
  }, [rawImg])

  useEffect(() => {
    setUseProxy(!!rawImg)
    setUseFallback(!rawImg)
  }, [news.link, rawImg])

  const handleImgError = () => {
    if (rawImg && useProxy) {
      setUseProxy(false)
      setImgLoaded(false)
      return
    }
    if (!useFallback) {
      setUseFallback(true)
      setImgLoaded(false)
    }
  }

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
      sendBeacon({ source: news.source, url: news.link, action: 'preview_open' })
    } else if (previewOpenedAtRef.current) {
      const duration = Date.now() - previewOpenedAtRef.current
      previewOpenedAtRef.current = null
      sendBeacon({ source: news.source, url: news.link, action: 'preview_close', meta: { duration_ms: duration } })
    }
  }, [showPreview, news.source, news.link])

  const [eyeVisible, setEyeVisible] = useState(false)
  const [eyeHover,   setEyeHover]   = useState(false)
  const showEye = isTouch ? true : eyeVisible

  // ... (začetek datoteke in logika ArticleCard ostaneta nespremenjena) ...

  return (
    <>
      <a
        // ... (vsi tisti stari reši, target, rel, onMouseEnter, etc. ostanejo enaki) ...
        ref={cardRef}
        href={news.link}
        target="_blank"
        rel="noopener"
        referrerPolicy="strict-origin-when-cross-origin"
        onClick={handleClick}
        onAuxClick={handleAuxClick}
        onMouseEnter={() => { setEyeVisible(true); }}
        onMouseLeave={() => { setEyeVisible(false); setEyeHover(false) }}
        onFocus={() => { setEyeVisible(true); }}
        onBlur={() => { setEyeVisible(false); setEyeHover(false) }}
        
        data-umami-event="Click News"
        data-umami-event-source={news.source} 
        data-umami-event-type="feed"          

        className="cv-auto group flex flex-col h-full no-underline bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <div
          className="relative w-full aspect-[16/9] overflow-hidden shrink-0"
          style={ /* ... */ }
        >
          {/* Skeleton loading in Slika ostanejo enaki... */}

          {/* Kategorija Label - NOVO: Bolj 'pill' dizajn, manjša zameglitev, polna barva ozadja */}
          {categoryDef && categoryDef.id !== 'ostalo' && (
             <span className={`hidden sm:flex items-center absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white bg-black/60 dark:bg-black/80 backdrop-blur-sm rounded-full pointer-events-none`}>
               {categoryDef.label}
             </span>
          )}

          {/* Preview Gumb ostane enak ... */}
        </div>

        {/* ========== BESEDILO - VRNJENO NA KOMPAKTNOST ========== */}
        {/* p-3 namesto p-4, flex-col brez gap-2.5 */}
        <div className="p-3 flex flex-col flex-1">
          {/* mb-2 za tesen, a jasen razmik od naslova */}
          <div className="mb-2 flex items-center justify-between flex-wrap gap-y-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {logoPath && (
                <div className="relative h-4 w-4 shrink-0 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <Image 
                    src={logoPath} 
                    alt={news.source} 
                    width={16} 
                    height={16}
                    className="object-cover h-full w-full"
                    unoptimized={true} 
                  />
                </div>
              )}
              {/* Zadržimo uppercase in tracking za urejen videz, a manjša velikost */}
              <span className="truncate text-[10px] font-bold uppercase tracking-wider" style={{ color: sourceColor }}>
                {news.source}
              </span>
            </div>
            
            <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0 tabular-nums font-medium">
               {formattedDate}
            </span>
          </div>
          
          {/* Naslov: font-serif ohranjamo, mb-1 vrnemo, leading-tight vrnemo, velikost rahlo prilagojena */}
          <h3 className="font-serif line-clamp-3 text-[15px] sm:text-[16px] font-semibold leading-tight text-gray-900 dark:text-gray-100 mb-1">
            {news.title}
          </h3>
          
          {/* Snippet: vrnjeno na line-clamp-3 za več vsebine */}
          <p className="line-clamp-3 text-[13px] leading-snug text-gray-600 dark:text-gray-400 flex-1">
            {news.contentSnippet}
          </p>
        </div>
      </a>

      {showPreview && <ArticlePreview url={news.link} onClose={() => setShowPreview(false)} />}
    </>
  )
}
