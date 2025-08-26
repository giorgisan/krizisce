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

    // 1) najprej poskusi iz Supabase (če ni prisile)
    if (!forceFresh) {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('publishedat', { ascending: false })
        .limit(100)

      if (!error && data?.length) {
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
        return res.status(200).json(
          // premapiraj nazaj v NewsItem (ohranjamo kompatibilnost)
          data.map((row: any) => ({
            title: row.title,
            link: row.link,
            source: row.source,
            image: row.image,
            content: row.content ?? '',
            contentSnippet: row.contentsnippet ?? '',
            isoDate: row.isodate ?? row.pubdate ?? new Date(row.publishedat).toISOString(),
            pubDate: row.pubdate ?? row.isodate ?? new Date(row.publishedat).toISOString(),
            publishedAt: row.publishedat ?? Date.parse(row.isodate ?? row.pubdate ?? Date.now()),
          })) as NewsItem[]
        )
      }
    }

    // 2) svež RSS fetch
    const fresh = await fetchRSSFeeds({ forceFresh: true })

    // 3) pripravi payload za bazo
    const payload = fresh.map(({ isoDate, pubDate, contentSnippet, publishedAt, ...rest }) => ({
      ...rest,
      isodate: isoDate,
      pubdate: pubDate,
      contentsnippet: contentSnippet,
      publishedat: publishedAt,
      link_canonical: canonicalizeLink(rest.link),
    }))

    // 4) upsert po kanoničnem linku (dedupe UTM variacij)
    const { error: upsertError } = await supabase
      .from('news')
      .upsert(payload, { onConflict: 'link_canonical' })

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError)
      // nadaljujemo – ne blokiramo odgovora
    }

    // 5) vračamo svež odgovor; dajmo kratek CDN cache proti burstom
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    return res.status(200).json(fresh)
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return res.status(500).json({ error: 'Failed to fetch news' })
  }
}
