// lib/fetchRSSFeeds.ts
import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'

type FetchOpts = { forceFresh?: boolean }

const parser: Parser = new Parser({
  customFields: { item: ['media:content', 'enclosure', 'isoDate', 'content:encoded'] },
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

// robustno v Unix ms
function toUnixMs(d?: string | null) {
  if (!d) return 0
  const ms = Date.parse(d)
  if (!Number.isNaN(ms)) return ms
  try {
    const cleaned = d
      .replace(/,\s*/, ', ')
      .replace(/\s+GMT[+-]\d{4}/i, '')
    const ms2 = Date.parse(cleaned)
    return Number.isNaN(ms2) ? 0 : ms2
  } catch {
    return 0
  }
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

        const items: NewsItem[] = feed.items.slice(0, 20).map((item: any) => {
          const iso = item.isoDate ?? item.pubDate ?? new Date().toISOString()
          const publishedAt = toUnixMs(iso)
          return {
            title: item.title ?? '',
            link: item.link ?? '',
            pubDate: item.pubDate ?? iso,
            isoDate: iso,
            content: item['content:encoded'] ?? item.content ?? '',
            contentSnippet: item.contentSnippet ?? '',
            source,
            image: extractImage(item) ?? null,
            publishedAt,
          }
        })

        return items
      } catch {
        return []
      }
    }),
  )

  const flat = results.flat()
  flat.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
  return flat
}
