// lib/featured.ts
import { SOURCES } from './sources'
import type { NewsItem } from '@/types'

/**
 * Stabilen fallback:
 * - za vsak vir (brez "Vse") vzamemo 1 najnovejšo novico prek /api/news
 * - API /api/headlines kliče to funkcijo in vrača po 1 na vir
 * - ko (če) dodamo “headline” RSS ali scraping, bomo nadgradili tukaj
 */

// Preberi vse novice prek API-ja in vrni 1 najnovejšo za izbrani vir
async function getFromRssViaApi(source: string): Promise<NewsItem | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
    const url = base ? `${base}/api/news` : '/api/news'

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error('API /api/news failed')
    const all: NewsItem[] = await res.json()

    const filtered = all.filter((n) => n.source === source)
    filtered.sort((a, b) => {
      const da = new Date(a.isoDate ?? (a as any).pubDate ?? 0).getTime()
      const db = new Date(b.isoDate ?? (b as any).pubDate ?? 0).getTime()
      return db - da
    })

    return filtered[0] ?? null
  } catch (e) {
    console.error('getFromRssViaApi error', e)
    return null
  }
}

// Vrni po 1 novico na vir (brez "Vse")
export async function getFeaturedOnePerSource(): Promise<NewsItem[]> {
  const sources = SOURCES.filter((s) => s !== 'Vse')

  const results: NewsItem[] = []
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i]
    const picked = await getFromRssViaApi(src)
    if (picked) results.push(picked)
  }

  return results
}
