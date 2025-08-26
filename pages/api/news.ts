// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import type { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'

// (opcijsko) kanoniziraj URL za dedup (odstrani utm, fbclid, hash)
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
        .select('*')
        .order('publishedat', { ascending: false })
        .limit(100)

      if (!error && Array.isArray(data) && data.length) {
        const payload: NewsItem[] = data.map((r: any) => ({
          title: r.title,
          link: r.link,
          source: r.source,
          image: r.image ?? null,
          // UI bere kratki povzetek iz contentsnippet
          contentSnippet: r.contentsnippet ?? '',
          // ISO/pubDate (če obstajata) pustimo za kompatibilnost
          isoDate: r.isodate ?? undefined,
          pubDate: r.pubdate ?? undefined,
          // glavno za sortiranje
          publishedAt:
            typeof r.publishedat === 'number'
              ? r.publishedat
              : (r.publishedat ? Date.parse(r.publishedat) : 0),
        }))
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        return res.status(200).json(payload)
      }
    }

    // 2) naloži svež RSS nabor
    const fresh = await fetchRSSFeeds({ forceFresh: true })

    // 3) pripravi payload izključno s stolpci, ki jih tabela dejansko ima
    //    (link, title, isodate, pubdate, source, image, contentsnippet, summary?, publishedat, link_canonical?)
    const payloadForDb = fresh.map(({ isoDate, pubDate, contentSnippet, publishedAt, link, title, source, image }) => ({
      link,
      title,
      isodate: isoDate,
      pubdate: pubDate ?? null,
      source,
      image: image ?? null,
      contentsnippet: contentSnippet ?? null,
      summary: null,                 // stolpec obstaja in je NULLable
      publishedat: publishedAt || 0, // BIGINT (Unix ms)
      link_canonical: canonicalizeLink(link),
    }))

    // 4) upsert (po 'link' – ohrani kompatibilnost z obstoječo UNIQUE(link))
    const { data: upsertData, error: upsertError } = await supabase
      .from('news')
      .upsert(payloadForDb, { onConflict: 'link' })

    if (upsertError) {
      // v debug režimu vrnemo neposredno napako, sicer samo logiramo
      if (debug) {
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
        return res.status(200).json({ ok: false, upsertError })
      }
      console.error('Supabase upsert error:', upsertError)
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')

    if (debug) {
      const inserted = Array.isArray(upsertData) ? upsertData.length : 0
      return res.status(200).json({
        ok: true,
        inserted,
        sample: payloadForDb.slice(0, 2),
      })
    }

    // 5) vrni svež nabor (že vsebuje publishedAt)
    return res.status(200).json(fresh)
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return res.status(500).json({ error: 'Failed to fetch news' })
  }
}
