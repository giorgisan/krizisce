import React from 'react'
import { NewsItem } from '@/types'

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
        {/* zgornji del: vir na levi, datum in ura na desni */}
        <div className="flex justify-between items-center mb-1">
          <span className="text-purple-400 text-sm font-semibold">
            {news.source}
          </span>
          <span className="text-gray-400 text-xs">{formattedDate}</span>
        </div>

        <h3 className="font-semibold mb-2">{news.title}</h3>
        <p className="text-sm text-gray-300 mb-2">{news.contentSnippet}</p>

        {/* spodnji del: število ogledov in komentarjev, če obstajata; trenutno NewsItem tega nima */}
        {/* Primer strukture; namesto SVG‑jev lahko uporabite knjižnice ikon (npr. react-icons) */}
        {news.views !== undefined || news.comments !== undefined ? (
          <div className="mt-auto flex items-center gap-3 text-gray-400 text-xs">
            {news.views !== undefined && (
              <span className="flex items-center gap-1">
                <span aria-hidden>👁</span>
                {news.views}
              </span>
            )}
            {news.comments !== undefined && (
              <span className="flex items-center gap-1">
                <span aria-hidden>💬</span>
                {news.comments}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </a>
  )
}
