import Parser from 'rss-parser'
import type { NewsItem } from '../types'
import { feeds } from './sources'
import { excludeAds } from './adFilter'
import { determineCategory } from './categories'

type FetchOpts = { forceFresh?: boolean }

/** * 1. BLOKADA NA PODLAGI URL-ja
 * Odstranjen Siol Posel, ostajajo samo očitni oglasni URL-ji.
 */
const BLOCK_URLS: RegExp[] = [
  /\/promo\//i,       // URLji s /promo/ so ponavadi vedno oglasi
  /\/oglasi\//i,      
  /\/advertorial\//i,
  /\/sponzorirano\//i,
]

/** * 2. BLOKADA NA PODLAGI VSEBINE (Naslov, Opis, HTML)
 * Odstranjene fraze "vam svetuje", "vam priporoča" in specifična imena podjetij.
 */
const BLOCK_PATTERNS: string[] = [
  // Eksplicitne oznake za oglase
  'oglasno sporočilo','oglasno sporocilo',
  'promocijsko sporočilo','promocijsko sporocilo',
  'oglasni prispevek','komercialno sporočilo',
  'sponzorirano','partner vsebina','branded content',
  'vsebino omogoča','vsebino omogoca', 
  'pr članek','pr clanek',
  'advertorial',
  
  // Specifične fraze medijev za oglase (varno)
  'promo delo',        
  'promo slovenske', 
  'promo prispevek',
]

// BLOCK_BRANDS je v celoti odstranjen, da ne blokiramo novic o podjetjih.

/** ====== GENERIČNI HTML CHECK ====== */
const ENABLE_HTML_CHECK = true
const MAX_HTML_CHECKS = 10 
const HTML_CHECK_HOSTS = [
  'rtvslo.si','siol.net','delo.si','slovenskenovice.si','delo.si','24ur.com','zurnal24.si', 'n1info.si','dnevnik.si'
]
const HTML_MARKERS = [
  'oglasno sporočilo','promocijsko sporočilo','plačana objava',
  'sponzorirano','vsebino omogoča','partner vsebina','advertorial',
  'sponsored content','article__pr_box','promo-box', 
  'promo delo'
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

/** * Funkcija za reševanje manjkajočih slik (og:image).
 */
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

/** * Enostaven filter: URL + naslov + snippet + KATEGORIJE 
 */
function isBlockedBasic(i: { 
  link?: string; 
  title?: string; 
  content?: string | null; 
  contentSnippet?: string | null;
  categories?: string[] 
}) {
  const url = i.link || ''
  // Preverjamo samo naslov in snippet, vsebine (content) raje ne, da ne blokiramo po pomoti
  const hay = `${i.title || ''}\n${i.contentSnippet || ''}`.toLowerCase()
  
  // 1. URL check
  if (BLOCK_URLS.some(rx => rx.test(url))) return true
  
  // 2. Vsebinski vzorci (Oglasi)
  if (BLOCK_PATTERNS.some(k => hay.includes(k.toLowerCase()))) return true
  
  // 3. Brand check je odstranjen.

  // 4. RSS Kategorije (Zelo varno, ker to določi urednik)
  if (i.categories && i.categories.length > 0) {
    const badCats = ['promo', 'oglas', 'oglasi', 'sponzorirano', 'partner', 'advertorial']
    const hasBadCat = i.categories.some(cat => 
      badCats.some(bad => cat.toLowerCase().includes(bad))
    )
    if (hasBadCat) return true
  }

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

/** ====== GLAVNA FUNKCIJA ====== */
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

        // Mapiramo in hkrati preverimo slike
        const itemsPromise = feed.items.slice(0, 25).map(async (item: any) => {
          const iso = (item.isoDate ?? item.pubDate ?? new Date().toISOString()) as string
          const publishedAt = toUnixMs(iso)
          const link = item.link ?? ''
          
          let finalImage = extractImage(item, link)
          if (!finalImage && link) {
             finalImage = await scrapeOgImage(link)
          }

          const categories = item.categories 
            ? (Array.isArray(item.categories) ? item.categories : [item.categories])
            : []

          // Določanje kategorije
          const categoryId = determineCategory({ link, categories })

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
            categories, 
            category: categoryId,
          }
        })

        const items = await Promise.all(itemsPromise)
        return items
      } catch {
        return []
      }
    }),
  )

  // 1) Filtriraj (vključuje check za "Promo", "Vsebino omogoča" in RSS kategorije)
  let flat: NewsItem[] = results.flat().filter(i => !isBlockedBasic(i))

  // 1.5) Dodatni RSS ad-filter
  flat = excludeAds(flat, 3, true)

  flat.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))

  // 2) HTML-check (če je preživel osnovni filter, preveri še HTML za skrite markerje)
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
      if (isAd) continue // Blokiraj če HTML vsebuje marker
    }
    kept.push(it)
  }
  flat = kept

  flat.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
  return flat
}
