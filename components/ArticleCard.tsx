// components/ArticleCard.tsx

import React from 'react'
import Head from 'next/head'
import { NewsItem } from '@/types'
import { sourceColors } from '@/lib/sources'

type Props = {
  news: NewsItem
}

export default function ArticleCard({ news }: Props) {
  const formattedDate = new Date(news.pubDate).toLocaleString('sl-SI')
  const sourceColor = sourceColors[news.source] ?? '#9E9E9E'

  const now = Date.now()
  const published = Date.parse(news.pubDate)
  const isNew = !isNaN(published) && (now - published < 60 * 60 * 100) // manj kot 1 ura

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": news.title,
    "image": news.image,
    "datePublished": news.pubDate,
    "author": {
      "@type": "Organization",
      "name": news.source
    },
    "url": news.link
  }

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>

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
            loading="lazy"
          />
        )}
        <div className="p-4 flex flex-col flex-1">
          <p className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: sourceColor }}>
            {news.source}
            {isNew && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                🆕 novo
              </span>
            )}
          </p>
          <h3 className="font-semibold mb-2">{news.title}</h3>
          <p className="text-sm text-gray-300 mb-1">{news.contentSnippet}</p>
          <p className="text-xs text-gray-400">{formattedDate}</p>
        </div>
      </a>
    </>
  )
}
