// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import supabase from '@/lib/supabase'
import type { NewsItem } from '@/types'

// (opcijsko) kanoniziraj link (brez utm idr.)
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

    // 1) najprej poskusi prebrati iz Supabase (če ni prisile)
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
          // v UI zdaj uporabljamo publishedAt (unix ms)
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

    // 2) sicer naloži sveže iz RSS
    const fresh = await fetchRSSFeeds({ forceFresh: true })

    // 3) pripravi zapis IZRECNO samo z obstoječimi stolpci v bazi
    const payloadForDb = fresh.map(({ isoDate, pubDate, contentSnippet, publishedAt, link, ...rest }) => ({
      // ---- stolpci, ki obstajajo v public.news ----
      title: rest.title,
      link, // unikat po tem (ohranjamo onConflict:'link')
      source: rest.source,
      image: rest.image ?? null,
      contentsnippet: contentSnippet ?? null,
      isodate: isoDate ?? null,
      pubdate: pubDate ?? null,
      publishedat: publishedAt ?? null, // BIGINT (unix ms)

      // (opcijsko) če imaš v bazi tudi link_canonical, super — drugače ga DB ignorira
      link_canonical: canonicalizeLink(link),
      // ------------------------------------------------
      // POZOR: namerno NE pošiljamo `content`, ker stolpec v bazi NE obstaja.
    }))

    // 4) upsert (dedupe po linku – imaš unique na `link`)
    const { data: upsertData, error: upsertError } = await supabase
      .from('news')
      .upsert(payloadForDb, { onConflict: 'link' })

    if (upsertError) {
      // če greš na /api/news?forceFresh=1&debug=1, vrnemo konkretno napako
      if (debug) return res.status(500).json({ ok: false, upsertError })
      // drugače samo zapišemo v loge in nadaljujemo z odgovorom
      console.error('Supabase upsert error:', upsertError)
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')

    if (debug) {
      return res.status(200).json({
        ok: true,
        inserted: upsertData?.length ?? 0,
        sample: payloadForDb.slice(0, 2),
      })
    }

    // UI pričakuje NewsItem[] — fresh to že je
    return res.status(200).json(fresh)
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return res.status(500).json({ error: 'Failed to fetch news', details: String(error) })
  }
}
