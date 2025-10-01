// lib/fetchRSSFeeds.ts
import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'

type FetchOpts = { forceFresh?: boolean }

/** ====== ENOSTAVEN BLOK-SEZNAM ======
 * Če hočeš kaj dodati/odstraniti, urejaj spodnja dva seznama.
 * - BLOCK_URLS: Regex-i, ki blokirajo glede na URL poti
 * - BLOCK_TITLES: niz, ki mora biti v naslovu (case-insensitive)
 */
const BLOCK_URLS: RegExp[] = [
  /siol\.net\/novice\/posel-danes\//i, // Siol "posel-danes" rubrika (pogosto PR/oglasno)
]

const BLOCK_TITLES: string[] = [
  'oglasno sporočilo',
  'promocijsko sporočilo',
  'oglasni prispevek',
  'sponzorirano',
  'pr članek',
  'vam svetuje',
  'priporoča',
  // znamke/teme, ki jih želiš skriti:
  'viberate',
  // po potrebi lahko dodaš:
  // 'glasbena analitika', 'za profesionalce', ...
]

// ====== Pomožne ======
function absolutize(src: string | undefined | null, baseHref: string): string | null {
  if (!src) return null
  try {
    if (src.startsWith('//')) return new URL(`https:${src}`).toString()
    const url = new URL(src, baseHref)
    return url.toString()
  } catch {
    return null
  }
}

const parser: Parser = new Parser({
  customFields: {
    item: [
      'isoDate',
      'content:encoded',
      'media:content',
      'media:thumbnail',
      ['media:group', 'mediaGroup'],
      'enclosure',
      'image',
    ],
  },
})

function extractImage(item: any, baseHref: string): string | null {
  const mg = item.mediaGroup
  if (mg) {
    const arr = Array.isArray(mg['media:content']) ? mg['media:content'] : [mg['media:content']]
    for (const c of arr.filter(Boolean)) {
      const cand = c?.url ?? c?.$?.url
      const abs = absolutize(cand, baseHref)
      if (abs) return abs
    }
  }
  if (item['media:content']) {
    const mc = item['media:content']
    const cand = mc?.url ?? mc?.$?.url
    const abs = absolutize(cand, baseHref)
    if (abs) return abs
  }
  if (item['media:thumbnail']) {
    const mt = item['media:thumbnail']
    const cand = mt?.url ?? mt?.$?.url
    const abs = absolutize(cand, baseHref)
    if (abs) return abs
  }
  if (item.enclosure?.url) {
    const abs = absolutize(item.enclosure.url, baseHref)
    if (abs) return abs
  }
  const html = (item['content:encoded'] ?? item.content ?? '') as string
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (m?.[1]) {
    const abs = absolutize(m[1], baseHref)
    if (abs) return abs
  }
  if (item.image?.url) {
    const abs = absolutize(item.image.url, baseHref)
    if (abs) return abs
  }
  return null
}

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

/** Enostaven filter: blokiraj po URL-ju ali po naslovu */
function isBlocked(i: { link?: string; title?: string }) {
  const url = i.link || ''
  const t = (i.title || '').toLowerCase()
  if (BLOCK_URLS.some(rx => rx.test(url))) return true
  if (BLOCK_TITLES.some(k => t.includes(k.toLowerCase()))) return true
  return false
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
          const rawImage = extractImage(item, link)
          const finalImage = rawImage ?? null

          return {
            title: item.title ?? '',
            link,
            pubDate: item.pubDate ?? iso,
            isoDate: iso,
            content: item['content:encoded'] ?? item.content ?? '',
            contentSnippet: item.contentSnippet ?? '',
            source,
            image: finalImage,
            publishedAt,
          }
        })

        return items
      } catch {
        return []
      }
    }),
  )

  // ➜ ENOSTAVNO: odreži oglase/PR po URL + naslovu
  const flat = results.flat().filter(i => !isBlocked(i))

  flat.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
  return flat
}
