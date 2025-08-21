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
  const formattedDate = format(new Date(news.isoDate), 'd. MMM, HH:mm', {
    locale: sl,
  })

  const sourceColor = sourceColors[news.source] || '#fc9c6c'

  const [showPreview, setShowPreview] = useState(false)

  const handleClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) {
      return
    }

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
        className="group block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden 
                   transition-all duration-200 transform hover:scale-[1.01] 
                   hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          <Image
            src={news.image || '/default-news.jpg'}
            alt={news.title}
            fill
            className="object-cover"
            loading="lazy"
          />

          {/* Gumb za predogled (oko) — prikaže se le ob hoverju */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowPreview(true)
            }}
            aria-label="Prikaži predogled"
            className="absolute top-2 right-2 p-2 rounded-full 
                       bg-white/80 dark:bg-gray-900/70 text-gray-700 dark:text-gray-200 
                       shadow-sm opacity-0 group-hover:opacity-100 
                       transition-all duration-200 hover:bg-white dark:hover:bg-gray-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>

        <div className="p-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span
              className="font-medium text-[0.7rem]"
              style={{ color: sourceColor }}
            >
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
