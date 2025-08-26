// lib/fetchRSSFeeds.ts
import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'

type FetchOpts = { forceFresh?: boolean }

// rss-parser: izpostavimo še media:thumbnail, media:group, ohranimo array-je
const parser: Parser = new (Parser as any)({
  customFields: {
    item: [
      ['isoDate', 'content:encoded', 'media:content', 'media:thumbnail', 'media:group', 'enclosure'],
      { 'media:content': ['url', 'medium', 'width', 'height'], keepArray: true },
      { 'media:thumbnail': ['url', 'width', 'height'], keepArray: true },
      { 'media:group': ['media:content', 'media:thumbnail'], keepArray: true },
      { enclosure: ['url', 'type', 'length'] },
    ],
  },
})

// poskusi normalizirati protokol ( //img -> https://img )
function normalizeUrl(u?: string | null): string | null {
  if (!u || typeof u !== 'string') return null
  if (u.startsWith('//')) return 'https:' + u
  return u
}

// izberi najboljšo izmed več variant (po širini/višini, sicer prva)
function pickBest(arr: any[]): string | null {
  let best: { url: string; score: number } | null = null
  for (const it of arr) {
    const url = normalizeUrl(it?.url || it?.$?.url || it)
    if (!url) continue
    const w = Number(it?.width || it?.$?.width || 0)
    const h = Number(it?.height || it?.$?.height || 0)
    const score = (w || 0) * (h || 0) || Math.max(w, h) || 1
    if (!best || score > best.score) best = { url, score }
  }
  return best?.url ?? null
}

// poišči sliko v media:group, media:content, media:thumbnail, enclosure ali <img> v HTML
function extractImage(item: any): string | null {
  // 1) media:group
  const group = item['media:group']
  if (group) {
    const gContents = Array.isArray(group?.['media:content'])
      ? group['media:content']
      : (group?.['media:content'] ? [group['media:content']] : [])
    const gThumbs = Array.isArray(group?.['media:thumbnail'])
      ? group['media:thumbnail']
      : (group?.['media:thumbnail'] ? [group['media:thumbnail']] : [])
    const fromGroup = pickBest([...(gContents || []), ...(gThumbs || [])])
    if (fromGroup) return fromGroup
  }

  // 2) media:content (lahko array ali objekt)
  const mc = item['media:content']
  if (Array.isArray(mc)) {
    const best = pickBest(mc)
    if (best) return best
  } else if (typeof mc === 'object' && mc) {
    const one = normalizeUrl(mc?.url || mc?.$?.url)
    if (one) return one
  }

  // 3) media:thumbnail
  const mt = item['media:thumbnail']
  if (Array.isArray(mt)) {
    const best = pickBest(mt)
    if (best) return best
  } else if (typeof mt === 'object' && mt) {
    const one = normalizeUrl(mt?.url || mt?.$?.url)
    if (one) return one
  }

  // 4) enclosure (image/*)
  if (item.enclosure?.url) {
    const t = (item.enclosure.type || '').toLowerCase()
    if (!t || t.startsWith('image/')) {
      const u = normalizeUrl(item.enclosure.url)
      if (u) return u
    }
  }

  // 5) prvi <img src="..."> v content/encoded
  const html = (item['content:encoded'] || item.content || '') as string
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (m?.[1]) return normalizeUrl(m[1])

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
        const feed = await (parser as any).parseString(xml)
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
