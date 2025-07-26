// lib/fetchRSSFeeds.ts
import Parser from 'rss-parser'
import { NewsItem } from '../types'
import { feeds } from './sources' // ⬅️ nova uvožena konfiguracija

const parser: Parser = new Parser({
  customFields: {
    item: ['media:content', 'enclosure'],
  },
})

function extractImage(item: any): string | null {
  if (item['media:content']?.$?.url) return item['media:content'].$.url
  if (item.enclosure?.url) return item.enclosure.url

  const match = item.content?.match(/<img[^>]+src="([^">]+)"/)
  return match?.[1] || null
}

export default async function fetchRSSFeeds(): Promise<NewsItem[]> {
  const results: NewsItem[] = []

  for (const [source, url] of Object.entries(feeds)) {
    try {
      const feed = await parser.parseURL(url)

      if (!feed.items || feed.items.length === 0) {
        console.warn(`⚠️ Vir "${source}" ni vrnil nobenih člankov.`)
        continue
      }

      const items: NewsItem[] = feed.items.slice(0, 15).map((item) => ({
        title: item.title ?? '',
        link: item.link ?? '',
        pubDate: item.pubDate ?? '',
        content: item.content ?? '',
        contentSnippet: item.contentSnippet ?? '',
        source,
        image: extractImage(item) ?? '',
      }))

      results.push(...items)
      console.log(`✅ ${source}: ${items.length} člankov.`)
    } catch (error) {
      console.error(`❌ Napaka pri viru "${source}":`, error)
    }
  }

  return results
}
