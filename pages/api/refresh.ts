import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '@/lib/supabase'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds' // tvoj obstoječi agregator RSS
import type { NewsItem } from '@/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isCron = req.headers['x-vercel-cron'] === '1'
  const okBySecret =
    typeof req.query.secret === 'string' && req.query.secret === process.env.CRON_SECRET

  if (!isCron && !okBySecret) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    // 1) zberi sveže novice iz RSS (obstoječi fetchRSSFeeds)
    const items = (await fetchRSSFeeds(/* forceFresh? */)) as NewsItem[]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(200).json({ ok: true, items: 0, cached: 0 })
    }

    // 2) (opcijsko) upsert v "news" za arhiv
    const rows = items.map((it) => ({
      url: (it as any).link,
      title: it.title ?? null,
      site: (it as any).site ?? (it as any).source ?? null,
      image: (it as any).image ?? null,
      summary: (it as any).summary ?? (it as any).description ?? null,
      published_at: (it as any).publishedAt
        ? new Date((it as any).publishedAt).toISOString()
        : (it as any).iso
        ? new Date((it as any).iso).toISOString()
        : null,
      created_at: new Date().toISOString(),
    }))

    // če tabela 'news' ne obstaja, bo vrnilo napako – cache se bo vseeno posodobil
    const upsertNews = await supabase.from('news').upsert(rows, { onConflict: 'url' })
    if (upsertNews.error) {
      console.error('news upsert error:', upsertNews.error.message)
    }

    // 3) posodobi cache (shranimo npr. top 200)
    const top = items.slice(0, 200)

    const upsertCache = await supabase
      .from('news_cache')
      .upsert({ key: 'latest', payload: top, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select('updated_at')
      .single()

    if (upsertCache.error) {
      return res.status(500).json({ error: upsertCache.error.message })
    }

    return res.status(200).json({
      ok: true,
      items: items.length,
      cached: top.length,
      updated_at: upsertCache.data?.updated_at,
    })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'unknown error' })
  }
}
