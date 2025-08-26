import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'

type FetchOpts = { forceFresh?: boolean }

const parser: Parser = new Parser({
  customFields: { item: ['media:content', 'enclosure', 'isoDate'] },
})

// poskusi najti sliko v media:content, enclosure ali prvi <img>
function extractImage(item: any): string | null {
  if (typeof item['media:content'] === 'object') {
    if (item['media:content']?.url) return item['media:content'].url
    if (item['media:content']?.$?.url) return item['media:content'].$.url
  }
  if (item.enclosure?.url) return item.enclosure.url
  const match = (item.content || item['content:encoded'] || '').match(/<img[^>]+src="([^">]+)"/)
  return match?.[1] ?? null
}

export default async function fetchRSSFeeds(opts: FetchOpts = {}): Promise<NewsItem[]> {
  const { forceFresh = false } = opts
  const results = await Promise.all(
    Object.entries(feeds).map(async ([source, url]) => {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'KrizisceBot/1.0 (+https://krizisce.si)' },
          ...(forceFresh ? { cache: 'no-store', next: { revalidate: 0 as 0 } } : {}),
        } as any)
        const xml = await res.text()
        const feed = await parser.parseString(xml)
        if (!feed.items?.length) return []
        const items: NewsItem[] = feed.items.slice(0, 20).map((item) => {
          const isoDate = (item as any).isoDate ?? item.pubDate ?? new Date().toISOString()
          return {
            title: item.title ?? '',
            link: item.link ?? '',
            pubDate: item.pubDate ?? isoDate,
            isoDate,
            content: (item as any)['content:encoded'] ?? item.content ?? '',
            contentSnippet: item.contentSnippet ?? '',
            source,
            image: extractImage(item) ?? null,
          }
        })
        return items
      } catch {
        return []
      }
    }),
  )
  const flatResults = results.flat()
  flatResults.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime())
  return flatResults
}
