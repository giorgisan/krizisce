import type { NextApiRequest, NextApiResponse } from 'next'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'
import type { NewsItem } from '@/types'

function canonicalizeLink(href: string): string {
  try {
    const u = new URL(href)
    const keep = new URLSearchParams()
    u.searchParams.forEach((v, k) => {
      if (!/^utm_/.test(k) && !/^(fbclid|gclid|mc_cid|mc_eid)$/.test(k)) keep.set(k, v)
    })
    u.search = keep.toString()
    u.hash = ''
    return u.toString()
  } catch {
    return href
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const forceFresh = req.query.forceFresh === '1'
    const debug = req.query.debug === '1'

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
          publishedAt:
            typeof r.publishedat === 'number'
              ? r.publishedat
              : r.publishedat
              ? Date.parse(r.publishedat)
              : 0,
          isoDate: r.isodate ?? undefined,
          pubDate: r.pubdate ?? undefined,
        }))
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        return res.status(200).json(payload)
      }
    }

    const fresh = await fetchRSSFeeds({ forceFresh: true })

    const payloadForDb = fresh.map(({ isoDate, pubDate, contentSnippet, publishedAt, link, ...rest }) => ({
      title: rest.title,
      link,
      source: rest.source,
      image: rest.image ?? null,
      contentsnippet: contentSnippet ?? null,
      isodate: isoDate ?? null,
      pubdate: pubDate ?? null,
      publishedat: publishedAt ?? null,
      link_canonical: canonicalizeLink(link),
    }))

    const { data: upsertData, error: upsertError } = await supabase
      .from('news')
      .upsert(payloadForDb, { onConflict: 'link' })

    if (upsertError) {
      if (debug) return res.status(500).json({ ok: false, upsertError })
      console.error('Supabase upsert error:', upsertError)
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')

    if (debug) {
      return res.status(200).json({
        ok: true,
        inserted: (upsertData?.length ?? 0),
        sample: payloadForDb.slice(0, 2),
      })
    }

    return res.status(200).json(fresh)
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return res.status(500).json({ error: 'Failed to fetch news', details: String(error) })
  }
}
