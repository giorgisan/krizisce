// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import type { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'

// odstrani UTM parametre in nepotrebne ključke
function canonicalizeLink(href: string): string {
  try {
    const u = new URL(href)
    const keep = new URLSearchParams()
    u.searchParams.forEach((v, k) => {
      if (!/^utm_/i.test(k) && !/^(fbclid|gclid|mc_cid|mc_eid)$/i.test(k)) keep.set(k, v)
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

    // 1) poskusi iz Supabase, če ni prisile
    if (!forceFresh) {
      const { data, error } = await supabase
        .from('news')
        .select('link,title,source,image,contentsnippet,isodate,pubdate,publishedat') // izberi le potrebne stolpce
        .order('publishedat', { ascending: false })
        .limit(100)

      if (!error && Array.isArray(data) && data.length) {
        const payload: NewsItem[] = data.map((r: any) => ({
          title: r.title,
          link: r.link,
          source: r.source,
          image: r.image ?? null,
          contentSnippet: r.contentsnippet ?? '',
          isoDate: r.isodate ?? undefined,
          pubDate: r.pubdate ?? undefined,
          publishedAt:
            typeof r.publishedat === 'number'
              ? r.publishedat
              : (r.publishedat ? Date.parse(r.publishedat) : 0),
        }))
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        return res.status(200).json(payload)
      }
    }

    // 2) svež RSS
    const fresh = await fetchRSSFeeds({ forceFresh: true })

    // 3) payload z allowlist polji (brez content ipd.)
    const payloadForDb = fresh.map(({ isoDate, pubDate, contentSnippet, publishedAt, link, title, source, image }) => ({
      link,
      title,
      isodate: isoDate,
      pubdate: pubDate ?? null,
      source,
      image: image ?? null,
      contentsnippet: contentSnippet ?? null,
      summary: null,
      publishedat: publishedAt || 0,
      link_canonical: canonicalizeLink(link),
    }))

    // 4) upsert po 'link' – brez parametra 'returning'
    const { error: upsertError } = await supabase
      .from('news')
      .upsert(payloadForDb, { onConflict: 'link' })

    if (upsertError) {
      if (debug) {
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
        return res.status(200).json({ ok: false, upsertError })
      }
      console.error('Supabase upsert error:', upsertError)
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')

    if (debug) {
      // TS-safe: vložimo št. vrstic, ki smo jih poskušali upsertati
      const inserted = payloadForDb.length
      return res.status(200).json({
        ok: true,
        inserted,
        sample: payloadForDb.slice(0, 2),
      })
    }

    // 5) vrni svež nabor
    return res.status(200).json(fresh)
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return res.status(500).json({ error: 'Failed to fetch news' })
  }
}
