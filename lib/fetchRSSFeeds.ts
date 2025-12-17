import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'
import { isLikelyAd } from './adFilter' 
import { determineCategory, CategoryId } from './categories'

type FetchOpts = { forceFresh?: boolean }

// --- 1. TIHO BLOKIRANJE (Hard Block) ---
// Tukaj pustimo SAMO tehnične smeti, ki niso članki.
// VSE ostalo (promo, oglasi, trgovina) spustimo naprej, da jih adFilter označi kot 'oglas'.
const BLOCK_URLS: RegExp[] = [
  /\/wp-json\//i,      // API endpointi
  /\/xmlrpc\//i,       // Tehnični endpointi
  /\/komentarji\//i,   // Povezave direktno na komentarje (če ne želiš)
  /#comment/i          // Sidra na komentarje
]

// Ti vzorci se uporabljajo za HTML check (če omogočen)
const HTML_MARKERS = [
  'oglasno sporočilo','promocijsko sporočilo','plačana objava',
  'sponzorirano','vsebino omogoča','partner vsebina','advertorial',
  'sponsored content','article__pr_box','promo-box', 
  'promo delo'
]

const ENABLE_HTML_CHECK = true
const MAX_HTML_CHECKS = 10 
const HTML_CHECK_HOSTS = [
  'rtvslo.si','siol.net','delo.si','slovenskenovice.si','delo.si','24ur.com','zurnal24.si', 'n1info.si','dnevnik.si'
]

// --- Helperji za slike in datume ---
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

async function scrapeOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000) 

    const res = await fetch(url, { 
      signal: controller.signal,
      headers: { 'User-Agent': 'KrizisceBot/1.0 (+https://krizisce.si)' }
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const chunk = await res.text() 
    const match = chunk.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    if (match && match[1]) return match[1].trim()
    return null
  } catch (e) {
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
      'category', 
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

// HTML check helperji 
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
  const to = setTimeout(() => ctrl.abort(), 2500) 
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

// --- GLAVNA FUNKCIJA FETCH ---
export default async function fetchRSSFeeds(opts: FetchOpts = {}): Promise<NewsItem[]> {
  const { forceFresh = false } = opts
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

        const itemsPromise = feed.items.slice(0, 25).map(async (item: any) => {
          
          const link = item.link ?? ''

          // 1. TIHO BLOKIRANJE (Samo tehnične smeti)
          // Tu smo odstranili "trgovina", "oglas", "promo". To zdaj rešuje adFilter.
          if (BLOCK_URLS.some(rx => rx.test(link))) {
              return null
          }
          
          // 2. PRIPRAVA PODATKOV
          const tempCheckItem = {
             title: item.title,
             link: link,
             contentSnippet: item.contentSnippet || item.content || '',
             description: item.contentSnippet, 
             categories: item.categories
          }

          // 3. AD FILTER (Glavni varnostnik)
          // Ta funkcija bo preverila URL (npr. /delov-poslovni-center/) in vrnila isAd=true
          const adCheck = isLikelyAd(tempCheckItem)
          const isAd = adCheck.isAd

          const iso = (item.isoDate ?? item.pubDate ?? new Date().toISOString()) as string
          const publishedAt = toUnixMs(iso)
          
          // Slike naložimo samo, če NI oglas (varčevanje virov)
          let finalImage = null
          if (!isAd) {
             finalImage = extractImage(item, link)
             if (!finalImage && link) {
                finalImage = await scrapeOgImage(link)
             }
          }

          const rawCats = item.categories 
            ? (Array.isArray(item.categories) ? item.categories : [item.categories])
            : []

          // 4. DOLOČANJE KATEGORIJE
          let categoryId: CategoryId = 'ostalo'
          
          if (isAd) {
              categoryId = 'oglas' // Članek gre v bazo, a označen kot oglas
              if (process.env.NODE_ENV !== 'production') {
                  console.log(`[AdFilter] Označeno kot oglas: ${item.title} [${adCheck.matches.join(', ')}]`)
              }
          } else {
              // Če ni oglas, določi pravo kategorijo (Šport, Tech, itd.)
              categoryId = determineCategory({ 
                link, 
                title: item.title, 
                contentSnippet: item.contentSnippet, 
                categories: rawCats
              })
          }

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
            category: categoryId,
          } as NewsItem
        })

        const items = (await Promise.all(itemsPromise)).filter(Boolean) as NewsItem[] 
        return items
      } catch {
        return []
      }
    }),
  )

  let flat: NewsItem[] = results.flat()

  // HTML Checks (DODATNO PREVERJANJE za tiste, ki so ušli URL filtru)
  const finalItems: NewsItem[] = []
  
  flat.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))

  let usedHtmlChecks = 0
  function hostAllowed(url: string) {
    try {
      const h = new URL(url).hostname.toLowerCase()
      return HTML_CHECK_HOSTS.some(x => h === x || h.endsWith(`.${x}`))
    } catch { return false }
  }

  for (const it of flat) {
    // Če je že označen kot oglas (zaradi URL-ja), ga ne preverjamo več
    if (it.category === 'oglas') {
        finalItems.push(it)
        continue
    }

    // Dodatno preverjanje s HTML requestom (samo za prvih N sumljivih)
    if (usedHtmlChecks < MAX_HTML_CHECKS && hostAllowed(it.link)) {
      const isHtmlAd = await hasSponsorMarker(it.link)
      usedHtmlChecks++
      if (isHtmlAd) {
          if (process.env.NODE_ENV !== 'production') console.log(`[HTMLCheck] Označeno kot oglas: ${it.title}`)
          it.category = 'oglas'
      }
    }
    finalItems.push(it)
  }

  // Končno sortiranje
  finalItems.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
  return finalItems
}
