import React from 'react'
import { NewsItem } from '@/types'
import { sourceColors } from '@/lib/sources'

type Props = {
  news: NewsItem
}

// Format datuma: 17. avg., 17:05
const formatDate = (isoDate: string) => {
  const date = new Date(isoDate)
  return date.toLocaleString('sl-SI', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', '.')
}

export default function ArticleCard({ news }: Props) {
  const sourceColor = sourceColors[news.source] ?? '#9E9E9E'
  const formattedDate = formatDate(news.pubDate)

  return (
    <a
      href={news.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-gray-800 hover:bg-gray-700 rounded-xl shadow-md overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl cursor-pointer animate-fade-in"
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
        <h3 className="font-semibold text-base leading-snug line-clamp-3 mb-1">
          {news.title}
        </h3>
        <p className="text-sm text-gray-400 line-clamp-4">
          {news.contentSnippet}
        </p>
      </div>
    </a>
  )
}
