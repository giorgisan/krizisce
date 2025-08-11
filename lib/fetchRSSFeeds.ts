// lib/fetchRSSFeeds.ts
import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'

type FetchOpts = { forceFresh?: boolean }

const parser: Parser = new Parser({
  customFields: { item: ['media:content', 'enclosure'] },
})

function extractImage(item: any): string | null {
  if (item?.['media:content']?.$?.url) return item['media:content'].$.url
  if (item?.enclosure?.url) return item.enclosure.url
  const match = (item?.content as string | undefined)?.match(/<img[^>]+src="([^">]+)"/)
  return match?.[1] ?? null
}

export default async function fetchRSSFeeds(opts: FetchOpts = {}): Promise<NewsItem[]> {
  const { forceFresh = false } = opts
  const results: NewsItem[] = []

  for (const [source, url] of Object.entries(feeds)) {
    try {
      // Obvoz cache-a, ko želimo "čisto sveže"
      const res = await fetch(url, {
        headers: { 'User-Agent': 'KrizisceBot/1.0 (+https://krizisce.si)' },
        ...(forceFresh ? { cache: 'no-store', next: { revalidate: 0 as 0 } } : {}),
      } as any)
      const xml = await res.text()
      const feed = await parser.parseString(xml)

      if (!feed.items?.length) {
        console.warn(`⚠️ Vir "${source}" ni vrnil nobenih člankov.`)
        continue
      }

      const items: NewsItem[] = feed.items.slice(0, 20).map((item) => ({
        title: item.title ?? '',
        link: item.link ?? '',
        pubDate: (item as any).isoDate ?? item.pubDate ?? new Date().toISOString(),
        content: (item as any)['content:encoded'] ?? (item.content as any) ?? '',
        contentSnippet: item.contentSnippet ?? '',
        source,
        image: extractImage(item) ?? '',
      }))

      results.push(...items)
    } catch (error) {
      console.error(`❌ Napaka pri viru "${source}":`, error)
    }
  }

  // Najnovejše najprej
  results.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
  return results
}
