// pages/api/headlines.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import type { NewsItem } from '@/types'
import { SOURCES } from '@/lib/sources'
import { scrapeFeatured } from '@/lib/scrapeFeatured'

// Absoluten URL do lastnega deploymenta (za fallback fetch na /api/news)
function absoluteUrl(req: NextApiRequest, path = '') {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || ''
  return `${proto}://${host}${path}`
}

async function fallbackLatestOne(req: NextApiRequest, source: string): Promise<NewsItem | null> {
  try {
    const base = absoluteUrl(req)
    const res = await fetch(`${base}/api/news`, { cache: 'no-store' })
    if (!res.ok) throw new Error('fallback /api/news failed')
    const all: NewsItem[] = await res.json()
    const filtered = all.filter((n) => n.source === source)
    filtered.sort((a, b) => {
      const da = new Date(a.isoDate ?? (a as any).pubDate ?? 0).getTime()
      const db = new Date(b.isoDate ?? (b as any).pubDate ?? 0).getTime()
      return db - da
    })
    return filtered[0] ?? null
  } catch (e) {
    console.error('fallbackLatestOne error', source, e)
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const sources = SOURCES.filter((s) => s !== 'Vse')
    const out: NewsItem[] = []

    for (let i = 0; i < sources.length; i++) {
      const src = sources[i]

      // 1) poskusi “featured” s homepag-a preko JSON-LD
      let item = await scrapeFeatured(src)

      // 2) če ne uspe, vzemi najnovejšo iz obstoječega RSS API-ja
      if (!item) item = await fallbackLatestOne(req, src)

      if (item) out.push(item)
    }

    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=900')
    return res.status(200).json(out)
  } catch (e) {
    console.error('headlines_failed', e)
    return res.status(500).json({ error: 'headlines_failed' })
  }
}
