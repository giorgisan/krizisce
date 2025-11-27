// components/TrendingCard.tsx
'use client'

import React from 'react'
import type { NewsItem } from '@/types'

type StorySource = { source: string; link: string }

type TrendingNewsItem = NewsItem & {
  storySources?: StorySource[]
}

type Props = {
  news: TrendingNewsItem
}

export default function TrendingCard({ news }: Props) {
  const mainLink = news.link
  const storySources = Array.isArray(news.storySources) ? news.storySources : []

  const onMainClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (mainLink) {
      window.open(mainLink, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <article className="flex flex-col rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 text-sm overflow-hidden">
      {news.image && (
        <button
          onClick={onMainClick}
          className="block w-full aspect-[16/9] overflow-hidden bg-gray-200 dark:bg-gray-700"
        >
          {/* navadni <img> zaradi hitrosti nalaganja */}
          <img
            src={news.image}
            alt={news.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </button>
      )}

      <div className="flex flex-col p-3 gap-1.5">
        <button
          onClick={onMainClick}
          className="text-left font-semibold leading-snug hover:underline"
        >
          {news.title}
        </button>

        {news.contentSnippet && (
          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">
            {news.contentSnippet}
          </p>
        )}

        <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
          <div className="mb-0.5">
            Glavni vir: <span className="font-medium">{news.source}</span>
          </div>

          {storySources.length > 1 && (
            <div className="flex flex-wrap gap-[4px] items-center">
              <span className="font-medium">Pokrivajo:</span>
              {storySources.map((s, idx) => (
                <span key={s.source + s.link}>
                  {idx > 0 && <span>, </span>}
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {s.source}
                  </a>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
