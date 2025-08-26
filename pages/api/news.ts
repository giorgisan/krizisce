import type { NextApiRequest, NextApiResponse } from 'next'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'
import type { NewsItem } from '@/types'

// kanonizacija URL (odstrani utm, fbclid ...)
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

    // 1) poskus iz Supabase (če ni prisile)
    if (!forceFresh) {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('publishedat', { ascending: false })
        .limit(100)

      res.setHeader('x-supa-read', error ? `error:${error.message}` : String(data?.length ?? 0))

      if (!error && data?.length) {
        const payload: NewsItem[] = data.map((r: any) => ({
          title: r.title,
          link: r.link,
          source: r.source,
          image: r.image ?? null,
          contentSnippet: r.contentsnippet ?? '',
          pubDate: r.pubdate ?? undefined,
          isoDate: r.isodate ?? undefined,
          publishedAt: r.publishedat != null ? Number(r.publishedat) : 0,
        }))
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        return res.status(200).json(payload)
      }
    }

    // 2) svež RSS
    const fresh = await fetchRSSFeeds({ forceFresh: true })

    // 3) payload za bazo
    const payload = fresh.map(({ isoDate, pubDate, contentSnippet, publishedAt, link, ...rest }) => ({
      ...rest,
      link,
      link_canonical: canonicalizeLink(link),
      isodate: isoDate,
      pubdate: pubDate,
      contentsnippet: contentSnippet,
      publishedat: publishedAt,
    }))

    // 4) upsert po link_canonical (mora biti UNIQUE + NOT NULL)
    const up = await supabase
      .from('news')
      .upsert(payload, { onConflict: 'link_canonical' })
      .select('id') // forsira returning za diagnostiko

    res.setHeader('x-supa-upsert', up.error ? `error:${up.error.message}` : `ok:${up.data?.length ?? 0}`)

    if (up.error) {
      // jasno pokažemo napako v body-ju
      return res.status(200).json({ fresh, dbError: up.error.message })
    }

    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    return res.status(200).json(fresh)
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch news', detail: String(e?.message ?? e) })
  }
}
