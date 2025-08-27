// lib/scrapeFeatured.ts
import type { NewsItem } from '@/types'
import { homepages } from './sources'
import * as cheerio from 'cheerio'

const CLASS_HINTS = [
  'hero', 'featured', 'naslovn', 'headline', 'lead', 'main', 'top',
  'aktualno', 'izpostav', 'front', 'big', 'prime'
]

type Candidate = {
  href: string
  title?: string
  img?: string
  score: number
}

function absURL(base: string, href?: string) {
  if (!href) return undefined
  try { return new URL(href, base).toString() } catch { return undefined }
}

function sameHost(a: string, b: string) {
  try {
    const A = new URL(a).hostname.replace(/^www\./, '')
    const B = new URL(b).hostname.replace(/^www\./, '')
    return A === B
  } catch { return false }
}

function scoreByClass(cls: string): number {
  const low = (cls || '').toLowerCase()
  let s = 0
  for (const hint of CLASS_HINTS) if (low.includes(hint)) s += 10
  return s
}

function cleanText(t?: string) {
  return (t ?? '').replace(/\s+/g, ' ').trim()
}

function pickBest(cands: Candidate[]): Candidate | null {
  if (!cands.length) return null
  cands.sort((a, b) => b.score - a.score)
  return cands[0]
}

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
    const candidates: Candidate[] = []

    // 1) Glavni bloki
    $('section, article, div').each((i, el) => {
      const $el = $(el)
      const cls = $el.attr('class') ?? ''
      let score = 0

      score += scoreByClass(cls)

      const titleEl = $el.find('h1, h2, h3').first()
      if (titleEl.length) score += 6

      const imgEl = $el.find('img').first()
      if (imgEl.length) score += 8

      const aEl = $el.find('a[href]').first()
      if (!aEl.length) return
      const href = absURL(origin, aEl.attr('href'))
      if (!href || !sameHost(origin, href)) return
      if (href.startsWith('javascript:') || href.endsWith('#')) return

      const anchorTitle = cleanText(aEl.text())
      if (anchorTitle.length > 20) score += 4

      score += Math.max(0, 20 - Math.floor(i / 20))

      const title =
        cleanText(titleEl.text()) ||
        cleanText($el.find('a[title]').attr('title')) ||
        (anchorTitle.length > 10 ? anchorTitle : undefined)

      let img =
        absURL(origin, imgEl.attr('src')) ||
        absURL(origin, imgEl.attr('data-src')) ||
        absURL(origin, (imgEl.attr('srcset') || '').split(' ')[0])

      if (img && /\.svg($|\?)/i.test(img)) img = undefined

      candidates.push({ href, title, img, score })
    })

    // 2) Veliki <picture> bloki
    $('picture').each((i, el) => {
      const $pic = $(el)
      const aEl = $pic.closest('a[href]')
      if (!aEl.length) return
      const href = absURL(origin, aEl.attr('href'))
      if (!href || !sameHost(origin, href)) return

      const imgEl = $pic.find('img').first()
      let img =
        absURL(origin, imgEl.attr('src')) ||
        absURL(origin, imgEl.attr('data-src')) ||
        absURL(origin, (imgEl.attr('srcset') || '').split(' ')[0])

      const title =
        cleanText(aEl.attr('title')) ||
        cleanText(aEl.text()) ||
        cleanText($pic.closest('section,article,div').find('h1,h2,h3').first().text())

      const cls = ($pic.closest('section,article,div').attr('class')) ?? ''
      let score = 12 + scoreByClass(cls) + Math.max(0, 15 - Math.floor(i / 10))
      if (title) score += 6
      if (img) score += 6

      candidates.push({ href, title, img, score })
    })

    const best = pickBest(candidates)
    if (!best) return null

    const item: NewsItem = {
      title: best.title || 'Naslovnica',
      link: best.href,
      source,
      image: best.img ?? null,
      contentSnippet: '',
      isoDate: undefined,
      pubDate: undefined,
      publishedAt: undefined
    }
    return item
  } catch (e) {
    console.error('scrapeFeatured error', source, e)
    return null
  }
}
