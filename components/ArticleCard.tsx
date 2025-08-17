// components/ArticleCard.tsx
import React from 'react'
import { NewsItem } from '@/types'
import { sourceColors } from '@/lib/sources'

type Props = {
  news: NewsItem
}

export default function ArticleCard({ news }: Props) {
  const formattedDate = new Date(news.pubDate).toLocaleString('sl-SI')
  const sourceColor = sourceColors[news.source] ?? '#9E9E9E'

  const handleClick = async (e: React.MouseEvent) => {
    console.log('Klik!', news.source, news.link)
    e.preventDefault()  // Optional: prepreči takojšen odhod, samo za test

    try {
      const res = await fetch('/api/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: news.source,
          url: news.link,
        }),
      })
      const data = await res.json()
      console.log('Rezultat:', data)
    } catch (err) {
      console.error('Napaka pri pošiljanju klika:', err)
    }
  }

  return (
    <a
      href={news.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="bg-gray-800 hover:bg-gray-700 rounded-xl shadow-md overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl animate-fade-in"
    >
      {/* ... */}
    </a>
  )
}
