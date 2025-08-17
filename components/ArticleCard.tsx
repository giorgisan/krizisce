import React from 'react'
import { NewsItem } from '@/types'
import { sourceColors } from '@/lib/sources'

type Props = {
  news: NewsItem
}

export default function ArticleCard({ news }: Props) {
  const formattedDate = new Date(news.pubDate).toLocaleString('sl-SI')
  const sourceColor = sourceColors[news.source] ?? '#9E9E9E'

  const handleClick = async () => {
    console.log('🟠 Klik izveden:', news.source, news.link)

    // Odpri prazno okno TAKOJ, da obidemo pop-up blocker
    const win = window.open('', '_blank')

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

      win?.location.assign(news.link)
    } catch (err) {
      console.error('🔴 Napaka pri pošiljanju klika:', err)
      win?.location.assign(news.link)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
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
        <p className="text-sm font-semibold mb-1" style={{ color: sourceColor }}>
          {news.source}
        </p>
        <h3
          className="font-semibold mb-2 line-clamp-3"
          title={news.title}
        >
          {news.title}
        </h3>
        <p
          className="text-sm text-gray-300 mb-1 line-clamp-4"
          title={news.contentSnippet}
        >
          {news.contentSnippet}
        </p>
        <p className="text-xs text-gray-400">{formattedDate}</p>
      </div>
    </div>
  )
}
