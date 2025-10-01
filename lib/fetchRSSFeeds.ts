// lib/fetchRSSFeeds.ts
import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'

type FetchOpts = { forceFresh?: boolean }

/** ====== BLANKET PRAVILA ====== */
const BLOCK_URLS: RegExp[] = [
  /siol\.net\/novice\/posel-danes\//i, // odstrani, če je preostro
]

const BLOCK_PATTERNS: string[] = [
  'oglasno sporočilo',
  'promocijsko sporočilo',
  'oglasni prispevek',
  'komercialno sporočilo',
  'sponzorirano',
  'pr članek',
  'partner vsebina',
  'branded content',
  'vsebino omogoča',
  'vsebino omogoca',
  'vam svetuje',
  'priporoča',
  'priporoca',
]

const BLOCK_BRANDS: string[] = [
  'daikin',
  'viberate',
  'inoquant',
  'bks naložbe',
  'bks nalozbe',
]

/** ====== HTML CHECK za siol.net (lovi tvoj primer) ======
 * Če ne želiš dodatnih fetch-ov, daj na false.
 */
const ENABLE_SIOL_HTML_CHECK = true
const HTML_MARKERS = [
  'vsebino omogoča',    // s šumniki
  'vsebino omogoca',    // brez šumnikov
  'oglasno sporočilo',
  'oglasno sporocilo',
  'article__pr_box',    // razred iz tvojega HTML izreza
  'advertorial',
  'sponsored content',
]

/* ====== Pomožne ====== */
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

/** Hiter filter: URL + naslov + snippet + content */
function isBlockedBasic(i: { link?: string; title?: string; content?: string | null; contentSnippet?: string | null }) {
  const url = i.link || ''
  const hay = `${i.title || ''}\n${i.contentSnippet || ''}\n${i.content || ''}`.toLowerCase()
  if (BLOCK_URLS.some(rx => rx.test(url))) return true
  if (BLOCK_PATTERNS.some(k => hay.includes(k.toLowerCase()))) return true
  if (BLOCK_BRANDS.some(k => hay.includes(k.toLowerCase()))) return true
  return false
}

/** Dodatni HTML check za siol.net – poišče markerje v dejanski strani */
async function hasSiolSponsorMarker(url: string): Promise<boolean> {
  if (!ENABLE_SIOL_HTML_CHECK) return false
  try {
    const u = new URL(url)
    if (!/siol\.net$/i.test(u.hostname)) return false
  } catch {
    return false
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KrizisceBot/1.0 (+https://krizisce.si)' },
      cache: 'no-store',
    } as any)
    const html = (await res.text()).toLowerCase()
    return HTML_MARKERS.some(m => html.includes(m))
  } catch {
    return false
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

  // 1) osnovni rez
  let flat: NewsItem[] = results.flat().filter(i => !isBlockedBasic(i))

  // 2) ciljano: pri siol.net še HTML-check (ujame "Vsebino omogoča …" / article__pr_box)
  const checked = await Promise.all(
    flat.map(async (it) => {
      if (await hasSiolSponsorMarker(it.link)) return null
      return it
    })
  )
  flat = checked.filter(Boolean) as NewsItem[]

  flat.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
  return flat
}
