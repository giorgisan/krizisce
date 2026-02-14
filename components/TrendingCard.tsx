/* components/TrendingCard.tsx */
'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import { NewsItem } from '@/types'
import { sourceColors } from '@/lib/sources'
import { getSourceLogoPath } from '@/lib/sourceMeta'

interface TrendingCardProps {
  news: NewsItem & {
    storyArticles?: Array<{
      source: string
      title: string
      link: string
      publishedAt: number
    }>
  }
  compact?: boolean
  rank?: number
}

export default function TrendingCard({ news, compact = false, rank }: TrendingCardProps) {
  const [imgError, setImgError] = useState(false)
  
  const relativeTime = useMemo(() => {
    const now = Date.now()
    const publishedMs = typeof news.publishedAt === 'number' && news.publishedAt > 0 
      ? news.publishedAt 
      : 0
    
    if (publishedMs === 0) return ''
    
    const diff = Math.max(0, now - publishedMs)
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'pravkar'
    if (minutes < 60) return `pred ${minutes} min`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `pred ${hours} h`
    
    const days = Math.floor(hours / 24)
    return `pred ${days} d`
  }, [news.publishedAt])

  const storyArticles = news.storyArticles || []
  const sourceColor = sourceColors[news.source] || '#fc9c6c'

  const logClick = (targetSource: string, targetLink: string) => {
    try {
      const payload = JSON.stringify({ 
        source: targetSource, 
        url: targetLink, 
        action: 'open',
        from: 'trending' 
      })
      if ('sendBeacon' in navigator) {
        navigator.sendBeacon('/api/click', new Blob([payload], { type: 'application/json' }))
      }
    } catch {}
  }

  const handleMainClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return
    e.preventDefault()
    window.open(news.link, '_blank', 'noopener')
    logClick(news.source, news.link)
  }

  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    if (isLeftSwipe || isRightSwipe) {
      console.log(isLeftSwipe ? 'Swipe left' : 'Swipe right')
    }
  }

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative w-full aspect-[16/9] bg-gray-100 dark:bg-gray-700">
        {news.image && !imgError ? (
          <Image
            src={news.image}
            alt={news.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Križišče
            </span>
          </div>
        )}
        {rank && (
          <div className="absolute top-2 left-2 bg-brand text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
            #{rank}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-2 h-2 rounded-full shrink-0" 
            style={{ backgroundColor: sourceColor }}
          />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {news.source}
          </span>
          {relativeTime && (
            <>
              <span className="text-gray-400 dark:text-gray-600">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {relativeTime}
              </span>
            </>
          )}
        </div>

        
          href={news.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleMainClick}
          className="block mb-2 group"
        >
          <h3 className="text-base font-semibold leading-tight text-gray-900 dark:text-gray-100 group-hover:text-brand transition-colors line-clamp-3">
            {news.title}
          </h3>
        </a>

        {news.contentSnippet && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {news.contentSnippet}
          </p>
        )}

        {storyArticles.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <span className="font-medium">
                Poročajo tudi ({storyArticles.length}):
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {storyArticles.map((article, idx) => {
                const logoPath = getSourceLogoPath(article.source)
                const color = sourceColors[article.source] || '#9ca3af'

                return (
                  
                    key={`${article.link}-${idx}`}
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey) return
                      e.preventDefault()
                      window.open(article.link, '_blank', 'noopener')
                      logClick(article.source, article.link)
                    }}
                    className="group relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand hover:bg-brand/5 transition-all"
                    title={`${article.source}: ${article.title}`}
                  >
                    {logoPath ? (
                      <div className="relative w-4 h-4 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                        <Image 
                          src={logoPath} 
                          alt={article.source} 
                          width={16} 
                          height={16}
                          className="object-cover"
                          unoptimized
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: color }}
                      />
                    )}
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-brand transition-colors">
                      {article.source}
                    </span>
                    <svg 
                      className="w-3 h-3 text-gray-400 group-hover:text-brand transition-colors" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
