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

// --- POPRAVEK: IZKLOPLJENO HTML PREVERJANJE ---
// To je povzročalo, da so navadni članki postali oglasi zaradi besed v footerju strani.
const ENABLE_HTML_CHECK = false  // <--- SPREMENJENO V FALSE
const MAX_HTML_CHECKS = 0 
const HTML_CHECK_HOSTS: string[] = [] // Prazno

// ... (ostala koda ostane enaka, helperji za slike itd.) ...

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
        const feed = await parser.parseString(xml)
        if (!feed.items?.length) return []

        const itemsPromise = feed.items.slice(0, 25).map(async (item: any) => {
          
          const link = item.link ?? ''

          // 1. TIHO BLOKIRANJE
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
          // Ker smo izklopili HTML check zgoraj, bo to zdaj delovalo pravilno
          const adCheck = isLikelyAd(tempCheckItem)
          const isAd = adCheck.isAd

          const iso = (item.isoDate ?? item.pubDate ?? new Date().toISOString()) as string
          const publishedAt = toUnixMs(iso)
          
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
  
  // HTML Check zanka je odstranjena, samo sortiramo
  flat.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
  
  return flat
}

// ... (Helperji, ki so bili prej v datoteki, npr. extractImage, toUnixMs, scrapeOgImage morajo ostati) ...
