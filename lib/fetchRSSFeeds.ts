import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'
import { isLikelyAd } from './adFilter' 
import { determineCategory, CategoryId } from './categories'

type FetchOpts = { forceFresh?: boolean }

// --- 1. TIHO BLOKIRANJE (Samo tehnične smeti) ---
const BLOCK_URLS: RegExp[] = [
  /\/wp-json\//i,      
  /\/xmlrpc\//i,       
  /\/komentarji\//i,   
  /#comment/i          
]

// HTML Check je izklopljen, da preprečimo lažne oglase
const ENABLE_HTML_CHECK = false 
const MAX_HTML_CHECKS = 0 
const HTML_CHECK_HOSTS: string[] = [] 

// --- 2. DEFINICIJA PARSERJA (To je manjkalo!) ---
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

// --- GLAVNA FUNKCIJA FETCH ---
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
        const feed = await parser.parseString(xml) // TUKAJ JE BILA NAPAKA (zdaj je parser definiran)
        if (!feed.items?.length) return []

        const itemsPromise = feed.items.slice(0, 25).map(async (item: any) => {
          
          const link = item.link ?? ''

          // 1. TIHO BLOKIRANJE (Samo tehnične smeti)
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

          // 3. AD FILTER (Samo URL + RSS kategorija)
          const adCheck = isLikelyAd(tempCheckItem)
          const isAd = adCheck.isAd

          const iso = (item.isoDate ?? item.pubDate ?? new Date().toISOString()) as string
          const publishedAt = toUnixMs(iso)
          
          // Slike naložimo samo, če NI oglas
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
              categoryId = 'oglas'
              if (process.env.NODE_ENV !== 'production') {
                  console.log(`[AdFilter] Oglas zaznan (URL): ${item.title}`)
              }
          } else {
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
  
  // Sortiranje
  flat.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
  
  return flat
}
