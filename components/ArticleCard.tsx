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
        {/* Slika */}
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          <Image
            src={news.image || '/default-news.jpg'}
            alt={news.title}
            fill
            className="object-cover"
            loading="lazy"
          />

          {/* Oko (PREVIEW):
              - mobile: vidno (opacity-100)
              - ≥md: skrito, pokaži ob hoverju kartice (group-hover)
          */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowPreview(true)
            }}
            aria-label="Predogled"
            title="Predogled"
            className="
              absolute top-2 right-2 p-2 rounded-full
              bg-white/85 dark:bg-gray-900/70 text-gray-800 dark:text-gray-100
              ring-1 ring-black/5 dark:ring-white/10 shadow

              /* mobile: vedno vidno */
              opacity-100 scale-100

              /* desktop: skrito, prikaži ob hoverju kartice */
              md:opacity-0 md:scale-90 md:group-hover:opacity-100 md:group-hover:scale-100

              /* animacije */
              transition-all duration-300 ease-out
              hover:animate-bounce-subtle

              /* a11y: če uporabnik ne mara animacij */
              motion-reduce:transition-none motion-reduce:transform-none
            "
          >
            {/* Ikona oko */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>

        {/* Vsebina kartice */}
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
