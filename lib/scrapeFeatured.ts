// lib/scrapeFeatured.ts
import type { NewsItem } from '@/types'
import { homepages } from './sources'
import * as cheerio from 'cheerio'

const absURL = (base: string, href?: string) => {
  if (!href) return undefined
  try { return new URL(href, base).toString() } catch { return undefined }
}
const clean = (t?: string) => (t ?? '').replace(/\s+/g, ' ').trim()

type Candidate = { href: string; title?: string; img?: string }

// ————————————————————— BOOST PER SITE —————————————————————

function boostRTV($: cheerio.CheerioAPI, origin: string): Candidate | null {
  const a = $('a.image-link.image-container').filter((_, el) =>
    /\d{6,}/.test($(el).attr('href') || '')
  ).first()
  if (!a.length) return null
  return {
    href: absURL(origin, a.attr('href'))!,
    title: clean(a.attr('title')) || clean(a.text()),
    img: a.attr('data-large') || a.find('img').attr('src'),
  }
}

function boost24ur($: cheerio.CheerioAPI, origin: string): Candidate | null {
  const wrap = $('.media--splashL').first()
  const img = wrap.find('img').attr('src')
  const title = clean(wrap.find('img').attr('alt'))
  const href = wrap.closest('a').attr('href')
  if (!href || !img) return null
  return { href: absURL(origin, href)!, title, img: absURL(origin, img) }
}

function boostSiol($: cheerio.CheerioAPI, origin: string): Candidate | null {
  const img = $('img.card__img').first()
  if (!img.length) return null
  const title = clean(img.attr('alt'))
  const href = img.closest('a').attr('href')
  return href ? { href: absURL(origin, href)!, title, img: absURL(origin, img.attr('src')) } : null
}

function boostSlovenske($: cheerio.CheerioAPI, origin: string): Candidate | null {
  const block = $('.article_teaser__article-image--100000').first().closest('a')
  if (!block.length) return null
  const href = block.attr('href')
  const title = clean(block.attr('title') || block.text())
  const img = block.find('img').attr('src')
  return href ? { href: absURL(origin, href)!, title, img: absURL(origin, img) } : null
}

function boostDelo($: cheerio.CheerioAPI, origin: string): Candidate | null {
  const div = $('.teaser_image').first()
  const bg = div.attr('style') || ''
  const m = bg.match(/url\(&quot;([^&]+)&quot;\)/) || bg.match(/url\(([^)]+)\)/)
  const img = m ? m[1] : undefined
  const wrap = div.closest('a')
  const href = wrap.attr('href')
  const title = clean(wrap.attr('title') || wrap.text())
  return href ? { href: absURL(origin, href)!, title, img } : null
}

function boostZurnal($: cheerio.CheerioAPI, origin: string): Candidate | null {
  const img = $('img.card__img').first()
  if (!img.length) return null
  const title = clean(img.attr('alt'))
  const href = img.closest('a').attr('href')
  return href ? { href: absURL(origin, href)!, title, img: absURL(origin, img.attr('src')) } : null
}

function boostN1($: cheerio.CheerioAPI, origin: string): Candidate | null {
  const img = $('img.w-full.h-full.object-cover').first()
  if (!img.length) return null
  const title = clean(img.attr('alt'))
  const href = img.closest('a').attr('href')
  return href ? { href: absURL(origin, href)!, title, img: absURL(origin, img.attr('src')) } : null
}

function boostSvet24($: cheerio.CheerioAPI, origin: string): Candidate | null {
  const img = $('img.object-cover').first()
  if (!img.length) return null
  const title = clean(img.attr('alt'))
  const href = img.closest('a').attr('href')
  return href ? { href: absURL(origin, href)!, title, img: absURL(origin, img.attr('src')) } : null
}

// ————————————————————— MAIN —————————————————————

export async function scrapeFeatured(source: string): Promise<NewsItem | null> {
  const homepage = homepages[source]
  if (!homepage) return null

  try {
    const res = await fetch(homepage, {
      headers: { 'User-Agent': 'Mozilla/5.0 (KrizisceBot/1.0)' },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`fetch ${source} homepage failed`)
    const html = await res.text()
    const $ = cheerio.load(html)
    const origin = new URL(homepage).origin

    let c: Candidate | null = null
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

    if (c && c.href) {
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
    }

    return null
  } catch (e) {
    console.error('scrapeFeatured error', source, e)
    return null
  }
}
