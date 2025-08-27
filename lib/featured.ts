// lib/featured.ts
import { feeds, headlineFeeds, SOURCES, SourceName } from './sources'
import type { NewsItem } from '@/types'

// Pomagalna funkcija – prebere RSS prek tvojega obstoječega API-ja /api/news,
// da ne uvajamo novih parserjev. Nato filtrira po viru in vzame 1. item.
async function getFromRssViaApi(source: Exclude<SourceName, 'Vse'>, feedUrl?: string): Promise<NewsItem | null> {
  try {
    // /api/news že vrača vse vire; filtriramo na clientu API-ja
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/news`, { cache: 'no-store' })
    if (!res.ok) throw new Error('API /api/news failed')
    const all: NewsItem[] = await res.json()

    const filtered = all.filter((n) => n.source === source)
    // že so sortirane po datumu v tvojem API-ju; če ne, sort še enkrat:
    filtered.sort((a, b) => {
      const da = new Date(a.isoDate ?? a.pubDate ?? 0).getTime()
      const db = new Date(b.isoDate ?? b.pubDate ?? 0).getTime()
      return db - da
    })

    return filtered[0] ?? null
  } catch (e) {
    console.error('getFromRssViaApi error', e)
    return null
  }
}

export async function getFeaturedOnePerSource(): Promise<NewsItem[]> {
  // Greva čez vse vire (brez 'Vse')
  const sources = SOURCES.filter((s): s is Exclude<SourceName, 'Vse'> => s !== 'Vse')

  const results: NewsItem[] = []
  for (const src of sources) {
    const headlineUrl = headlineFeeds[src]
    // 1) če imamo “headline” RSS: poskusi iz njega,
    // 2) sicer vzemi 1. iz navadnega RSS (prek /api/news)
    const picked = await getFromRssViaApi(src, headlineUrl ?? feeds[src])
    if (picked) results.push(picked)
  }

  return results
}
