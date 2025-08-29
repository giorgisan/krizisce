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

/* ---------------------------------- META FROM ARTICLE ---------------------------------- */

async function fetchArticleMeta(url: string): Promise<{ title?: string; image?: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KrizisceBot/1.0; +https://krizisce.si)' },
      cache: 'no-store',
    })
    if (!res.ok) return {}
    const html = await res.text()
    const $ = cheerio.load(html)

    const ogTitle = $('meta[property="og:title"]').attr('content')
      || $('meta[name="twitter:title"]').attr('content')
      || clean($('h1').first().text())
      || clean($('title').first().text())

    const ogImage = $('meta[property="og:image"]').attr('content')
      || $('meta[name="twitter:image"]').attr('content')
      || $('meta[property="og:image:secure_url"]').attr('content')
      || $('meta[name="twitter:image:src"]').attr('content')

    return { title: clean(ogTitle), image: ogImage }
  } catch {
    return {}
  }
}

/* ---------------------------------- URL HEURISTICS ---------------------------------- */

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

/* ---------------------------------- BOOSTERS (site-specific) ---------------------------------- */

// RTV: “hero” je v sliderju .news-image-rotator; <a> ima samo sliko, naslov je na članku
async function boostRTV($: cheerio.CheerioAPI, origin: string): Promise<Candidate | null> {
  const a = $('.news-image-rotator a.image-link[href]').first()
  if (!a.length) return null
  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null

  // naslov/slika pridemo z og:* iz članka
  const meta = await fetchArticleMeta(hrefAbs)
  const imgFromDom =
    absURL(origin, a.find('img').attr('src') || a.find('img').attr('data-src')) || undefined

  return {
    href: hrefAbs,
    title: meta.title,
    img: meta.image || imgFromDom,
    score: 50 + articleLikeScore('RTVSLO', hrefAbs),
  }
}

// Siol: vodilni link pod <main>, običajno /novice/...; če manjka naslov/slika, doberi z og:*
async function boostSiol($: cheerio.CheerioAPI, origin: string): Promise<Candidate | null> {
  const a = $('main a[href]').filter((_, el) => {
    const href = $(el).attr('href') || ''
    return urlLooksLikeArticle('Siol.net', href)
  }).has('h1,h2,img,picture').first()

  if (!a.length) return null
  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null

  const wrap = a.closest('article,section,div,main')
  let title =
    clean(wrap.find('h1,h2').first().text()) ||
    clean(a.attr('title')) ||
    clean(a.text())
  let img =
    absURL(origin, wrap.find('img').first().attr('src') || wrap.find('img').first().attr('data-src')) ||
    undefined

  if (!title || !img) {
    const meta = await fetchArticleMeta(hrefAbs)
    title = title || meta.title
    img = img || meta.image
  }

  return {
    href: hrefAbs,
    title,
    img,
    score: 44 + articleLikeScore('Siol.net', hrefAbs),
  }
}

// Delo: hero slika je v inline background-image; naslov v h1/h2 v wrapperju ali iz članka
async function boostDelo($: cheerio.CheerioAPI, origin: string): Promise<Candidate | null> {
  // ciljaj prvi hero blok z .teaser_image ali <main> z /novice/
  const wrap = $('main').find('a[href^="/novice/"]').first().closest('article,section,div,main')
  if (!wrap.length) return null

  const a = wrap.find('a[href^="/novice/"]').first()
  const hrefAbs = absURL(origin, a.attr('href'))
  if (!hrefAbs) return null

  let title =
    clean(wrap.find('h1,h2').first().text()) ||
    clean(a.attr('title')) ||
    clean(a.text())

  // slika: najprej iz inline background-image, sicer <img>, sicer og:image
  let img =
    extractBgUrl(wrap.find('[style*="background-image"]').first().attr('style')) ||
    absURL(origin, wrap.find('img').first().attr('src') || wrap.find('img').first().attr('data-src')) ||
    undefined

  if (!title || !img) {
    const meta = await fetchArticleMeta(hrefAbs)
    title = title || meta.title
    img   = img   || meta.image
  }

  return {
    href: hrefAbs,
    title,
    img,
    score: 46 + articleLikeScore('Delo', hrefAbs),
  }
}

// Slovenske novice: naslov je v .article_teaser__title_text; slika je lazy → vzemimo og:image s članka
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

  if (!title || !img) {
    const meta = await fetchArticleMeta(hrefAbs)
    title = title || meta.title
    img   = img   || meta.image
  }

  return {
    href: hrefAbs,
    title,
    img,
    score: 42 + articleLikeScore('Slovenske novice', hrefAbs),
  }
}

/* ---------------------------------- PUBLIC: scrapeFeatured ---------------------------------- */

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
    if (source === 'RTVSLO') {
      const c = await boostRTV($, origin)
      if (c) return {
        title: c.title || 'Naslovnica',
        link: c.href,
        source,
        image: c.img ?? null,
        contentSnippet: '',
        isoDate: undefined, pubDate: undefined, publishedAt: undefined,
      }
    }
    if (source === 'Siol.net') {
      const c = await boostSiol($, origin)
      if (c) return {
        title: c.title || 'Naslovnica',
        link: c.href,
        source,
        image: c.img ?? null,
        contentSnippet: '',
        isoDate: undefined, pubDate: undefined, publishedAt: undefined,
      }
    }
    if (source === 'Delo') {
      const c = await boostDelo($, origin)
      if (c) return {
        title: c.title || 'Naslovnica',
        link: c.href,
        source,
        image: c.img ?? null,
        contentSnippet: '',
        isoDate: undefined, pubDate: undefined, publishedAt: undefined,
      }
    }
    if (source === 'Slovenske novice') {
      const c = await boostSlovenskeNovice($, origin)
      if (c) return {
        title: c.title || 'Naslovnica',
        link: c.href,
        source,
        image: c.img ?? null,
        contentSnippet: '',
        isoDate: undefined, pubDate: undefined, publishedAt: undefined,
      }
    }

    // 2) generična heuristika (za ostale + “safety net”)
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

    // Če manjka naslov/slika, ju poskusi dobiti iz članka
    let title = best.title
    let img = best.img
    if (!title || !img) {
      const meta = await fetchArticleMeta(best.href)
      title = title || meta.title
      img   = img   || meta.image
    }

    return {
      title: title || 'Naslovnica',
      link: best.href,
      source,
      image: img ?? null,
      contentSnippet: '',
      isoDate: undefined, pubDate: undefined, publishedAt: undefined,
    }
  } catch (e) {
    console.error('scrapeFeatured error', source, e)
    return null
  }
}
