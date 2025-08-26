// lib/fetchRSSFeeds.ts
import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'

type FetchOpts = { forceFresh?: boolean }

// Dodamo še media:thumbnail, media:group, content:encoded
const parser: Parser = new Parser({
  customFields: {
    item: [
      'media:content',
      'media:thumbnail',
      'media:group',
      'enclosure',
      'content:encoded',
      'isoDate',
    ],
  },
})

// Helperji za varno branje URL-ja iz object/array struktur
function pickUrl(v: any): string | null {
  if (!v) return null
  if (typeof v === 'string') return v
  if (typeof v?.url === 'string') return v.url
  if (typeof v?.$?.url === 'string') return v.$.url
  return null
}
function firstUrl(v: any): string | null {
  if (!v) return null
  if (Array.isArray(v)) {
    for (const it of v) {
      const u = pickUrl(it)
      if (u) return u
    }
    return null
  }
  return pickUrl(v)
}

// Poskusi po vrstnem redu: media:group > media:content/thumbnail, media:content, media:thumbnail, enclosure, prvi <img>
function extractImage(item: any): string | null {
  const g = item['media:group']
  if (g) {
    const fromGroupContent = firstUrl((g as any)['media:content'])
    if (fromGroupContent) return fromGroupContent
    const fromGroupThumb = firstUrl((g as any)['media:thumbnail'])
    if (fromGroupThumb) return fromGroupThumb
  }

  const mContent = firstUrl(item['media:content'])
  if (mContent) return mContent

  const mThumb = firstUrl(item['media:thumbnail'])
  if (mThumb) return mThumb

  const enc = pickUrl(item.enclosure)
  if (enc) return enc

  const html = item['content:encoded'] || item.content || ''
  const match = String(html).match(/<img[^>]+src=(?:"|')([^"']+)(?:"|')/i)
  return match?.[1] ?? null
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
