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

function pickHeadingAround($scope: cheerio.Cheerio<any>): string | undefined {
  // poskusi v scope
  const inScope =
    clean($scope.find('h1,h2,h3').first().text()) ||
    clean($scope.find('[class*="title"],[class*="naslov"],[class*="overlay__title"],[class*="card__title"]').first().text())
  if (inScope) return inScope

  // poskusi v sosedstvu
  const parent = $scope.parent()
  const near =
    clean(parent.find('h1,h2,h3').first().text()) ||
    clean(parent.find('[class*="title"],[class*="naslov"],[class*="overlay__title"],[class*="card__title"]').first().text())
  if (near) return near

  // fallback: prvi <a> z daljšim besedilom
  const linkText = clean($scope.find('a[href]').first().text())
  if (linkText && linkText.length > 12) return linkText

  return undefined
}

function pickImage($scope: cheerio.Cheerio<any>, origin: string): string | undefined {
  // navadni <img>
  const img = $scope.find('img').first()
  const fromImg =
    absURL(origin, img.attr('src')) ||
    absURL(origin, img.attr('data-src')) ||
    absURL(origin, img.attr('data-original')) ||
    absURL(origin, pickFromSrcset(img.attr('srcset')))

  if (fromImg) return fromImg

  // <picture><img>
  const picImg = $scope.find('picture img').first()
  const fromPic =
    absURL(origin, picImg.attr('src')) ||
    absURL(origin, picImg.attr('data-src')) ||
    absURL(origin, pickFromSrcset(picImg.attr('srcset')))
  if (fromPic) return fromPic

  // inline background-image
  const styleHolder = $scope.find('[style*="background-image"]').first()
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

  const wrap = a.closest('article,section,div,main')
  const title =
    pickHeadingAround(wrap as any) ||
    (!isBadAlt(a.attr('title')) ? clean(a.attr('title')) : undefined) ||
    clean(a.text())

  const img =
    absURL(origin, a.attr('data-large')) ||
    absURL(origin, (a.attr('data-large-srcset') || '').split(' ')[0]) ||
    pickImage(a as any, origin) ||
    pickImage(wrap as any, origin)

  return { href, title, img }
}

/** 24ur: hero slika .media--splashL, naslov v overlay-u (.card-overlay__title), link v overlay ali parent <a> */
function boost24ur($: cheerio.CheerioAPI, origin: string): Cand | null {
  const imgWrap = $('.media--splashL').first()
  if (!imgWrap.length) return null

  const card = imgWrap.closest('article,div,section')
  let a = card.find('.card-overlay a[href]').first()
  if (!a.length) a = imgWrap.closest('a')
  if (!a.length) a = card.find('a[href]').first()
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  let title =
    clean(card.find('.card-overlay__title, .card__title, h1, h2, h3').first().text())
  if (!title || isBadAlt(title)) {
    title =
      (!isBadAlt(imgWrap.find('img').attr('alt')) ? clean(imgWrap.find('img').attr('alt')) : undefined) ||
      clean(a.text())
  }

  const img =
    pickImage(imgWrap as any, origin) ||
    pickImage(card as any, origin)

  return { href, title, img }
}

/** Siol: fold_intro levi blok ali card hero; naslov iz h1/h2/h3 znotraj article */
function boostSiol($: cheerio.CheerioAPI, origin: string): Cand | null {
  let imgEl = $('body > main .fold_intro__left article a picture img').first()
  if (!imgEl.length) imgEl = $('main article a picture img').first()
  if (!imgEl.length) imgEl = $('img.card__img').first()
  if (!imgEl.length) return null

  const a = imgEl.closest('a')
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const article = a.closest('article,section,div,main')
  const title =
    pickHeadingAround(article as any) ||
    (!isBadAlt(imgEl.attr('alt')) ? clean(imgEl.attr('alt')) : undefined) ||
    clean(a.text())

  const img =
    absURL(origin, imgEl.attr('src')) ||
    absURL(origin, imgEl.attr('data-src')) ||
    absURL(origin, pickFromSrcset(imgEl.attr('srcset'))) ||
    pickImage(article as any, origin)

  return { href, title, img }
}

/** Slovenske novice: velik teaser .article_teaser__article-image--100000 + naslov v članku */
function boostSlovenske($: cheerio.CheerioAPI, origin: string): Cand | null {
  const teaser = $('.article_teaser__article-image--100000').first()
  if (!teaser.length) return null
  const article = teaser.closest('article')
  const a = article.find('a[href]').first()
  if (!a.length) return null

  const href = absURL(origin, a.attr('href'))
  const title =
    pickHeadingAround(article as any) ||
    clean(a.attr('title')) ||
    clean(a.text())
  const img =
    pickImage(article as any, origin) ||
    pickImage(teaser as any, origin)

  return href ? { href, title, img } : null
}

/** Delo: .teaser_image z background-image, naslov v h2/h3 v istem wrapperju */
function boostDelo($: cheerio.CheerioAPI, origin: string): Cand | null {
  let block = $('.teaser_image').first()
  if (!block.length) block = $('main .teaser_image').first()
  if (!block.length) return null

  const style = block.attr('style') || ''
  const m = style.match(/url\(["']?([^"')]+)["']?\)/)
  const img = m ? absURL(origin, m[1]) : pickImage(block as any, origin)

  let a = block.closest('a')
  if (!a.length) a = block.closest('article,div,section').find('a[href]').first()
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const wrap = a.closest('article,section,div,main')
  const title =
    pickHeadingAround(wrap as any) ||
    clean(a.attr('title')) ||
    clean(a.text())

  return { href, title, img }
}

/** Žurnal24: card hero; naslov raje iz card title kot iz img alt */
function boostZurnal($: cheerio.CheerioAPI, origin: string): Cand | null {
  let card = $('article, .card').has('img.card__img').first()
  if (!card.length) card = $('img.card__img').first().closest('article, .card, div')
  if (!card.length) return null

  const a = card.find('a[href]').first()
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const title =
    pickHeadingAround(card as any) ||
    clean(a.attr('title')) ||
    clean(a.text()) ||
    clean(card.find('img.card__img').attr('alt'))

  const img =
    pickImage(card as any, origin) ||
    absURL(origin, card.find('img.card__img').attr('src')) ||
    absURL(origin, pickFromSrcset(card.find('img.card__img').attr('srcset')))

  return { href, title, img }
}

/** N1: prvi hero article; nikoli ne uporabi alt "thumbnail" */
function boostN1($: cheerio.CheerioAPI, origin: string): Cand | null {
  let article = $('main article').has('a picture img').first()
  if (!article.length) article = $('img.w-full.h-full.object-cover').first().closest('article')
  if (!article.length) return null

  const a = article.find('a[href]').has('img').first()
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const title =
    pickHeadingAround(article as any) ||
    clean(a.attr('title')) ||
    clean(a.text())

  const img =
    pickImage(article as any, origin) ||
    absURL(origin, article.find('img').attr('src')) ||
    absURL(origin, pickFromSrcset(article.find('img').attr('srcset')))

  return { href, title, img }
}

/** Svet24: uporabi cheerio selektor, ki si ga poslal; izogni se alt = ime datoteke */
function boostSvet24($: cheerio.CheerioAPI, origin: string): Cand | null {
  let imgEl = $('body > main article a picture img').first()
  if (!imgEl.length) imgEl = $('img.object-cover').first()
  if (!imgEl.length) return null

  const a = imgEl.closest('a')
  const href = absURL(origin, a.attr('href'))
  if (!href) return null

  const article = a.closest('article,section,div')
  const title =
    pickHeadingAround(article as any) ||
    clean(a.attr('title')) ||
    clean(a.text())

  const img =
    absURL(origin, imgEl.attr('src')) ||
    absURL(origin, imgEl.attr('data-src')) ||
    absURL(origin, pickFromSrcset(imgEl.attr('srcset'))) ||
    pickImage(article as any, origin)

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
