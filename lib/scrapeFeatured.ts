// lib/scrapeFeatured.ts
import type { NewsItem } from '@/types'
import { homepages } from './sources'
import * as cheerio from 'cheerio'

type Cand = { href: string; title?: string; img?: string }

// ---------------- utils ----------------

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

function isBadAlt(title?: string | null) {
  if (!title) return true
  const t = title.trim().toLowerCase()
  if (!t || t.length < 6) return true
  if (t === 'thumbnail' || t === 'naslovnica') return true
  if (/\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(t)) return true
  return false
}

// uniformni helperji z ohlapnim tipom — odpravijo Cheerio Element/AnyNode kolizije
const asC = (x: cheerio.Cheerio<any>) => x
const pickHeadingAround = ($scope: cheerio.Cheerio<any>): string | undefined => {
  const inScope =
    clean(asC($scope).find('h1,h2,h3').first().text()) ||
    clean(asC($scope).find('[class*="title"],[class*="naslov"],[class*="overlay__title"],[class*="card__title"]').first().text())
  if (inScope) return inScope

  const parent = asC($scope).parent()
  const near =
    clean(asC(parent).find('h1,h2,h3').first().text()) ||
    clean(asC(parent).find('[class*="title"],[class*="naslov"],[class*="overlay__title"],[class*="card__title"]').first().text())
  if (near) return near

  const linkText = clean(asC($scope).find('a[href]').first().text())
  if (linkText && linkText.length > 12) return linkText
  return undefined
}

function pickImage($scope: cheerio.Cheerio<any>, origin: string): string | undefined {
  const img = asC($scope).find('img').first()
  const fromImg =
    absURL(origin, img.attr('src')) ||
    absURL(origin, img.attr('data-src')) ||
    absURL(origin, img.attr('data-original')) ||
    absURL(origin, pickFromSrcset(img.attr('srcset')))
  if (fromImg) return fromImg

  const picImg = asC($scope).find('picture img').first()
  const fromPic =
    absURL(origin, picImg.attr('src')) ||
    absURL(origin, picImg.attr('data-src')) ||
    absURL(origin, pickFromSrcset(picImg.attr('srcset')))
  if (fromPic) return fromPic

  const styleHolder = asC($scope).find('[style*="background-image"]').first()
  const style = styleHolder.attr('style') || ''
  const m = style.match(/url\(["']?([^"')]+)["']?\)/)
  if (m?.[1]) return absURL(origin, m[1])

  return undefined
}

// ---------------- boosterji po virih ----------------

/** RTVSLO: <a.image-link.image-container data-large ... href="/.../755878"> */
function boostRTV($: cheerio.CheerioAPI, origin: string): Cand | null {
  const a = $('a.image-link.image-container')
    .filter((_, el) => /\d{6,}/.test($(el).attr('href') || ''))
    .first()
  if (!a.length) return null

  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const wrap = asC(a).closest('article,section,div,main')
  const title =
    pickHeadingAround(wrap) ||
    (!isBadAlt(a.attr('title')) ? clean(a.attr('title')) : undefined) ||
    clean(a.text())

  const img =
    absURL(origin, a.attr('data-large')) ||
    absURL(origin, (a.attr('data-large-srcset') || '').split(' ')[0]) ||
    pickImage(asC(a), origin) ||
    pickImage(wrap, origin)

  return { href, title, img }
}

/** 24ur: .media--splashL (hero), link v overlay/parent, naslov iz overlay/title */
function boost24ur($: cheerio.CheerioAPI, origin: string): Cand | null {
  const imgWrap = $('.media--splashL').first()
  if (!imgWrap.length) return null

  const card = asC(imgWrap).closest('article,div,section')
  let a = asC(card).find('.card-overlay a[href]').first()
  if (!a.length) a = asC(imgWrap).closest('a')
  if (!a.length) a = asC(card).find('a[href]').first()

  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  let title =
    clean(asC(card).find('.card-overlay__title, .card__title, h1, h2, h3').first().text())
  if (!title || isBadAlt(title)) {
    const alt = asC(imgWrap).find('img').attr('alt')
    title = (!isBadAlt(alt) ? clean(alt) : undefined) || clean(a.text())
  }

  const img =
    pickImage(asC(imgWrap), origin) ||
    pickImage(asC(card), origin)

  return { href, title, img }
}

/** Siol: fold_intro levi blok ali card hero */
function boostSiol($: cheerio.CheerioAPI, origin: string): Cand | null {
  let node = $('body > main .fold_intro__left article a picture img').first()
  if (!node.length) node = $('main article a picture img').first()
  if (!node.length) node = $('img.card__img').first()
  if (!node.length) return null

  const a = asC(node).closest('a')
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const article = asC(a).closest('article,section,div,main')
  const title =
    pickHeadingAround(article) ||
    (!isBadAlt(node.attr('alt')) ? clean(node.attr('alt')) : undefined) ||
    clean(a.attr('title')) ||
    clean(a.text())

  const img =
    absURL(origin, node.attr('src')) ||
    absURL(origin, node.attr('data-src')) ||
    absURL(origin, pickFromSrcset(node.attr('srcset'))) ||
    pickImage(article, origin)

  return { href, title, img }
}

/** Slovenske novice: velik teaser .article_teaser__article-image--100000 */
function boostSlovenske($: cheerio.CheerioAPI, origin: string): Cand | null {
  const teaser = $('.article_teaser__article-image--100000').first()
  if (!teaser.length) return null
  const article = asC(teaser).closest('article')
  const a = asC(article).find('a[href]').first()
  if (!a.length) return null

  const href = absURL(origin, a.attr('href'))
  const title =
    pickHeadingAround(article) ||
    clean(a.attr('title')) ||
    clean(a.text())
  const img =
    pickImage(article, origin) ||
    pickImage(asC(teaser), origin)

  return href ? { href, title, img } : null
}

/** Delo: .teaser_image background-image, naslov v wrapperju */
function boostDelo($: cheerio.CheerioAPI, origin: string): Cand | null {
  let block = $('.teaser_image').first()
  if (!block.length) block = $('main .teaser_image').first()
  if (!block.length) return null

  const style = block.attr('style') || ''
  const m = style.match(/url\(["']?([^"')]+)["']?\)/)
  const img = m ? absURL(origin, m[1]) : pickImage(asC(block), origin)

  let a = asC(block).closest('a')
  if (!a.length) a = asC(block).closest('article,div,section').find('a[href]').first()
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const wrap = asC(a).closest('article,section,div,main')
  const title =
    pickHeadingAround(wrap) ||
    clean(a.attr('title')) ||
    clean(a.text())

  return { href, title, img }
}

/** Žurnal24: card hero; naslov iz card title/heading */
function boostZurnal($: cheerio.CheerioAPI, origin: string): Cand | null {
  let card = $('article, .card').has('img.card__img').first()
  if (!card.length) card = asC($('img.card__img').first()).closest('article, .card, div')
  if (!card.length) return null

  const a = asC(card).find('a[href]').first()
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const title =
    pickHeadingAround(asC(card)) ||
    clean(a.attr('title')) ||
    clean(a.text()) ||
    clean(asC(card).find('img.card__img').attr('alt'))

  const img =
    pickImage(asC(card), origin) ||
    absURL(origin, asC(card).find('img.card__img').attr('src')) ||
    absURL(origin, pickFromSrcset(asC(card).find('img.card__img').attr('srcset')))

  return { href, title, img }
}

/** N1: hero article; izogibaj se alt "thumbnail" */
function boostN1($: cheerio.CheerioAPI, origin: string): Cand | null {
  let article = $('main article').has('a picture img').first()
  if (!article.length) article = asC($('img.w-full.h-full.object-cover').first()).closest('article')
  if (!article.length) return null

  const a = asC(article).find('a[href]').has('img').first()
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const title =
    pickHeadingAround(asC(article)) ||
    clean(a.attr('title')) ||
    clean(a.text())

  const img =
    pickImage(asC(article), origin) ||
    absURL(origin, asC(article).find('img').attr('src')) ||
    absURL(origin, pickFromSrcset(asC(article).find('img').attr('srcset')))

  return { href, title, img }
}

/** Svet24: prvi hero <article> z <picture> img (ali .object-cover) */
function boostSvet24($: cheerio.CheerioAPI, origin: string): Cand | null {
  let imgEl = $('body > main article a picture img').first()
  if (!imgEl.length) imgEl = $('img.object-cover').first()
  if (!imgEl.length) return null

  const a = asC(imgEl).closest('a')
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const article = asC(a).closest('article,section,div')
  const title =
    pickHeadingAround(asC(article)) ||
    clean(a.attr('title')) ||
    clean(a.text())

  const img =
    absURL(origin, imgEl.attr('src')) ||
    absURL(origin, imgEl.attr('data-src')) ||
    absURL(origin, pickFromSrcset(imgEl.attr('srcset'))) ||
    pickImage(asC(article), origin)

  return { href, title, img }
}

// ---------------- main ----------------

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
