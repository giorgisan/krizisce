import type { NextApiRequest, NextApiResponse } from 'next'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const forceFresh = req.query.forceFresh === '1'
    // poskusi prebrati iz Supabase, če ne zahtevamo svežih podatkov
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
    // sicer preberi sveže novice in jih upsert-aj
    const fresh = await fetchRSSFeeds({ forceFresh: true })
    const payload = fresh.map((item) => ({
      ...item,
      isodate: item.isoDate,
      pubdate: item.pubDate,
    }))
    const { error: insertError } = await supabase.from('news').upsert(payload, { onConflict: 'link' })
    if (insertError) console.error('Supabase insert error:', insertError)
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
    return res.status(200).json(fresh)
  } catch (e) {
    console.error('Failed to fetch news:', e)
    return res.status(500).json({ error: 'Failed to fetch news' })
  }
}
