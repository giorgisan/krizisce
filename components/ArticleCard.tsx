// components/ArticleCard.tsx
import { NewsItem } from '@/types'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'
import { MouseEvent, useState } from 'react'
import { sourceColors } from '@/lib/sources'

interface Props {
  news: NewsItem
}

export default function ArticleCard({ news }: Props) {
  const [showPreview, setShowPreview] = useState(false)

  const handleClick = async (e: MouseEvent) => {
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

  const formattedDate = format(new Date(news.isoDate), 'd. MMM, HH:mm', {
    locale: sl,
  })

  return (
    <a
      href={news.link}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className="group surface block overflow-hidden cv-auto fade-in hover:scale-[1.01] transition"
    >
      <div className="relative">
        {news.image && (
          <img
            src={news.image}
            alt={news.title}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        )}

        {/* Oko za predogled */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowPreview(true)
          }}
          aria-label="Predogled"
          className="
            absolute top-2 right-2 h-8 w-8 rounded-full grid place-items-center
            bg-white/75 dark:bg-gray-900/75 ring-1 ring-black/10 dark:ring-white/10
            text-gray-700 dark:text-gray-200 transition

            opacity-100 pointer-events-auto
            md:opacity-0 md:pointer-events-none
            md:group-hover:opacity-100 md:group-hover:pointer-events-auto
            md:focus-visible:opacity-100 md:focus-visible:pointer-events-auto
          "
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
          >
            <path
              d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx="12"
              cy="12"
              r="3.5"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </button>

        {/* Tooltip samo na desktopu */}
        <span
          className="
            pointer-events-none absolute top-2 right-12 translate-y-0.5
            rounded-md px-2 py-1 text-xs font-medium
            bg-black/65 text-white shadow
            opacity-0 transition-opacity
            md:group-hover:opacity-100
          "
        >
          Predogled
        </span>
      </div>

      {/* Vsebina kartice */}
      <div className="p-4">
        <div
          className="text-sm font-medium mb-1"
          style={{ color: sourceColors[news.source] || 'var(--text-dim)' }}
        >
          {news.source}
        </div>
        <h3 className="font-semibold mb-1 line-clamp-2">{news.title}</h3>
        <p className="text-sm text-[var(--text-dim)] line-clamp-3">
          {news.contentSnippet}
        </p>
        <div className="text-xs text-[var(--text-dim)] mt-2">
          {formattedDate}
        </div>
      </div>

      {/* Modal predogleda (če želiš ohraniti) */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full p-6 animate-fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">{news.title}</h2>
            {news.image && (
              <img
                src={news.image}
                alt={news.title}
                className="w-full h-64 object-cover rounded mb-4"
              />
            )}
            <p className="text-sm leading-relaxed">{news.contentSnippet}</p>
            <div className="mt-4 text-right">
              <a
                href={news.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] transition"
              >
                Preberi na {news.source}
              </a>
            </div>
          </div>
        </div>
      )}
    </a>
  )
}
