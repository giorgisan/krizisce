// components/ArticleCard.tsx

import React from 'react'
import { NewsItem } from '@/types'
import { sourceColors } from '@/lib/sources'

type Props = {
  news: NewsItem
}

export default function ArticleCard({ news }: Props) {
  const sourceColor = sourceColors[news.source] ?? '#9E9E9E'

  const formattedDate = new Date(news.pubDate).toLocaleString('sl-SI', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const handleClick = async () => {
    console.log('🟠 Klik izveden:', news.source, news.link)

    try {
      const res = await fetch('/api/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: news.source,
          url: news.link,
        }),
      })

      const data = await res.json()
      console.log('🟢 API odgovor:', data)

      window.open(news.link, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('🔴 Napaka pri pošiljanju klika:', err)
      window.open(news.link, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className="cursor-pointer text-left w-full bg-gray-800 hover:bg-gray-700 rounded-xl shadow-md overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl animate-fade-in"
    >
      {news.image && (
        <img
          src={news.image}
          alt={news.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-center mb-1">
          <p className="text-sm font-semibold" style={{ color: sourceColor }}>
            {news.source}
          </p>
          <p className="text-xs text-gray-400 whitespace-nowrap">{formattedDate}</p>
        </div>
        <h3 className="font-semibold text-[0.95rem] leading-snug line-clamp-3 mb-1">
          {news.title}
        </h3>
        <p className="text-sm text-gray-400 line-clamp-4">{news.contentSnippet}</p>
      </div>
    </div>
  )
}
