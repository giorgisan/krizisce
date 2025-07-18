// /pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'

let cachedNews: Record<string, any[]> = {}
let lastFetchTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minut

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const now = Date.now()

  if (now - lastFetchTime > CACHE_DURATION || Object.keys(cachedNews).length === 0) {
    cachedNews = await fetchRSSFeeds()
    lastFetchTime = now
  }

  res.status(200).json(cachedNews)
}
