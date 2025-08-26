// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const forceFresh = req.query.forceFresh === '1'

    // If not forced, try to serve from Supabase cache
    if (!forceFresh) {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('isoDate', { ascending: false })
        .limit(100)

      if (!error && data && data.length) {
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        return res.status(200).json(data)
      }
    }

    // Fetch latest news from RSS
    const fresh = await fetchRSSFeeds({ forceFresh: true })

    // Upsert into Supabase by unique link
    const { error: insertError } = await supabase
      .from('news')
      .upsert(fresh, { onConflict: 'link' })

    if (insertError) {
      console.error('Supabase insert error:', insertError)
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
    return res.status(200).json(fresh)
  } catch (e: any) {
    console.error('Failed to fetch news:', e)
    res.status(500).json({ error: 'Failed to fetch news' })
  }
}
