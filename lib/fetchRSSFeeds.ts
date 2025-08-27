import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'

type FetchOpts = { forceFresh?: boolean }

// Sanitize + absolutizacija na osnovi linka članka
function absolutize(src: string | undefined | null, baseHref: string): string | null {
  if (!src) return null
  if (/^(data:|javascript:)/i.test(src)) return null
  try {
    if (src.startsWith('//')) return new URL(`https:${src}`).toString()
    if (/^https?:\/\//i.test(src)) return src
    return new URL(src, baseHref).toString()
  } catch { return null }
}

const parser: Parser = new Parser({
  customFields: {
    item: [
      'isoDate',
      'content:encoded',
      'media:content',
      'media:thumbnail',
      'media:group',
      'enclosure',
      'enclosures',
      'image',
    ],
  },
})

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

// Poskusi pobrati sliko iz čim več tipičnih mest
function extractImage(item: any, baseHref: string): string | null {
  const candidates: Array<string | null | undefined> = []

  // media:group lahko pride kot objekt ali array
  const groups = Array.isArray(item['media:group'])
    ? item['media:group']
    : item['media:group'] ? [item['media:group']] : []

  for (const g of groups) {
    candidates.push(firstUrl(g?.['media:content']))
    candidates.push(firstUrl(g?.['media:thumbnail']))
  }

  // media:content / media:thumbnail lahko sta array/objekt
  candidates.push(firstUrl(item['media:content']))
  candidates.push(firstUrl(item['media:thumbnail']))

  // enclosure/enclosures
  candidates.push(firstUrl(item.enclosures || item.enclosure))

  // content / content:encoded – podpri data-src, src in srcset
  const html = (item['content:encoded'] ?? item.content ?? '') as string
  let m = html.match(/<img[^>]+(?:data-src|src)=(?:"|')([^"']+)(?:"|')/i)
  if (m?.[1]) candidates.push(m[1])
  const srcset = html.match(/<img[^>]+srcset=(?:"|')([^"']+)(?:"|')/i)?.[1]
  if (srcset) candidates.push(srcset.split(',')[0]?.trim().split(/\s+/)[0])

  // nekateri dodajo .image.url
  if (item.image?.url) candidates.push(item.image.url)

  for (const c of candidates) {
    const abs = absolutize(c || undefined, baseHref)
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
          return {
            title: item.title ?? '',
            link,
            pubDate: item.pubDate ?? iso,
            isoDate: iso,
            content: item['content:encoded'] ?? item.content ?? '',
            contentSnippet: item.contentSnippet ?? '',
            source,
            image: extractImage(item, link),
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
