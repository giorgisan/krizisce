// lib/featured.ts
import { feeds, SOURCES, SourceName } from './sources'
import type { NewsItem } from '@/types'

/**
 * Vmesna (stabilna) rešitev:
 * - ne uporablja headlineFeeds (da ne kockamo z buildom),
 * - za vsak vir vzame 1. (najbolj svežo) novico, prebrano prek /api/news,
 * - ko boš želel “prave naslovnice”, lahko dodava headlineFeeds ali scraping
 *   brez sprememb front-enda (ostane /api/headlines).
 */

// Preberi vse novice prek API-ja in vrni 1 najnovejšo za izbrani vir
async function getFromRssViaApi(
  source: Exclude<SourceName, 'Vse'>,
): Promise<NewsItem | null> {
  try {
    // /api/headlines handler bo nastavil NEXT_PUBLIC_BASE_URL na absoluten host
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
    const url = base ? `${base}/api/news` : '/api/news'

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error('API /api/news failed')
    const all: NewsItem[] = await res.json()

    const filtered = all.filter((n) => n.source === source)
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

// Vrni po 1 novico na vir (fallback: najnovejša iz navadnega RSS prek API-ja)
export async function getFeaturedOnePerSource(): Promise<NewsItem[]> {
  const sources = SOURCES.filter((s): s is Exclude<SourceName, 'Vse'> => s !== 'Vse')

  const results: NewsItem[] = []
  for (const src of sources) {
    // trenutno ignoriramo headlineFeeds (da build uspe)
    // če želiš, jih dodava kasneje – API ostane enak
    const picked = await getFromRssViaApi(src)
    if (picked) results.push(picked)
  }

  return results
}
