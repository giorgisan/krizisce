import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'

type FetchOpts = { forceFresh?: boolean }

const parser: Parser = new Parser({
  customFields: { item: ['media:content', 'enclosure', 'isoDate'] },
})

// Popravljena funkcija za robustno zajemanje slike
function extractImage(item: any): string | null {
  // Preveri media:content -> lahko ima url ali $: { url }
  if (typeof item['media:content'] === 'object') {
    if (item['media:content']?.url) return item['media:content'].url
    if (item['media:content']?.$?.url) return item['media:content'].$.url
  }

  // Preveri enclosure
  if (item.enclosure?.url) return item.enclosure.url

  // Poizkusi ujeti prvo <img> iz HTML vsebine
  const match = (item.content || item['content:encoded'] || '').match(/<img[^>]+src="([^">]+)"/)
  if (match?.[1]) return match[1]

  return null
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

        if (!feed.items?.length) {
          console.warn(`⚠️ Vir "${source}" ni vrnil nobenih člankov.`)
          return []
        }

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
            image: extractImage(item) ?? '/default-news.jpg',
          }
        })

        return items
      } catch (error) {
        console.error(`❌ Napaka pri viru "${source}":`, error)
        return []
      }
    })
  )

  const flatResults = results.flat()
  flatResults.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime())
  return flatResults
}
