// lib/scrapeFeatured.ts
import type { NewsItem } from '@/types'
import { homepages } from './sources'
import * as cheerio from 'cheerio'

type Candidate = {
  href: string
  title?: string
  img?: string
  score: number
}

const CLASS_HINTS = [
  'hero','featured','naslovn','headline','lead','main','top',
  'aktualno','izpostav','front','big','prime'
]

function absURL(base: string, href?: string) {
  if (!href) return undefined
  try { return new URL(href, base).toString() } catch { return undefined }
}
function cleanText(t?: string) { return (t ?? '').replace(/\s+/g, ' ').trim() }

// --- URL Heuristics ---------------------------------------------------------

function articleLikeScore(source: string, href: string): number {
  let s = 0
  try {
    const u = new URL(href)
    const path = u.pathname || '/'
    const segs = path.split('/').filter(Boolean)
    const hyphens = (path.match(/-/g) || []).length
    const id6 = /\d{6,}/.test(path)

    // generično: več segmentov + veliko vezajev = bolj "člankasto"
    if (segs.length >= 3) s += 6
    if (hyphens >= 3) s += 4
    if (id6) s += 6

    // site-specifični bonusi
    switch (source) {
      case 'RTVSLO':
        // članki imajo ID na koncu (…/755779)
        if (id6) s += 8
        // izogni se rootu in /rtv365
        if (/^\/?$/.test(path) || path.startsWith('/rtv365')) s -= 10
        break
      case 'Siol.net':
        if (path.startsWith('/novice/')) s += 8
        break
      case 'Zurnal24':
        if (id6) s += 6
        break
      case 'Svet24':
        if (id6) s += 6
        break
      case 'Delo':
        if (path.startsWith('/novice/') || id6) s += 6
        break
      case '24ur':
        if (path.endsWith('.html')) s += 6
        break
      case 'Slovenske novice':
        if (path.startsWith('/novice/') || path.startsWith('/kronika/')) s += 6
        break
    }

    // kaznuj očitno ne-člankaste zadeve
    if (path === '/' || path === '') s -= 15
    if (path.endsWith('/video') || path.includes('/video/')) s -= 2
    if (u.hash && u.hash.length > 1) s -= 1
  } catch { /* ignore */ }
  return s
}

function pickBest(cands: Candidate[]): Candidate | null {
  if (!cands.length) return null
  cands.sort((a,b) => b.score - a.score)
  return cands[0]
}

// --- Booster selektorji (ciljano) ------------------------------------------

/**
 * Ciljani "boosterji" za portale, kjer vemo kje je hero.
 * Če zadane, vrnemo takoj; sicer gremo na generične heuristike.
 */
function tryBoostRTV($: cheerio.CheerioAPI, origin: string): Candidate | null {
  // išči sekcijo z napisom "Aktualno" in vzemi prvi <a>
  const blok = $('section:contains("Aktualno"), div:contains("Aktualno")').first()
  const a = blok.find('a[href]').first()
  if (!a.length) return null
  const href = absURL(origin, a.attr('href'))
  if (!href) return null
  const title =
    cleanText(blok.find('h1,h2,h3').first().text()) ||
    cleanText(a.attr('title')) ||
    cleanText(a.text())
  const img = absURL(origin, blok.find('img').first().attr('src') || blok.find('img').first().attr('data-src'))
  let score = 30 // močan boost
  score += articleLikeScore('RTVSLO', href)
  return { href, title, img, score }
}

function tryBoostSiol($: cheerio.CheerioAPI, origin: string): Candidate | null {
  // Siol: glavni blok pogosto v /novice/, velik naslov + slika
  const a = $('a[href^="/novice/"]').has('h1, h2, picture, img').first()
  if (!a.length) return null
  const href = absURL(origin, a.attr('href'))
  if (!href) return null
  const wrap = a.closest('article,section,div')
  const title =
    cleanText(wrap.find('h1,h2').first().text()) ||
    cleanText(a.attr('title')) ||
    cleanText(a.text())
  const img = absURL(origin, wrap.find('img').first().attr('src') || wrap.find('img').first().attr('data-src'))
  let score = 28
  score += articleLikeScore('Siol.net', href)
  return { href, title, img, score }
}

// --- Public scraper ---------------------------------------------------------

export async function scrapeFeatured(source: string): Promise<NewsItem | null> {
  const homepage = homepages[source]
  if (!homepage) return null

  try {
    const res = await fetch(homepage, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KrizisceBot/1.0; +https://krizisce.si)',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
      },
      cache: 'no-store'
    })
    if (!res.ok) throw new Error(`fetch ${source} homepage failed`)
    const html = await res.text()
    const $ = cheerio.load(html)
    const origin = new URL(homepage).origin

    // 1) per-site boosterji
    if (source === 'RTVSLO') {
      const boosted = tryBoostRTV($, origin)
      if (boosted) return {
        title: boosted.title || 'Naslovnica',
        link: boosted.href,
        source,
        image: boosted.img ?? null,
        contentSnippet: '',
        isoDate: undefined, pubDate: undefined, publishedAt: undefined
      }
    }
    if (source === 'Siol.net') {
      const boosted = tryBoostSiol($, origin)
      if (boosted) return {
        title: boosted.title || 'Naslovnica',
        link: boosted.href,
        source,
        image: boosted.img ?? null,
        contentSnippet: '',
        isoDate: undefined, pubDate: undefined, publishedAt: undefined
      }
    }

    // 2) generične heuristike (kandidati)
    const candidates: Candidate[] = []

    $('article, section, div').each((i, el) => {
      const $el = $(el)
      const a = $el.find('a[href]').first()
      if (!a.length) return

      const href = absURL(origin, a.attr('href'))
      if (!href) return
      if (href.startsWith('javascript:') || href.endsWith('#')) return

      const title =
        cleanText($el.find('h1,h2,h3').first().text()) ||
        cleanText(a.text()) ||
        cleanText(a.attr('title'))
      if (!title) return

      const img = absURL(origin,
        $el.find('img').first().attr('src') ||
        $el.find('img').first().attr('data-src') ||
        ($el.find('img').first().attr('srcset') || '').split(' ')[0]
      )

      let score = 0
      // class namigi
      const cls = ($el.attr('class') || '').toLowerCase()
      for (const hint of CLASS_HINTS) if (cls.includes(hint)) score += 10
      if (img) score += 8
      if (title.length > 20) score += 6
      // zgodnja pozicija v DOM
      score += Math.max(0, 20 - Math.floor(i / 20))
      // URL ocena
      score += articleLikeScore(source, href)

      candidates.push({ href, title, img, score })
    })

    const best = pickBest(candidates)
    if (!best) return null

    return {
      title: best.title || 'Naslovnica',
      link: best.href,
      source,
      image: best.img ?? null,
      contentSnippet: '',
      isoDate: undefined, pubDate: undefined, publishedAt: undefined
    }
  } catch (e) {
    console.error('scrapeFeatured error', source, e)
    return null
  }
}
