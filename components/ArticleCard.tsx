import React from 'react'
import { NewsItem } from '@/types'

type Props = {
  news: NewsItem
}

export default function ArticleCard({ news }: Props) {
  // oblikujemo datum že tukaj, da ni preračuna v renderju
  const formattedDate = new Date(news.pubDate).toLocaleString('sl-SI')

  return (
    <a
      href={news.link}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-gray-800 hover:bg-gray-700 rounded-xl shadow-md overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl animate-fade-in"
    >
      {news.image && (
        <img
          src={news.image}
          alt={news.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-purple-400 text-sm mb-1">{news.source}</p>
        <h3 className="font-semibold mb-2">{news.title}</h3>
        <p className="text-sm text-gray-300 mb-2">{news.contentSnippet}</p>
        {/* namesto „Preberi več“ prikazujemo čas objave */}
        <p className="text-sm text-gray-400">{formattedDate}</p>
      </div>
    </a>
  )
}
