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

const isHttp = (u?: string) => !!u && /^https?:\/\//i.test(u)

const absURL = (base: string, href?: string) => {
  if (!href) return undefined
  try { return new URL(href, base).toString() } catch { return undefined }
}

const clean = (t?: string) => (t ?? '').replace(/\s+/g, ' ').trim()

/** —————————————————————  PER–SITE “ARTICLE URL” REGEXI  ———————————————————— */
const ARTICLE_PATTERNS: Record<string, RegExp[]> = {
  // RTV članki skoraj vedno končajo s /123456 ali več
  RTVSLO: [ /\/\d{6,}(?:[\/?#]|$)/ ],
  // Siol članki imajo ID kot -670620 na koncu sluga
  'Siol.net': [ /-\d{5,}(?:[\/?#]|$)/, /^\/novice\// ],
  // nekaj konservativnega za ostale (ne bo strogo)
  '24ur':   [ /\.html(?:[?#]|$)/ ],
  Delo:     [ /^\/novice\//, /-\d{5,}(?:[\/?#]|$)/ ],
  Zurnal24: [ /-\d{5,}(?:[\/?#]|$)/ ],
  'Slovenske novice': [ /^\/(novice|kronika|slovenija|svet)\// ],
  N1:       [ /^\/.+/ ], // N1 je že delal OK z generiko
  Svet24:   [ /-\d{5,}(?:[\/?#]|$)/, /^\/(novice|lokalno|svet)\// ],
}

function urlLooksLikeArticle(source: string, href: string) {
  const pats = ARTICLE_PATTERNS[source] || []
  return pats.some((re) => re.test(href))
}

function articleLikeScore(source: string, abs: string): number {
  let s = 0
  try {
    const u = new URL(abs)
    const path = u.pathname || '/'
    const segs = path.split('/').filter(Boolean)
    const hyphens = (path.match(/-/g) || []).length
    const id6 = /\d{6,}/.test(path)

    if (urlLooksLikeArticle(source, path)) s += 14
    if (segs.length >= 3) s += 4
    if (hyphens >= 3) s += 3
    if (id6) s += 4
    if (path === '/' || path === '') s -= 20
    if (u.hash && u.hash.length > 1) s -= 1
  } catch { /* ignore */ }
  return s
}

function pickBest(cands: Candidate[]) {
  if (!cands.length) return null
  cands.sort((a,b) => b.score - a.score)
  return cands[0]
}

/** —————————————————————  BOOST: RTV in Siol  ———————————————————— */
function boostRTV($: cheerio.CheerioAPI, origin: string): Candidate | null {
  // poišči blok z vidnim “Aktualno”, nato prvo povezavo, ki izgleda člankasto (…/755779)
  const blok = $('section:contains("Aktualno"), div:contains("Aktualno")').first()
  const a = blok.find('a[href]').filter((_, el) => {
    const href = $(el).attr('href') || ''
    return urlLooksLikeArticle('RTVSLO', href)
  }).first()
  if (!a.length) return null

  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null

  const wrap = a.closest('article,section,div')
  const title =
    clean(wrap.find('h1,h2').first().text()) ||
    clean(a.attr('title')) ||
    clean(a.text())
  const img = absURL(origin,
    wrap.find('img').first().attr('src') ||
    wrap.find('img').first().attr('data-src') ||
    (wrap.find('img').first().attr('srcset') || '').split(' ')[0]
  )

  let score = 40 + articleLikeScore('RTVSLO', hrefAbs)
  return { href: hrefAbs, title, img, score }
}

function boostSiol($: cheerio.CheerioAPI, origin: string): Candidate | null {
  // prvi A, ki ima -123456 ali je pod /novice/, v bloku z naslovom in sliko
  const a = $('a[href]').filter((_, el) => {
    const href = $(el).attr('href') || ''
    return urlLooksLikeArticle('Siol.net', href)
  }).first()
  if (!a.length) return null

  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null

  const wrap = a.closest('article,section,div')
  const title =
    clean(wrap.find('h1,h2').first().text()) ||
    clean(a.attr('title')) ||
    clean(a.text())
  const img = absURL(origin,
    wrap.find('img').first().attr('src') ||
    wrap.find('img').first().attr('data-src') ||
    (wrap.find('img').first().attr('srcset') || '').split(' ')[0]
  )

  let score = 36 + articleLikeScore('Siol.net', hrefAbs)
  return { href: hrefAbs, title, img, score }
}

/** —————————————————————  PUBLIC: SCRAPE FEATURED  ———————————————————— */
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

    // 1) ciljana pravila za RTV in Siol
    if (source === 'RTVSLO') {
      const c = boostRTV($, origin)
      if (c) return {
        title: c.title || 'Naslovnica',
        link: c.href, source,
        image: c.img ?? null,
        contentSnippet: ''
      }
    }
    if (source === 'Siol.net') {
      const c = boostSiol($, origin)
      if (c) return {
        title: c.title || 'Naslovnica',
        link: c.href, source,
        image: c.img ?? null,
        contentSnippet: ''
      }
    }

    // 2) generična heuristika (za ostale + fallback)
    const candidates: Candidate[] = []

    $('a[href]').each((i, el) => {
      const $a = $(el)
      const raw = $a.attr('href') || ''
      // ignoriraj #, javascript, mailto, root
      if (/^(#|javascript:|mailto:)/i.test(raw)) return

      const href = absURL(origin, raw)
      if (!isHttp(href)) return

      // mora delovati “člankasto” (po zgornjih pravilih) ali pa imeti konkreten naslov
      if (!urlLooksLikeArticle(source, raw) && clean($a.text()).length < 25) return

      const wrap = $a.closest('article,section,div')
      const title =
        clean(wrap.find('h1,h2,h3').first().text()) ||
        clean($a.attr('title')) ||
        clean($a.text())
      if (!title) return

      const img = absURL(origin,
        wrap.find('img').first().attr('src') ||
        wrap.find('img').first().attr('data-src') ||
        (wrap.find('img').first().attr('srcset') || '').split(' ')[0]
      )

      let score = articleLikeScore(source, href!)
      // class namigi v wrapperju
      const cls = (wrap.attr('class') || '').toLowerCase()
      for (const hint of CLASS_HINTS) if (cls.includes(hint)) score += 8
      if (img) score += 6
      if (title.length > 40) score += 4
      // večji bonus, čim prej v DOM-u
      score += Math.max(0, 20 - Math.floor(i / 20))

      candidates.push({ href: href!, title, img, score })
    })

    const best = pickBest(candidates)
    if (!best) return null

    return {
      title: best.title || 'Naslovnica',
      link: best.href,
      source,
      image: best.img ?? null,
      contentSnippet: ''
    }
  } catch (e) {
    console.error('scrapeFeatured error', source, e)
    return null
  }
}
