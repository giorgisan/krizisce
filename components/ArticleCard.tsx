// components/ArticleCard.tsx
import { NewsItem } from '@/types'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'
import { sourceColors } from '@/lib/sources'
import { MouseEvent, useMemo, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'

interface Props {
  news: NewsItem
}

const ArticlePreview = dynamic(() => import('./ArticlePreview'), { ssr: false })

const FALLBACK_SRC = '/logos/default-news.jpg' // <- imaš ga v /public/logos/

export default function ArticleCard({ news }: Props) {
  const formattedDate = format(new Date(news.isoDate), 'd. MMM, HH:mm', { locale: sl })
  const sourceColor = sourceColors[news.source] || '#fc9c6c'

  // --- Fallback logika ---
  const [imgSrc, setImgSrc] = useState<string | null>(news.image || null)
  const [useFallback, setUseFallback] = useState<boolean>(!news.image)

  const onImgError = () => {
    if (!useFallback) {
      setImgSrc(FALLBACK_SRC)
      setUseFallback(true)
    }
  }

  // začetnice vira (za “no image” ploščico)
  const sourceInitials = useMemo(() => {
    const parts = (news.source || '').split(' ').filter(Boolean)
    if (parts.length === 0) return '??'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }, [news.source])

  const [showPreview, setShowPreview] = useState(false)

  const handleClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return
    e.preventDefault()
    window.open(news.link, '_blank')
    try {
      await fetch('/api/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: news.source, url: news.link }),
      })
    } catch {}
  }

  return (
    <>
      <a
        href={news.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="group block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 transform hover:scale-[1.01] hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {/* MEDIA */}
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          {useFallback ? (
            // Lep “no image” blok, ko slike ni ali je zatajila
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700" />
              <div className="relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 text-white backdrop-blur-sm">
                {/* Očesce/preview ikonca kot “decor” */}
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.7" fill="none"/>
                  <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" fill="none"/>
                </svg>
                <span className="text-xs font-medium tracking-wide">Ni slike</span>
                <span
                  className="ml-2 grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold"
                  style={{ background: sourceColor }}
                  title={news.source}
                >
                  {sourceInitials}
                </span>
              </div>
            </div>
          ) : (
            <Image
              src={imgSrc as string}
              alt={news.title}
              fill
              className="object-cover transition-opacity duration-300 opacity-0 data-[loaded=true]:opacity-100"
              onError={onImgError}
              onLoad={(e) => {
                // dodaj data-loaded za fade-in
                (e.target as HTMLImageElement).setAttribute('data-loaded', 'true')
              }}
              // pomaga pri hotlink 403
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          )}

          {/* PREVIEW “oko” gumb */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowPreview(true)
            }}
            aria-label="Predogled"
            className="absolute top-2 right-2 h-8 w-8 rounded-full grid place-items-center
                       bg-white/75 dark:bg-gray-900/75 ring-1 ring-black/10 dark:ring-white/10
                       text-gray-700 dark:text-gray-200
                       transition transform
                       hover:scale-110 hover:bg-white dark:hover:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
            <span className="sr-only">Predogled</span>
          </button>
        </div>

        {/* TEXT */}
        <div className="p-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
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
