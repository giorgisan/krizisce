// components/ArticleCard.tsx

import { NewsItem } from '@/types'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'
import { MouseEvent } from 'react'

interface Props {
  news: NewsItem
}

export default function ArticleCard({ news }: Props) {
  const handleClick = async (e: MouseEvent) => {
    // Takoj odpri povezavo
    window.open(news.link, '_blank')

    // Asinhrono zabeleži klik
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
    <div
      onClick={handleClick}
      className="bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform duration-200 ease-in-out transform hover:scale-105 hover:bg-gray-700"
    >
      <div className="w-full h-44 overflow-hidden">
        <img
          src={news.image || '/default-news.jpg'}
          alt={news.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="p-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span className="font-medium text-[0.7rem] text-brand">{news.source}</span>
          <span>{formattedDate}</span>
        </div>

        <h2 className="text-sm font-semibold leading-snug line-clamp-3 mb-1">
          {news.title}
        </h2>

        {news.contentSnippet && (
          <p className="text-gray-400 text-sm leading-tight line-clamp-4">
            {news.contentSnippet}
          </p>
        )}
      </div>
    </div>
  )
}
