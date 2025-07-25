import React from 'react'
import { NewsItem } from '@/types'

type Props = {
  news: NewsItem
}

export default function ArticleCard({ news }: Props) {
  // datum in ura v slovenskem formatu
  const formattedDate = new Date(news.pubDate).toLocaleString('sl-SI')

  return (
    <a
      href={news.link}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-gray-800 hover:bg-gray-700 rounded-xl shadow-md overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl animate-fade-in"
    >
      {/* slika članka, če obstaja */}
      {news.image && (
        <img
          src={news.image}
          alt={news.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4 flex flex-col flex-1">
        {/* zgornja vrstica: vir na levi, datum in ura na desni */}
        <div className="flex justify-between items-center mb-1">
          <span className="text-purple-400 text-sm font-semibold">
            {news.source}
          </span>
          <span className="text-gray-400 text-xs">{formattedDate}</span>
        </div>

        {/* naslov in povzetek */}
        <h3 className="font-semibold mb-2">{news.title}</h3>
        <p className="text-sm text-gray-300 mb-2">{news.contentSnippet}</p>

        {/* tukaj lahko dodate prikaz ogledov/komentarjev, če tip NewsItem to podpira */}
      </div>
    </a>
  )
}
