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
import { preloadPreview, canPrefetch } from '@/lib/previewPrefetch'

interface Props { news: NewsItem }

type PreviewProps = { url: string; onClose: () => void }
const ArticlePreview = dynamic(() => import('./ArticlePreview'), { ssr: false }) as ComponentType<PreviewProps>

const ASPECT = 16 / 9

function formatDisplayTime(publishedAt?: number, iso?: string) {
  const ms = publishedAt ?? (iso ? Date.parse(iso) : 0)
  if (!ms) return ''
  const diff = Date.now() - ms
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(min / 60)
  if (diff < 60_000) return 'pred nekaj sekundami'
  if (min < 60) return `pred ${min} min`
  if (hr < 24) return `pred ${hr} h`
  const d = new Date(ms)
  const date = new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'short' }).format(d)
  const time = new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(d)
  return `${date}, ${time}`
}

export default function ArticleCard({ news }: Props) {
  const formattedDate = formatDisplayTime(news.publishedAt, news.isoDate)

  // barva vira
  const sourceColor = useMemo(() => {
    const colors = require('@/lib/sources').sourceColors as Record<string, string>
    return colors[news.source] || '#fc9c6c'
  }, [news.source])

  // ---- Slika prek PROXY-ja (Next optimizer) ----
  const rawImg = news.image ?? null
  const proxySrc = useMemo(() => {
    if (!rawImg) return null
    // osnovna 16:9 dimenzija; Next bo sam prilagodil preko "sizes"/deviceSizes
    const w = 640, h = Math.round(640 / ASPECT)
    // dpr tu namenoma 1; optimizer bo serviral ustrezne širine
    return proxiedImage(rawImg, w, h, 1)
  }, [rawImg])

  const [imgFailed, setImgFailed] = useState(false)
  const handleImgError = () => setImgFailed(true)

  // Priority: samo za kartice, ki so že skoraj v viewportu
  const cardRef = useRef<HTMLAnchorElement>(null)
  const [priority, setPriority] = useState(false)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.top < (window.innerHeight || 0) * 0.9) setPriority(true)
  }, [])

  // Klik log
  const logClick = () => {
    try {
      const payload = JSON.stringify({ source: news.source, url: news.link })
      if ('sendBeacon' in navigator) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/click', blob)
      } else {
        fetch('/api/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true })
      }
    } catch {}
  }
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return
    e.preventDefault()
    window.open(news.link, '_blank')
    logClick()
  }
  const handleAuxClick = (e: MouseEvent<HTMLAnchorElement>) => { if (e.button === 1) logClick() }

  // ✅ Preview modal
  const [showPreview, setShowPreview] = useState(false)

  // Prefetch za preview
  const preloadedRef = useRef(false)
  const doPrefetch = () => {
    if (!preloadedRef.current && canPrefetch()) {
      preloadedRef.current = true
      preloadPreview(news.link).catch(() => {})
    }
  }

  return (
    <>
      <a
        ref={cardRef}
        href={news.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        onAuxClick={handleAuxClick}
        onMouseEnter={doPrefetch}
        onFocus={doPrefetch}
        className="group block no-underline bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {/* Media */}
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          {!proxySrc || imgFailed ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700" />
              <span className="relative z-10 text-sm font-medium text-gray-700 dark:text-gray-300">Ni slike</span>
            </div>
          ) : (
            <Image
              src={proxySrc}
              alt={news.title}
              fill
              className="absolute inset-0 h-full w-full object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              priority={priority}
              onError={handleImgError}
              // ⛔️ ne uporabljaj 'unoptimized' → pusti Vercel optimizer naj opravi svoje
            />
          )}

          {/* Oko (predogled) – čisti CSS: group-hover za opacity in scale */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPreview(true) }}
            aria-label="Predogled"
            className="
              absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full
              ring-1 ring-black/10 dark:ring-white/10 text-gray-700 dark:text-gray-200
              bg-white/80 dark:bg-gray-900/80 backdrop-blur
              transition-all duration-150 transform-gpu
              md:opacity-0 group-hover:md:opacity-100
              hover:scale-125 focus:scale-125
            "
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>

          <span
            className="
              hidden md:block pointer-events-none absolute top-2
              right-[calc(0.5rem+2rem+8px)]
              rounded-md px-2 py-1 text-xs font-medium bg-black/60 text-white
              backdrop-blur-sm drop-shadow-lg opacity-0 -translate-x-1
              transition-opacity transition-transform duration-150
              group-hover:opacity-100 group-hover:translate-x-0
            "
          >
            Predogled&nbsp;novice
          </span>
        </div>

        {/* Besedilo */}
        <div className="p-2.5 min-h-[10rem] sm:min-h-[10rem] md:min-h-[9.75rem] lg:min-h-[9.5rem] xl:min-h-[9.5rem] overflow-hidden">
          <div className="mb-1 grid grid-cols-[1fr_auto] items-baseline gap-x-2">
            <span className="truncate text-[12px] font-medium tracking-[0.01em]" style={{ color: sourceColor }}>
              {news.source}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{formattedDate}</span>
          </div>
          <h3 className="line-clamp-3 text-[15px] font-semibold leading-tight text-gray-900 dark:text-gray-100">{news.title}</h3>
          <p className="mt-1 line-clamp-3 text-[13px] text-gray-700 dark:text-gray-300">{news.contentSnippet}</p>
        </div>
      </a>

      {/* Lazy modal */}
      {showPreview && <ArticlePreview url={news.link} onClose={() => setShowPreview(false)} />}
    </>
  )
}
