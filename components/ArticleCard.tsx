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
    if (e.metaKey || e.ctrlKey || e.button === 1) return
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
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowPreview(true)
            }}
            aria-label="Predogled"
            title="Predogled"
            className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white 
                       rounded-full text-gray-700 hover:text-gray-900 
                       transition-transform duration-200 hover:animate-bounce-subtle"
          >
            {/* Ikona oko */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.364 4.5 
                   12 4.5c4.636 0 8.577 3.01 9.964 7.183.07.207.07.431 
                   0 .639C20.577 16.49 16.636 19.5 12 19.5c-4.636 
                   0-8.577-3.01-9.964-7.183z"
              />
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
