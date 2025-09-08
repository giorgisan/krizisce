import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '@/lib/supabase'
import type { NewsItem } from '@/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error } = await supabase
      .from('news_cache')
      .select('payload, updated_at')
      .eq('key', 'latest')
      .single()

    if (error) return res.status(500).json({ error: error.message })

    let items: NewsItem[] = (data?.payload ?? []) as any[]

    // poljubni filtri (neobvezno)
    const { source, q, limit } = req.query
    if (source && typeof source === 'string') {
      items = items.filter(n => (n as any).site === source || (n as any).source === source)
    }
    if (q && typeof q === 'string') {
      const s = q.toLowerCase()
      items = items.filter(n =>
        (n.title ?? '').toLowerCase().includes(s) ||
        ((n as any).summary ?? (n as any).description ?? '').toLowerCase().includes(s)
      )
    }
    const lim = Number(limit)
    if (!Number.isNaN(lim) && lim > 0) items = items.slice(0, lim)

    // naj se lepo kešira na edge
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res.status(200).json(items)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'unknown error' })
  }
}
