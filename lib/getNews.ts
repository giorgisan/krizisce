import type { NewsItem } from '@/types'

export default async function getNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch('/api/news-cache')
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? (data as NewsItem[]) : []
  } catch {
    return []
  }
}
