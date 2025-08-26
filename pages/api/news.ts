import type { NextApiRequest, NextApiResponse } from 'next'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const forceFresh = req.query.forceFresh === '1'

    // najprej poskusi prebrati iz Supabase (če ni forceFresh)
    if (!forceFresh) {
      const { data } = await supabase
        .from('news')
        .select('*')
        .order('isodate', { ascending: false })
        .limit(100)
      if (data?.length) {
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        return res.status(200).json(data)
      }
    }

    // naloži sveže novice
    const fresh = await fetchRSSFeeds({ forceFresh: true })

    // zgradi payload: pretvori isoDate -> isodate, pubDate -> pubdate,
    // contentSnippet -> contentsnippet, ostala polja pusti nespremenjena
    const payload = fresh.map(({ isoDate, pubDate, contentSnippet, ...rest }) => ({
      ...rest,
      isodate: isoDate,
      pubdate: pubDate,
      contentsnippet: contentSnippet,
    }))

    const { error: upsertError } = await supabase
      .from('news')
      .upsert(payload, { onConflict: 'link' })

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError)
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
    return res.status(200).json(fresh)
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return res.status(500).json({ error: 'Failed to fetch news' })
  }
}
