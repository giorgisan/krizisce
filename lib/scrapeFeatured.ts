// lib/scrapeFeatured.ts
import type { NewsItem } from '@/types'
import { homepages } from './sources'
import * as cheerio from 'cheerio'

type Candidate = {
  href: string
  title?: string
  img?: string
  desc?: string
  score: number
}

const CLASS_HINTS = [
  'hero','featured','naslovn','headline','lead','main','top',
  'aktualno','izpostav','front','big','prime'
]

const isHttp = (u?: string) => !!u && /^https?:\/\//i.test(u)
const clean  = (t?: string) => (t ?? '').replace(/\s+/g, ' ').trim()

const absURL = (base: string, href?: string) => {
  if (!href) return undefined
  try { return new URL(href, base).toString() } catch { return undefined }
}

function extractBgUrl(style?: string) {
  if (!style) return undefined
  const m = style.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i)
  return m?.[1]
}

/* ----------------------------- META FROM ARTICLE ---------------------------- */

async function fetchArticleMeta(url: string): Promise<{ title?: string; image?: string; description?: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KrizisceBot/1.0; +https://krizisce.si)' },
      cache: 'no-store',
    })
    if (!res.ok) return {}
    const html = await res.text()
    const $ = cheerio.load(html)

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      clean($('h1').first().text()) ||
      clean($('title').first().text())

    const image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[property="og:image:secure_url"]').attr('content') ||
      $('meta[name="twitter:image:src"]').attr('content')

    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      clean($('p').first().text())

    return { title: clean(title), image, description: clean(description) }
  } catch {
    return {}
  }
}

/* -------------------------------- URL HEURISTICS ---------------------------- */

const ARTICLE_PATTERNS: Record<string, RegExp[]> = {
  RTVSLO: [ /\/\d{6,}(?:[\/?#]|$)/ ],
  'Siol.net': [ /-\d{5,}(?:[\/?#]|$)/, /^\/novice\// ],
  '24ur': [ /\.html(?:[?#]|$)/ ],
  Delo: [ /^\/novice\// ],
  Zurnal24: [ /-\d{5,}(?:[\/?#]|$)/ ],
  'Slovenske novice': [ /^\/(novice|kronika|slovenija|svet|bralci)\// ],
  N1: [ /^\/.+/ ],
  Svet24: [ /-\d{5,}(?:[\/?#]|$)/, /^\/(novice|lokalno|svet)\// ],
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

/* ------------------------------- BOOSTERS ---------------------------------- */

// RTV: slider .news-image-rotator – v <a> je slika, naslov vzamemo iz članka
async function boostRTV($: cheerio.CheerioAPI, origin: string): Promise<Candidate | null> {
  const a = $('.news-image-rotator a.image-link[href]').first()
  if (!a.length) return null
  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null
  const imgDom =
    absURL(origin, a.find('img').attr('src') || a.find('img').attr('data-src')) || undefined
  const meta = await fetchArticleMeta(hrefAbs)
  return {
    href: hrefAbs,
    title: meta.title,
    img: meta.image || imgDom,
    desc: meta.description,
    score: 52 + articleLikeScore('RTVSLO', hrefAbs),
  }
}

// 24ur: <div class="splash__large"> → <a.card-overlay> z <h2> in <picture>
async function boost24ur($: cheerio.CheerioAPI, origin: string): Promise<Candidate | null> {
  const box = $('div.splash__large').first()
  if (!box.length) return null
  const a = box.find('a.card-overlay[href]').first()
  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null

  const title = clean(box.find('h2').first().text())
  const img =
    absURL(origin, box.find('img').first().attr('src')) ||
    absURL(origin, box.find('source').first().attr('srcset')) ||
    undefined

  let t = title, i = img, d: string | undefined
  if (!t || !i) {
    const meta = await fetchArticleMeta(hrefAbs)
    t = t || meta.title
    i = i || meta.image
    d = meta.description
  }

  return {
    href: hrefAbs,
    title: t,
    img: i,
    desc: d,
    score: 50 + articleLikeScore('24ur', hrefAbs),
  }
}

// Siol: <div class="fold_intro__left"> → article.card--b → h2.card__title
async function boostSiol($: cheerio.CheerioAPI, origin: string): Promise<Candidate | null> {
  const art = $('div.fold_intro__left article.card.card--b').first()
  if (!art.length) return null
  const a = art.find('a.card__link[href]').first()
  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null

  let title = clean(art.find('h2.card__title').first().text())
  let img =
    absURL(origin, art.find('img').first().attr('src') || art.find('picture source').first().attr('srcset')) ||
    undefined

  let d: string | undefined
  if (!title || !img) {
    const meta = await fetchArticleMeta(hrefAbs)
    title = title || meta.title
    img = img || meta.image
    d = meta.description
  }

  return {
    href: hrefAbs,
    title,
    img,
    desc: d,
    score: 46 + articleLikeScore('Siol.net', hrefAbs),
  }
}

// Delo: slika je pogosto v background-image; naslov iz h1/h2 ali iz članka
async function boostDelo($: cheerio.CheerioAPI, origin: string): Promise<Candidate | null> {
  const wrap = $('main').find('a[href^="/novice/"]').first().closest('article,section,div,main')
  if (!wrap.length) return null
  const a = wrap.find('a[href^="/novice/"]').first()
  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null

  let title =
    clean(wrap.find('h1,h2').first().text()) ||
    clean(a.attr('title')) ||
    clean(a.text())
  let img =
    extractBgUrl(wrap.find('[style*="background-image"]').first().attr('style')) ||
    absURL(origin, wrap.find('img').first().attr('src') || wrap.find('img').first().attr('data-src')) ||
    undefined

  let d: string | undefined
  if (!title || !img) {
    const meta = await fetchArticleMeta(hrefAbs)
    title = title || meta.title
    img   = img   || meta.image
    d     = meta.description
  }

  return {
    href: hrefAbs, title, img, desc: d,
    score: 48 + articleLikeScore('Delo', hrefAbs),
  }
}

// Slovenske novice: naslov v .article_teaser__title_text, slika lazy → dopolni z og:*
async function boostSlovenskeNovice($: cheerio.CheerioAPI, origin: string): Promise<Candidate | null> {
  const box = $('.article_teaser.article_teaser__vertical_overlay').first()
  if (!box.length) return null
  const a = box.find('a.article_teaser__title_link[href]').first()
  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null

  let title = clean(box.find('.article_teaser__title_text').first().text())
  let img =
    absURL(origin, box.find('img').first().attr('src') || box.find('img').first().attr('data-src')) ||
    extractBgUrl(box.find('[style*="background-image"]').first().attr('style')) ||
    undefined

  let d: string | undefined
  if (!title || !img) {
    const meta = await fetchArticleMeta(hrefAbs)
    title = title || meta.title
    img   = img   || meta.image
    d     = meta.description
  }

  return {
    href: hrefAbs, title, img, desc: d,
    score: 44 + articleLikeScore('Slovenske novice', hrefAbs),
  }
}

// Svet24: prvi "feature" article z data-upscore-object-id (hero grid)
async function boostSvet24($: cheerio.CheerioAPI, origin: string): Promise<Candidate | null> {
  const art = $('article[data-upscore-object-id]').first()
  if (!art.length) return null

  const a = art.find('a[href]').first()
  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null

  let title = clean(art.find('h3').first().text())
  let img = absURL(origin, art.find('img').first().attr('src') || art.find('source').first().attr('srcset')) || undefined

  let d: string | undefined
  if (!title || !img) {
    const meta = await fetchArticleMeta(hrefAbs)
    title = title || meta.title
    img   = img   || meta.image
    d     = meta.description
  }

  return {
    href: hrefAbs, title, img, desc: d,
    score: 44 + articleLikeScore('Svet24', hrefAbs),
  }
}

// Žurnal24: hero card --slovenija card--01
async function boostZurnal24($: cheerio.CheerioAPI, origin: string): Promise<Candidate | null> {
  const art = $('article.card.card--slovenija.card--01').first()
  if (!art.length) return null

  const a = art.find('a.card__link[href]').first()
  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null

  let title = clean(art.find('h2.card__title').first().text()) || clean(art.find('.card__title_highlight').first().text())
  let img = absURL(origin, art.find('img.card__img').first().attr('src') || art.find('source').first().attr('srcset')) || undefined

  let d: string | undefined
  if (!title || !img) {
    const meta = await fetchArticleMeta(hrefAbs)
    title = title || meta.title
    img   = img   || meta.image
    d     = meta.description
  }

  return {
    href: hrefAbs, title, img, desc: d,
    score: 44 + articleLikeScore('Zurnal24', hrefAbs),
  }
}

// N1: featured big-card (po tvojem izseku) – robustno dopolnimo z og:*
async function boostN1($: cheerio.CheerioAPI, origin: string): Promise<Candidate | null> {
  const art = $('article.big-card').first()
  if (!art.length) return null
  const a = art.find('a.thumbnail[href], h3 a[href]').first()
  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null

  let title = clean(art.find('h3 a').first().text()) || clean(art.find('[data-testid="article-title"]').first().text())
  let img =
    absURL(origin, art.find('img').first().attr('src')) ||
    extractBgUrl(art.find('[style*="background-image"]').first().attr('style')) ||
    undefined

  let d: string | undefined
  if (!title || !img) {
    const meta = await fetchArticleMeta(hrefAbs)
    title = title || meta.title
    img   = img   || meta.image
    d     = meta.description
  }

  return {
    href: hrefAbs, title, img, desc: d,
    score: 46 + articleLikeScore('N1', hrefAbs),
  }
}

/* ------------------------------- PUBLIC ------------------------------------ */

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

    // 1) ciljani boosterji
    const boosters: Record<string, (q: cheerio.CheerioAPI, origin: string) => Promise<Candidate | null>> = {
      RTVSLO: boostRTV,
      '24ur': boost24ur,
      'Siol.net': boostSiol,
      Delo: boostDelo,
      'Slovenske novice': boostSlovenskeNovice,
      Svet24: boostSvet24,
      Zurnal24: boostZurnal24,
      N1: boostN1,
    }

    const fn = boosters[source]
    if (fn) {
      const c = await fn($, origin)
      if (c) {
        return {
          title: c.title || 'Naslovnica',
          link: c.href,
          source,
          image: c.img ?? null,
          contentSnippet: c.desc ?? '',
          isoDate: undefined, pubDate: undefined, publishedAt: undefined,
        }
      }
    }

    // 2) generična heuristika (s safety-net meta fallbackom)
    const candidates: Candidate[] = []

    $('a[href]').each((i, el) => {
      const $a = $(el)
      const raw = $a.attr('href') || ''
      if (/^(#|javascript:|mailto:)/i.test(raw)) return

      const href = absURL(origin, raw)
      if (!isHttp(href)) return

      const wrap = $a.closest('article,section,div,main')
      let title =
        clean(wrap.find('h1,h2,h3').first().text()) ||
        clean($a.attr('title')) ||
        clean($a.text())

      if (!urlLooksLikeArticle(source, raw) && title.length < 25) return

      const img =
        absURL(origin, wrap.find('img').first().attr('src') || wrap.find('img').first().attr('data-src')) ||
        extractBgUrl(wrap.find('[style*="background-image"]').first().attr('style')) ||
        undefined

      let score = articleLikeScore(source, href!)
      const cls = (wrap.attr('class') || '').toLowerCase()
      for (const hint of CLASS_HINTS) if (cls.includes(hint)) score += 8
      if (img) score += 6
      if (title.length > 40) score += 4
      score += Math.max(0, 20 - Math.floor(i / 20))

      candidates.push({ href: href!, title, img, score })
    })

    const best = pickBest(candidates)
    if (!best) return null

    // meta fallback
    let title = best.title
    let img = best.img
    let desc: string | undefined
    if (!title || !img) {
      const meta = await fetchArticleMeta(best.href)
      title = title || meta.title
      img   = img   || meta.image
      desc  = meta.description
    }

    return {
      title: title || 'Naslovnica',
      link: best.href,
      source,
      image: img ?? null,
      contentSnippet: desc ?? '',
      isoDate: undefined, pubDate: undefined, publishedAt: undefined,
    }
  } catch (e) {
    console.error('scrapeFeatured error', source, e)
    return null
  }
}
