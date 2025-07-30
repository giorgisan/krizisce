/* components/ArticleCard.tsx */
import React from 'react'
import { NewsItem } from '@/types'
import { sourceColors } from '@/lib/sources'
import Image from 'next/image'

type Props = {
  news: NewsItem
}

export default function ArticleCard({ news }: Props) {
  const formattedDate = new Date(news.pubDate).toLocaleString('sl-SI')
  const sourceColor = sourceColors[news.source] ?? '#9E9E9E'

  return (
    <article className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg shadow-sm fade-in">
      {news.image && (
        <div className="mb-3">
          <Image
            src={news.image}
            alt={news.title}
            width={640}
            height={360}
            className="w-full h-auto rounded"
          />
        </div>
      )}
      <div className="text-sm font-semibold mb-1" style={{ color: sourceColor }}>
        {news.source}
      </div>
      <h2 className="text-lg font-bold mb-2">{news.title}</h2>
      <p className="text-sm line-clamp-3 mb-2">{news.contentSnippet}</p>
      <time className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</time>
    </article>
  )
}
