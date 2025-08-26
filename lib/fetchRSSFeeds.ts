// lib/fetchRSSFeeds.ts
import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'

type FetchOpts = { forceFresh?: boolean }

const parser: Parser = new Parser({
  customFields: { item: ['media:content', 'enclosure', 'isoDate', 'content:encoded'] },
})

/** Absolutizira URL glede na base (ponavadi item.link). Če je že absoluten, vrne nespremenjeno. */
function toAbsolute(u: string | undefined | null, base?: string): string | null {
  if (!u) return null
  try {
    // če je relativna pot, new URL(u, base) naredi absolutni URL
    return new URL(u, base).toString()
  } catch {
    return null
  }
}

/** Poskusi najti sliko v media:content, enclosure ali prvem <img>, ter jo absolutiziraj. */
function extractImage(item: any, baseLink?: string): string | null {
  // media:content
  const mc = item['media:content']
  if (typeof mc === 'object') {
    const u = mc?.url ?? mc?.$?.url
    const abs = toAbsolute(u, baseLink)
    if (abs) return abs
  }

  // enclosure
  const enc = item.enclosure?.url
  {
    const abs = toAbsolute(enc, baseLink)
    if (abs) return abs
  }

  // prvi <img src="..."> v content:encoded ali content
  const html = (item['content:encoded'] as string) || (item.content as string) || ''
  const m = html.match(/<img[^>]+src=["']([^"'>]+)["']/i)
  if (m?.[1]) {
    const abs = toAbsolute(m[1], baseLink)
    if (abs) return abs
  }

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
        if (!feed.items?.length) return []

        const items: NewsItem[] = feed.items.slice(0, 20).map((item) => {
          const iso = (item as any).isoDate ?? item.pubDate ?? new Date().toISOString()
          const publishedAt = Date.parse(iso) || Date.now()
          const link = item.link ?? ''

          return {
            title: item.title ?? '',
            link,
            pubDate: item.pubDate ?? iso,
            isoDate: iso,
            content: (item as any)['content:encoded'] ?? item.content ?? '',
            contentSnippet: item.contentSnippet ?? '',
            source,
            image: extractImage(item, link), // <-- absolutizirano
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
  flat.sort((a, b) => b.publishedAt - a.publishedAt)
  return flat
}
