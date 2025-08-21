import { NewsItem } from '@/types'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'
import { sourceColors } from '@/lib/sources'
import { MouseEvent, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'

interface Props {
  news: NewsItem
}

const ArticlePreview = dynamic(() => import('./ArticlePreview'), { ssr: false })

export default function ArticleCard({ news }: Props) {
  const formattedDate = format(new Date(news.isoDate), 'd. MMM, HH:mm', { locale: sl })
  const sourceColor = sourceColors[news.source] || '#fc9c6c'

  const [showPreview, setShowPreview] = useState(false)

  const handleClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    // Srednji klik ali Ctrl/Cmd klik naj normalno odpre v novem zavihku
    if (e.metaKey || e.ctrlKey || e.button === 1) return

    // Levi klik: odpri v novem tabu in zabeleži klik
    e.preventDefault()
    window.open(news.link, '_blank')

    try {
      await fetch('/api/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: news.source, url: news.link }),
      })
    } catch (error) {
      console.error('Napaka pri beleženju klika:', error)
    }
  }

  return (
    <>
      <a
        href={news.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        title="Odpri članek v novem zavihku"
        className="group block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 transform hover:scale-[1.01] hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {/* Slika + quick actions */}
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          <Image
            src={news.image || '/logos/default-news.jpg'}
            alt={news.title}
            fill
            className="object-cover"
            loading="lazy"
          />

          {/* QUICK PREVIEW: oko – spodaj levo */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowPreview(true)
            }}
            aria-label="Predogled članka"
            title="Predogled"
            className="absolute left-2 bottom-2 h-9 w-9 rounded-full
                       bg-white/85 dark:bg-gray-900/70
                       text-gray-800 dark:text-gray-100
                       backdrop-blur-md shadow ring-1 ring-black/5 dark:ring-white/10
                       flex items-center justify-center
                       transition
                       hover:bg-white dark:hover:bg-gray-900
                       focus:outline-none focus:ring-2 focus:ring-[var(--ring)]
                       opacity-100 md:opacity-0 md:group-hover:opacity-100"
          >
            {/* Ikona oko (preview) */}
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>

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
