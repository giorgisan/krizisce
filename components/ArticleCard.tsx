// components/ArticleCard.tsx
'use client'

import { NewsItem } from '@/types'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'
import { sourceColors } from '@/lib/sources'
import { MouseEvent, useMemo, useState, ComponentType } from 'react'
import dynamic from 'next/dynamic'

interface Props {
  news: NewsItem
}

// ---- Preview modal typing ----
type PreviewProps = { url: string; onClose: () => void }

const ArticlePreview = dynamic(() => import('./ArticlePreview'), {
  ssr: false,
}) as ComponentType<PreviewProps>

// Rezervna slika
const FALLBACK_SRC = '/logos/default-news.jpg'

export default function ArticleCard({ news }: Props) {
  const formattedDate = format(new Date(news.isoDate), 'd. MMM, HH:mm', { locale: sl })
  const sourceColor = sourceColors[news.source] || '#fc9c6c'

  // Slika + fallback
  const [imgSrc, setImgSrc] = useState<string | null>(news.image || null)
  const [useFallback, setUseFallback] = useState<boolean>(!news.image)
  const onImgError = () => {
    if (!useFallback) {
      setImgSrc(FALLBACK_SRC)
      setUseFallback(true)
    }
  }

  // (trenutno neuporabljeno – koristno za značke)
  const sourceInitials = useMemo(() => {
    const parts = (news.source || '').split(' ').filter(Boolean)
    if (parts.length === 0) return '??'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }, [news.source])

  const [showPreview, setShowPreview] = useState(false)

  // ——— Logging klika (deluje tudi pri middle-click) ———
  const logClick = () => {
    try {
      const payload = JSON.stringify({ source: news.source, url: news.link })
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/click', blob)
      } else {
        fetch('/api/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        })
      }
    } catch {
      /* ignore */
    }
  }

  // Levi klik: odpri takoj + log
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Meta/Ctrl ali middle-click: pusti default vedenje (odpre nov tab)
    if (e.metaKey || e.ctrlKey || e.button === 1) return
    e.preventDefault()
    window.open(news.link, '_blank')
    logClick()
  }

  // Middle-click (aux): samo zabeleži in pusti browserju, da odpre
  const handleAuxClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 1) {
      logClick()
    }
  }

  return (
    <>
      <a
        href={news.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        onAuxClick={handleAuxClick}
        className="group block no-underline bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {/* MEDIA */}
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          {useFallback ? (
            // Minimalističen fallback: gradient + “Ni slike”
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700" />
              <span className="relative z-10 text-sm font-medium text-gray-700 dark:text-gray-300">
                Ni slike
              </span>
            </div>
          ) : (
            <img
              src={imgSrc as string}
              alt={news.title}
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              onError={onImgError}
            />
          )}

          {/* Oko – na mobitelu vedno vidno; na desktopu šele na hover kartice */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowPreview(true)
            }}
            aria-label="Predogled"
            className="
              peer absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full
              ring-1 ring-black/10 dark:ring-white/10
              text-gray-700 dark:text-gray-200
              bg-white/80 dark:bg-gray-900/80 backdrop-blur
              transition-all duration-150
              opacity-100 scale-100
              md:opacity-0 md:scale-95
              md:group-hover:opacity-100 md:group-hover:scale-100
              hover:scale-110 active:scale-100
            "
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>

          {/* Tooltip – “Predogled novice” samo na hover OČESA (desktop) */}
          <span
            className="
              hidden md:block pointer-events-none
              absolute top-2 right-[calc(0.5rem+2rem+8px)]
              rounded-md px-2 py-1 text-xs font-medium
              bg-black/60 text-white
              backdrop-blur-sm drop-shadow-lg
              opacity-0 -translate-x-1
              transition-all duration-150
              md:peer-hover:opacity-100 md:peer-hover:translate-x-0
            "
          >
            Predogled&nbsp;novice
          </span>
        </div>

        {/* TEXT */}
        <div className="p-3">
          <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-[0.7rem]" style={{ color: sourceColor }}>
              {news.source}
            </span>
            <span>{formattedDate}</span>
          </div>

          <h2
            className="text-sm font-semibold leading-snug line-clamp-3 mb-1 text-gray-900 dark:text-white"
            title={news.title}
          >
            {news.title}
          </h2>

          {news.contentSnippet && (
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-tight line-clamp-4">
              {news.contentSnippet}
            </p>
          )}
        </div>
      </a>

      {showPreview && (
        <ArticlePreview url={news.link} onClose={() => setShowPreview(false)} />
      )}
    </>
  )
}
