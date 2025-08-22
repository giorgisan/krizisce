'use client'

import { NewsItem } from '@/types'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'
import { sourceColors } from '@/lib/sources'
import { MouseEvent, useState, ComponentType } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'

interface Props {
  news: NewsItem
}

type PreviewProps = { url: string; onClose: () => void }

const ArticlePreview = dynamic(() => import('./ArticlePreview'), {
  ssr: false,
}) as ComponentType<PreviewProps>

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

  const [showPreview, setShowPreview] = useState(false)

  // Odpri članek v novem zavihku + zabeleži klik
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
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <a
        href={news.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="no-underline group block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 transform hover:scale-[1.01] hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {/* MEDIA */}
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          {useFallback ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700" />
              <span className="relative z-10 text-sm font-medium text-gray-700 dark:text-gray-300">
                Ni slike
              </span>
            </div>
          ) : (
            <Image
              src={imgSrc as string}
              alt={news.title}
              fill
              className="object-cover transition-opacity duration-300 opacity-0 data-[loaded=true]:opacity-100"
              onError={onImgError}
              onLoad={(e) => {
                ;(e.target as HTMLImageElement).setAttribute('data-loaded', 'true')
              }}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          )}

          {/* Gumb za predogled – “oko” */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowPreview(true)
            }}
            aria-label="Predogled"
            className="
              peer absolute top-2 right-2 h-8 w-8 rounded-full grid place-items-center
              bg-white/75 dark:bg-gray-900/75 ring-1 ring-black/10 dark:ring-white/10
              text-gray-700 dark:text-gray-200
              transition-transform duration-150
              opacity-100 pointer-events-auto
              md:opacity-0 md:pointer-events-none
              md:group-hover:opacity-100 md:group-hover:pointer-events-auto
              md:focus-visible:opacity-100 md:focus-visible:pointer-events-auto
              hover:scale-125 active:scale-110
            "
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </button>

          {/* Tooltip */}
          <span
            className="
              hidden md:block pointer-events-none
              absolute top-2 right-[calc(0.5rem+2rem+8px)]
              rounded-md px-2 py-1 text-xs font-medium
              bg-black/70 text-white shadow
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

      {showPreview && <ArticlePreview url={news.link} onClose={() => setShowPreview(false)} />}
    </>
  )
}
