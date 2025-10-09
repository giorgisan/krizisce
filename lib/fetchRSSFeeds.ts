// lib/fetchRSSFeeds.ts
import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'
import { excludeAds } from './adFilter'

type FetchOpts = { forceFresh?: boolean }

/** ====== BLANKET PRAVILA (urejaj po želji) ====== */
const BLOCK_URLS: RegExp[] = [
  /siol\.net\/novice\/posel-danes\//i,
]

const BLOCK_PATTERNS: string[] = [
  'oglasno sporočilo','oglasno sporocilo',
  'promocijsko sporočilo','promocijsko sporocilo',
  'oglasni prispevek','komercialno sporočilo','komercialno sporocilo',
  'sponzorirano','partner vsebina','branded content',
  'vsebino omogoča','vsebino omogoca',
  'pr članek','pr clanek',
  'vam svetuje','priporoča','priporoca',
]

const BLOCK_BRANDS: string[] = [
  'daikin','viberate','inoquant','bks naložbe','bks nalozbe'
]

/** ====== GENERIČNI HTML CHECK ====== */
const ENABLE_HTML_CHECK = true
const MAX_HTML_CHECKS = 8
const HTML_CHECK_HOSTS = [
  'rtvslo.si','siol.net','delo.si','slovenskenovice.si','delo.si','24ur.com','zurnal24.si', 'n1info.si','dnevnik.si'
]
const HTML_MARKERS = [
  'oglasno sporočilo','oglasno sporocilo',
  'promocijsko sporočilo','promocijsko sporocilo',
  'plačana objava','placana objava',
  'sponzorirano','vsebino omogoča','vsebino omogoca',
  'partner vsebina','advertorial','sponsored content',
  'article__pr_box','sponsored-content','partner-content','promo-box'
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

/** Enostaven filter: URL + naslov + snippet + content */
function isBlockedBasic(i: { link?: string; title?: string; content?: string | null; contentSnippet?: string | null }) {
  const url = i.link || ''
  const hay = `${i.title || ''}\n${i.contentSnippet || ''}\n${i.content || ''}`.toLowerCase()
  if (BLOCK_URLS.some(rx => rx.test(url))) return true
  if (BLOCK_PATTERNS.some(k => hay.includes(k.toLowerCase()))) return true
  if (BLOCK_BRANDS.some(k => hay.includes(k.toLowerCase()))) return true
  return false
}

/* ---- HTML fetch s timeoutom ---- */
let htmlChecks = 0
async function hasSponsorMarker(url: string): Promise<boolean> {
  if (!ENABLE_HTML_CHECK) return false
  if (htmlChecks >= MAX_HTML_CHECKS) return false
  let host = ''
  try {
    const u = new URL(url)
    host = u.hostname.toLowerCase()
    if (!HTML_CHECK_HOSTS.some(h => host === h || host.endsWith(`.${h}`))) return false
  } catch { return false }

  htmlChecks++

  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 2500) // 2.5 s timeout
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KrizisceBot/1.0 (+https://krizisce.si)' },
      cache: 'no-store',
      signal: ctrl.signal,
    } as any)
    const html = (await res.text()).toLowerCase()
    return HTML_MARKERS.some(m => html.includes(m))
  } catch {
    return false
  } finally {
    clearTimeout(to)
  }
}

/** ====== GLAVNA FUNKCIJA ====== */
export default async function fetchRSSFeeds(opts: FetchOpts = {}): Promise<NewsItem[]> {
  const { forceFresh = false } = opts

  // resetiraj budget HTML-checkov za vsak klic
  htmlChecks = 0

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

  // 1.5) dodatni RSS ad-filter (brez mreže)
  flat = excludeAds(flat, 3, true)

  // 1.6) sortiraj, da HTML-check pregleda najnovejše
  flat.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))

  // 2) HTML-check deterministično, max N in samo na izbranih hostih
  const kept: NewsItem[] = []
  let used = 0
  function hostAllowed(url: string) {
    try {
      const h = new URL(url).hostname.toLowerCase()
      return HTML_CHECK_HOSTS.some(x => h === x || h.endsWith(`.${x}`))
    } catch { return false }
  }

  for (const it of flat) {
    if (used < MAX_HTML_CHECKS && hostAllowed(it.link)) {
      const isAd = await hasSponsorMarker(it.link)
      used++
      if (isAd) continue // odreži
    }
    kept.push(it)
  }
  flat = kept

  // zadnji sort za vsak slučaj
  flat.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
  return flat
}
