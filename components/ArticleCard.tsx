import { NewsItem } from '@/types'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'
import Image from 'next/image'

type Props = {
  news: NewsItem
}

export default function ArticleCard({ news }: Props) {
  const handleClick = () => {
    // Takoj odpri povezavo
    window.open(news.link, '_blank')

    // Nato asinhrono pošlji klik v Supabase
    fetch('/api/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: news.source,
        url: news.link,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
      }),
    }).catch((error) => console.error('Napaka pri zapisovanju klika:', error))
  }

  const formattedDate = format(new Date(news.isoDate), "d. MMM, HH:mm", {
    locale: sl,
  })

  return (
    <div
      onClick={handleClick}
      className="bg-gray-800 rounded-lg overflow-hidden shadow-md cursor-pointer transition-transform duration-300 hover:scale-[1.01] hover:bg-gray-700"
    >
      {news.image && (
        <div className="relative w-full h-44">
          <Image
            src={news.image}
            alt={news.title}
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>
      )}

      <div className="p-4 flex flex-col space-y-1">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span className="text-brand font-semibold">{news.source}</span>
          <span>{formattedDate}</span>
        </div>
        <h3 className="text-white font-semibold text-sm line-clamp-3 leading-snug">
          {news.title}
        </h3>
        <p className="text-gray-400 text-sm line-clamp-4 leading-snug">
          {news.contentSnippet}
        </p>
      </div>
    </div>
  )
}
