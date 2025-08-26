import type { NextApiRequest, NextApiResponse } from 'next'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const forceFresh = req.query.forceFresh === '1'

    // 1. poskusi prebrati iz Supabase
    if (!forceFresh) {
      const { data } = await supabase
        .from('news')
        .select('*')
        .order('publishedAt', { ascending: false })
        .limit(100)

      // če so podatki OK, jih vrni
      if (data && data.length > 0) {
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        return res.status(200).json(data)
      }
    }

    // 2. sicer naloži sveže
    const fresh = await fetchRSSFeeds({ forceFresh: true })

    const payload = fresh.map(({ isoDate, pubDate, contentSnippet, content, ...rest }) => ({
      ...rest,
      isodate: isoDate,
      pubdate: pubDate,
      contentsnippet: contentSnippet,
    }))

    const { error } = await supabase.from('news').upsert(payload, { onConflict: 'link' })
    if (error) console.error('Supabase upsert error:', error)

    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
    return res.status(200).json(fresh)
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return res.status(500).json({ error: 'Failed to fetch news' })
  }
}
