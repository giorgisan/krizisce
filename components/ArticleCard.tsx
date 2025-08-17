import React from 'react'
import { NewsItem } from '@/types'
import { sourceColors } from '@/lib/sources'

type Props = {
  news: NewsItem
}

export default function ArticleCard({ news }: Props) {
  const formattedDate = new Date(news.pubDate).toLocaleString('sl-SI', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  const sourceColor = sourceColors[news.source] ?? '#9E9E9E'

  const handleClick = () => {
    // ✅ TAKOJŠNJE odpiranje zavihka – to prepreči blokado pop-upov
    window.open(news.link, '_blank', 'noopener,noreferrer')

    // ⏱ ZAMAKNJENO (neblokirajoče) asinhrono beleženje
    fetch('/api/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: news.source,
        url: news.link,
      }),
    }).catch((err) => {
      console.error('🔴 Napaka pri beleženju klika:', err)
    })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      className="cursor-pointer text-left w-full bg-gray-800 hover:bg-gray-700 rounded-xl shadow-md overflow-hidden flex flex-col transition-all duration-200 transform hover:scale-[1.01] animate-fade-in"
    >
      {news.image && (
        <img
          src={news.image}
          alt={news.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-center mb-1 text-sm">
          <span style={{ color: sourceColor }} className="font-semibold">
            {news.source}
          </span>
          <span className="text-gray-400 text-sm whitespace-nowrap">{formattedDate}</span>
        </div>
        <h3 className="font-semibold text-base leading-tight line-clamp-3 mb-1">
          {news.title}
        </h3>
        <p className="text-sm text-gray-400 line-clamp-4">{news.contentSnippet}</p>
      </div>
    </div>
  )
}
