// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'
import type { NewsItem } from '@/types'

// odstrani UTM/track parametre in hash; ohrani semantične parametre
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

    // 1) poskusi iz Supabase (če ni prisile)
    if (!forceFresh) {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('publishedat', { ascending: false })
        .limit(100)

      res.setHeader('x-news-supabase-read', error ? 'error' : String(data?.length ?? 0))

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
              : (r.publishedat ? Date.parse(r.publishedat) : 0),
        }))
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        return res.status(200).json(payload)
      }
    }

    // 2) fetch svežih novic
    const fresh = await fetchRSSFeeds({ forceFresh: true })

    // 3) pripravi payload (ključno: link_canonical)
    const payload = fresh.map(({ isoDate, pubDate, contentSnippet, publishedAt, link, ...rest }) => ({
      ...rest,
      link,
      link_canonical: canonicalizeLink(link),
      isodate: isoDate,
      pubdate: pubDate,
      contentsnippet: contentSnippet,
      publishedat: publishedAt,
    }))

    // 4) upsert po link_canonical (imaš unique index)
    const upsert = await supabase
      .from('news')
      .upsert(payload, { onConflict: 'link_canonical' })
      .select('id')

    res.setHeader('x-news-upsert-status', upsert.error ? 'error' : 'ok')
    res.setHeader('x-news-upsert-count', String(upsert.data?.length ?? 0))

    if (upsert.error) {
      // vrni v body, da takoj vidiš kaj se dogaja (tudi na produkciji)
      return res.status(200).json({ fresh, dbError: upsert.error.message })
    }

    // 5) odgovor
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    return res.status(200).json(fresh)
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch news', detail: String(error?.message ?? error) })
  }
}
