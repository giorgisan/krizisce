// lib/fetchRSSFeeds.ts
import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'
import { proxiedImage } from './img'  // <– dodali uvoz

type FetchOpts = { forceFresh?: boolean }

// Pomaga absolutizirati URL-je (//, /pot …) glede na link članka
function absolutize(src: string | undefined | null, baseHref: string): string | null {
  if (!src) return null
  try {
    // //example.com/a.jpg → https:
    if (src.startsWith('//')) return new URL(`https:${src}`).toString()
    // /img/a.jpg → https://host/img/a.jpg
    const url = new URL(src, baseHref)
    return url.toString()
  } catch {
    return null
  }
}

const parser: Parser = new Parser({
  // Razširimo polja, ki jih rss-parser sploh prenese v item
  customFields: {
    item: [
      'isoDate',
      'content:encoded',
      'media:content',
      'media:thumbnail',
      ['media:group', 'mediaGroup'], // nekateri dajo group znotraj arraya
      'enclosure',
      'image',
    ],
  },
})

// Poskusi pobrati sliko iz čim več tipičnih mest
function extractImage(item: any, baseHref: string): string | null {
  // 1) <media:group><media:content .../></media:group>
  const mg = item.mediaGroup
  if (mg) {
    const arr = Array.isArray(mg['media:content']) ? mg['media:content'] : [mg['media:content']]
    for (const c of arr.filter(Boolean)) {
      const cand = c?.url ?? c?.$?.url
      const abs = absolutize(cand, baseHref)
      if (abs) return abs
    }
  }

  // 2) <media:content url="...">
  if (item['media:content']) {
    const mc = item['media:content']
    const cand = mc?.url ?? mc?.$?.url
    const abs = absolutize(cand, baseHref)
    if (abs) return abs
  }

  // 3) <media:thumbnail url="...">
  if (item['media:thumbnail']) {
    const mt = item['media:thumbnail']
    const cand = mt?.url ?? mt?.$?.url
    const abs = absolutize(cand, baseHref)
    if (abs) return abs
  }

  // 4) <enclosure url="...">
  if (item.enclosure?.url) {
    const abs = absolutize(item.enclosure.url, baseHref)
    if (abs) return abs
  }

  // 5) content / content:encoded – prvi <img src="...">
  const html = (item['content:encoded'] ?? item.content ?? '') as string
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (m?.[1]) {
    const abs = absolutize(m[1], baseHref)
    if (abs) return abs
  }

  // 6) nekatere feed knjižnice dodajo .image
  if (item.image?.url) {
    const abs = absolutize(item.image.url, baseHref)
    if (abs) return abs
  }

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

        const items: NewsItem[] = feed.items.slice(0, 25).map((item: any) => {
          const iso = (item.isoDate ?? item.pubDate ?? new Date().toISOString()) as string
          const publishedAt = toUnixMs(iso)
          const link = item.link ?? ''

          // pobrano sliko zmanjšamo preko proxiedImage (WebP, q=65, progressive),
          // da v bazi shranimo že “lahko” različico
          const rawImage = extractImage(item, link)
          const optimizedImage = rawImage
            ? proxiedImage(rawImage, 640, 360, 1)
            : null

          return {
            title: item.title ?? '',
            link,
            pubDate: item.pubDate ?? iso,
            isoDate: iso,
            content: item['content:encoded'] ?? item.content ?? '',
            contentSnippet: item.contentSnippet ?? '',
            source,
            image: optimizedImage, // <– zdaj je shranjen optimiziran URL
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
