// lib/fetchRSSFeeds.ts
import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'

type FetchOpts = { forceFresh?: boolean }

// RSS parserju eksplicitno izpostavimo še thumbnail-e in media:group
const parser: Parser = new Parser({
  customFields: {
    item: [
      'media:content',
      'media:thumbnail',
      'media:group',
      'enclosure',
      'isoDate',
      'content:encoded',
    ],
  },
})

// robustno izlušči URL slike iz različnih struktur (object/array)
function pickUrl(v: any): string | null {
  if (!v) return null
  if (typeof v === 'string') return v || null
  if (Array.isArray(v)) {
    for (const it of v) {
      const u = pickUrl(it)
      if (u) return u
    }
    return null
  }
  // rss-parser pogosto da podatke kot { url } ali { $: { url } } ali { '@_url': ... }
  return v.url || v.href || v.src || v['@_url'] || v?.$?.url || null
}

// poskusi najti sliko v media:content, media:group, media:thumbnail, enclosure ali <img ...>
function extractImage(item: any): string | null {
  // 1) media:group > media:content/thumbnail
  const g = item['media:group']
  const gUrl =
    pickUrl(g?.['media:content']) ||
    pickUrl(g?.['media:thumbnail']) ||
    pickUrl(g)
  if (gUrl) return gUrl

  // 2) media:content (tudi array)
  const mc = pickUrl(item['media:content'])
  if (mc) return mc

  // 3) media:thumbnail
  const mt = pickUrl(item['media:thumbnail'])
  if (mt) return mt

  // 4) enclosure (image/*)
  if (item.enclosure?.type?.startsWith?.('image/') && item.enclosure?.url) {
    return item.enclosure.url
  }
  const enc = pickUrl(item.enclosure)
  if (enc) return enc

  // 5) prvi <img> v content/content:encoded
  const html = (item['content:encoded'] ?? item.content ?? '') as string
  const m = html.match(/<img[^>]+src=["']([^"'>]+)["']/i)
  if (m?.[1]) return m[1]

  return null
}

// robustno v Unix ms
function toUnixMs(d?: string | null) {
  if (!d) return 0
  const ms = Date.parse(d)
  if (!Number.isNaN(ms)) return ms
  try {
    const cleaned = d.replace(/,\s*/, ', ').replace(/\s+GMT[+-]\d{4}/i, '')
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
            image: extractImage(item),
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
