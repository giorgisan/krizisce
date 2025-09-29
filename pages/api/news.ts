// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import type { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'

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

function rowToItem(r: any): NewsItem {
  return {
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
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const forceFresh = req.query.forceFresh === '1'
    const debug = req.query.debug === '1'
    const paged = req.query.paged === '1'

    // Common query params for paginated mode
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '40'), 10) || 40, 1), 100)
    const cursorParam = req.query.cursor != null ? Number(req.query.cursor) : null
    const source = typeof req.query.source === 'string' ? req.query.source : null

    // 2) Svež RSS upsert (če je zahtevano)
    if (forceFresh) {
      const fresh = await fetchRSSFeeds({ forceFresh: true })
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

      // V "forceFresh" načinu ohranimo star API: vrnemo seznam (za tvoj refresh/polling).
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
      return res.status(200).json(fresh)
    }

    // 1) Branje iz Supabase – zdaj podpira tudi paginacijo
    let query = supabase
      .from('news')
      .select('link,title,source,image,contentsnippet,isodate,pubdate,publishedat')

    if (source && source !== 'Vse') {
      query = query.eq('source', source)
    }

    if (paged) {
      // kurzorska paginacija: beri STAREJŠE od cursor (ali zadnje, če cursor ni podan)
      if (cursorParam != null) {
        query = query.lt('publishedat', cursorParam)
      }
      query = query.order('publishedat', { ascending: false }).limit(limit)

      const { data, error } = await query
      if (error) {
        return res.status(200).json({ items: [], nextCursor: null })
      }
      const items = (data || []).map(rowToItem)

      // naslednji cursor = zadnji publishedat v batchu (če ga je)
      const last = items.length ? items[items.length - 1].publishedAt : null
      const nextCursor = items.length < limit ? null : last

      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
      return res.status(200).json({ items, nextCursor })
    } else {
      // stari način: vrni samo “prvih 100” za začetne prikaze ali fallback
      query = query.order('publishedat', { ascending: false }).limit(100)

      const { data, error } = await query
      if (!error && Array.isArray(data) && data.length) {
        const payload: NewsItem[] = data.map(rowToItem)
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        return res.status(200).json(payload)
      }

      // Če ni podatkov, poskusi svež RSS in vrni seznam (brez paginacije)
      const fresh = await fetchRSSFeeds({ forceFresh: true })
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
      return res.status(200).json(fresh)
    }
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return res.status(500).json({ error: 'Failed to fetch news' })
  }
}
