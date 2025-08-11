// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const forceFresh = req.query.forceFresh === '1'
    const news = await fetchRSSFeeds({ forceFresh })
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
    res.status(200).json(news)
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Failed to fetch news' })
  }
}
