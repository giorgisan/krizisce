// lib/scrapeFeatured.ts
import type { NewsItem } from '@/types'
import { homepages } from './sources'
import * as cheerio from 'cheerio'

type Cand = { href: string; title?: string; img?: string }

// -------- utils -------------------------------------------------------------

const clean = (t?: string) => (t ?? '').replace(/\s+/g, ' ').trim()

function absURL(base: string, href?: string | null) {
  if (!href) return undefined
  if (href.startsWith('//')) return `https:${href}`
  try { return new URL(href, base).toString() } catch { return undefined }
}

function pickFromSrcset(srcset?: string | null) {
  if (!srcset) return undefined
  const first = srcset.split(',')[0]?.trim().split(' ')[0]
  return first || undefined
}

function pickImage($scope: cheerio.Cheerio<any>, origin: string) {
  const img = $scope.find('img').first()
  const pic = $scope.find('picture img').first()
  const fromImg =
    absURL(origin, img.attr('src')) ||
    absURL(origin, img.attr('data-src')) ||
    absURL(origin, pickFromSrcset(img.attr('srcset')))
  const fromPic =
    absURL(origin, pic.attr('src')) ||
    absURL(origin, pic.attr('data-src')) ||
    absURL(origin, pickFromSrcset(pic.attr('srcset')))
  return fromImg || fromPic
}

function pickHeading($scope: cheerio.Cheerio<any>) {
  return (
    clean($scope.find('h1,h2,h3').first().text()) ||
    clean($scope.find('[class*="title"],[class*="naslov"]').first().text())
  )
}

// -------- boosterji po virih -----------------------------------------------

/** RTVSLO: <a.image-link.image-container ... data-large=... href="/.../755878"> */
function boostRTV($: cheerio.CheerioAPI, origin: string): Cand | null {
  const a = $('a.image-link.image-container')
    .filter((_, el) => /\d{6,}/.test($(el).attr('href') || ''))
    .first()
  if (!a.length) return null

  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const wrap = a.closest('article, section, div')
  const title = pickHeading(wrap) || clean(a.attr('title')) || clean(a.text())
  const img =
    absURL(origin, a.attr('data-large')) ||
    pickImage(a as unknown as cheerio.Cheerio<any>, origin) ||
    pickImage(wrap as unknown as cheerio.Cheerio<any>, origin)

  return { href, title, img }
}

/** 24ur: .media--splashL picture img (hero), link je običajno v parent <a> ali sosednjem overlay-ju */
function boost24ur($: cheerio.CheerioAPI, origin: string): Cand | null {
  const imgWrap = $('.media--splashL').first()
  if (!imgWrap.length) return null

  const linkEl = imgWrap.closest('a')
  let href = linkEl.attr('href')
  if (!href) {
    const overlayLink = imgWrap.parent().find('a[href]').first()
    href = overlayLink.attr('href')
  }
  if (!href) return null

  const title =
    clean(imgWrap.find('img').attr('alt')) ||
    pickHeading(imgWrap.parent() as unknown as cheerio.Cheerio<any>) ||
    clean(linkEl.text())

  const img =
    pickImage(imgWrap as unknown as cheerio.Cheerio<any>, origin) ||
    pickImage(imgWrap.parent() as unknown as cheerio.Cheerio<any>, origin)

  return { href: absURL(origin, href)!, title, img }
}

/** Siol: hero v fold_intro levi koloni: main .fold_intro__left article a picture img */
function boostSiol($: cheerio.CheerioAPI, origin: string): Cand | null {
  let node = $('body > main .fold_intro__left article a picture img').first()
  if (!node.length) node = $('img.card__img').first()
  if (!node.length) return null

  const a = node.closest('a')
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const wrap = a.closest('article,section,div,main')
  const title =
    clean(node.attr('alt')) ||
    pickHeading(wrap as unknown as cheerio.Cheerio<any>) ||
    clean(a.attr('title')) ||
    clean(a.text())

  const img =
    absURL(origin, node.attr('src')) ||
    absURL(origin, node.attr('data-src')) ||
    absURL(origin, pickFromSrcset(node.attr('srcset'))) ||
    pickImage(wrap as unknown as cheerio.Cheerio<any>, origin)

  return { href, title, img }
}

/** Slovenske novice: velik teaser .article_teaser__article-image--100000 */
function boostSlovenske($: cheerio.CheerioAPI, origin: string): Cand | null {
  const teaser = $('.article_teaser__article-image--100000').first()
  if (!teaser.length) return null
  const article = teaser.closest('article')
  const a = article.find('a[href]').first()
  if (!a.length) return null

  const href = absURL(origin, a.attr('href'))
  const title =
    pickHeading(article as unknown as cheerio.Cheerio<any>) ||
    clean(a.attr('title')) ||
    clean(a.text())
  const img = pickImage(article as unknown as cheerio.Cheerio<any>, origin)

  return href ? { href, title, img } : null
}

/** Delo: .teaser_image z inline background-image, link je v parent <a> ali v article-u */
function boostDelo($: cheerio.CheerioAPI, origin: string): Cand | null {
  const div = $('.teaser_image').first()
  if (!div.length) return null

  const style = div.attr('style') || ''
  const m = style.match(/url\(["']?([^"')]+)["']?\)/)
  const img = m ? absURL(origin, m[1]) : undefined

  let a = div.closest('a')
  if (!a.length) a = div.closest('article,div,section').find('a[href]').first()
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const wrap = a.closest('article,section,div,main')
  const title =
    pickHeading(wrap as unknown as cheerio.Cheerio<any>) ||
    clean(a.attr('title')) ||
    clean(a.text())

  return { href, title, img }
}

/** Žurnal24: img.card__img v hero kartici */
function boostZurnal($: cheerio.CheerioAPI, origin: string): Cand | null {
  const imgEl = $('img.card__img').first()
  if (!imgEl.length) return null
  const a = imgEl.closest('a')
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const wrap = a.closest('article,section,div')
  const title =
    clean(imgEl.attr('alt')) ||
    pickHeading(wrap as unknown as cheerio.Cheerio<any>) ||
    clean(a.text())
  const img =
    absURL(origin, imgEl.attr('src')) ||
    absURL(origin, imgEl.attr('data-src')) ||
    absURL(origin, pickFromSrcset(imgEl.attr('srcset'))) ||
    pickImage(wrap as unknown as cheerio.Cheerio<any>, origin)

  return { href, title, img }
}

/** N1: img.w-full.h-full.object-cover … v hero kartici */
function boostN1($: cheerio.CheerioAPI, origin: string): Cand | null {
  const imgEl = $('img.w-full.h-full.object-cover').first()
  if (!imgEl.length) return null
  const a = imgEl.closest('a')
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const wrap = a.closest('article,section,div')
  const title =
    clean(imgEl.attr('alt')) ||
    pickHeading(wrap as unknown as cheerio.Cheerio<any>) ||
    clean(a.text())
  const img =
    absURL(origin, imgEl.attr('src')) ||
    absURL(origin, imgEl.attr('data-src')) ||
    absURL(origin, pickFromSrcset(imgEl.attr('srcset'))) ||
    pickImage(wrap as unknown as cheerio.Cheerio<any>, origin)

  return { href, title, img }
}

/** Svet24: prvi hero <article> z <picture> img (ali .object-cover) */
function boostSvet24($: cheerio.CheerioAPI, origin: string): Cand | null {
  let imgEl = $('body > main article a picture img').first()
  if (!imgEl.length) imgEl = $('img.object-cover').first()
  if (!imgEl.length) return null

  const a = imgEl.closest('a')
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const wrap = a.closest('article,section,div')
  const title =
    clean(imgEl.attr('alt')) ||
    pickHeading(wrap as unknown as cheerio.Cheerio<any>) ||
    clean(a.text())
  const img =
    absURL(origin, imgEl.attr('src')) ||
    absURL(origin, imgEl.attr('data-src')) ||
    absURL(origin, pickFromSrcset(imgEl.attr('srcset'))) ||
    pickImage(wrap as unknown as cheerio.Cheerio<any>, origin)

  return { href, title, img }
}

// -------- main --------------------------------------------------------------

export async function scrapeFeatured(source: string): Promise<NewsItem | null> {
  const homepage = homepages[source]
  if (!homepage) return null

  try {
    const res = await fetch(homepage, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KrizisceBot/1.0; +https://krizisce.si)' },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`fetch ${source} homepage failed`)
    const html = await res.text()
    const $ = cheerio.load(html)
    const origin = new URL(homepage).origin

    let c: Cand | null = null
    switch (source) {
      case 'RTVSLO': c = boostRTV($, origin); break
      case '24ur': c = boost24ur($, origin); break
      case 'Siol.net': c = boostSiol($, origin); break
      case 'Slovenske novice': c = boostSlovenske($, origin); break
      case 'Delo': c = boostDelo($, origin); break
      case 'Zurnal24': c = boostZurnal($, origin); break
      case 'N1': c = boostN1($, origin); break
      case 'Svet24': c = boostSvet24($, origin); break
    }

    if (!c || !c.href) return null

    return {
      title: c.title || 'Naslovnica',
      link: c.href,
      source,
      image: c.img ?? null,
      contentSnippet: '',
      isoDate: undefined,
      pubDate: undefined,
      publishedAt: undefined,
    }
  } catch (e) {
    console.error('scrapeFeatured error', source, e)
    return null
  }
}
