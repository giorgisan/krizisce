// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const forceFresh = req.query.forceFresh === '1'
    // If not forcing a refresh, attempt to serve cached news from Supabase
    if (!forceFresh) {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('isodate', { ascending: false })
        .limit(100)
      if (!error && data && data.length) {
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        return res.status(200).json(data as any)
      }
    }
    // Otherwise fetch fresh news
    const fresh = await fetchRSSFeeds({ forceFresh: true })
    // Prepare payload for Supabase: convert camelCase fields to lowercase column names
    const payload = fresh.map((item) => ({
      ...item,
      isodate: item.isoDate,
      pubdate: item.pubDate,
    }))
    const { error: insertError } = await supabase.from('news').upsert(payload, { onConflict: 'link' })
    if (insertError) {
      console.error('Supabase insert error:', insertError)
    }
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
    return res.status(200).json(fresh)
  } catch (e: any) {
    console.error('Failed to fetch news:', e)
    return res.status(500).json({ error: 'Failed to fetch news' })
  }
}
