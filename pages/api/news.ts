// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'
import type { NewsItem } from '@/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const forceFresh = req.query.forceFresh === '1'
    const debug = req.query.debug === '1'

    // 1) najprej poskusi iz Supabase (če ni prisile)
    if (!forceFresh) {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('publishedat', { ascending: false })
        .limit(100)

      if (!error && data?.length) {
        const payload: NewsItem[] = data.map((r: any) => ({
          title: r.title,
          link: r.link,
          source: r.source,
          image: r.image ?? null,
          contentSnippet: r.contentsnippet ?? '',
          pubDate: r.pubdate ?? undefined,
          isoDate: r.isodate ?? undefined,
          publishedAt:
            typeof r.publishedat === 'number'
              ? r.publishedat
              : r.publishedat
              ? Date.parse(r.publishedat)
              : 0,
        }))
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        return res.status(200).json(payload)
      }
    }

    // 2) sicer naloži sveže iz RSS
    const fresh = await fetchRSSFeeds({ forceFresh: true })

    // 3) pripravi zapis za Supabase
    const payload = fresh.map(({ isoDate, pubDate, contentSnippet, publishedAt, ...rest }) => ({
      ...rest,
      isodate: isoDate,
      pubdate: pubDate,
      contentsnippet: contentSnippet,
      publishedat: publishedAt, // Unix ms (BIGINT)
    }))

    const { error: upsertError } = await supabase
      .from('news')
      .upsert(payload, { onConflict: 'link' })

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError)
      if (debug) {
        return res.status(500).json({ ok: false, upsertError })
      }
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
    return res.status(200).json(fresh)
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return res.status(500).json({ error: 'Failed to fetch news', details: String(error) })
  }
}
