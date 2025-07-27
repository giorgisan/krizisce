// components/ArticleCard.tsx

import React from 'react'
import { NewsItem } from '@/types'
import { sourceColors } from '@/lib/sources' // <- dodaj uvoz barv

type Props = {
  news: NewsItem
}

export default function ArticleCard({ news }: Props) {
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
        {/* vir novice z dinamično barvo */}
        <p className={`text-sm mb-1 font-semibold ${sourceColors[news.source] ?? 'text-purple-400'}`}>
          {news.source}
        </p>
        {/* naslov */}
        <h3 className="font-semibold mb-2">{news.title}</h3>
        {/* povzetek */}
        <p className="text-sm text-gray-300 mb-1">{news.contentSnippet}</p>
        {/* datum in ura */}
        <p className="text-xs text-gray-400">{formattedDate}</p>
      </div>
    </a>
  )
}
