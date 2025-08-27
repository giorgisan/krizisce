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

function cleanText(t?: string) {
  return (t ?? '').replace(/\s+/g, ' ').trim()
}

function pickBest(cands: Candidate[]): Candidate | null {
  if (!cands.length) return null
  cands.sort((a, b) => b.score - a.score)
  return cands[0]
}

/** per-site selektorji za glavni članek */
const BOOST_SELECTORS: Record<string, string> = {
  RTVSLO: 'section.main-story a[href]',
  '24ur': '.article-hero a[href], .main-article a[href]',
  'Siol.net': '.main-article a[href], .hero a[href]',
  Delo: 'article.main a[href], .main-article a[href]',
  Zurnal24: '.main-article a[href], .featured-article a[href]',
  'Slovenske novice': '.main-article a[href], .hero a[href]',
  N1: 'article a[href].c-card', // že lepo dela
  Svet24: '.main-article a[href], .hero a[href]'
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

    /** 1) booster selektor */
    const sel = BOOST_SELECTORS[source]
    if (sel) {
      const a = $(sel).first()
      if (a.length) {
        const href = absURL(origin, a.attr('href'))
        if (href) {
          const title = cleanText(a.text()) || cleanText(a.attr('title'))
          const img = absURL(origin, a.find('img').attr('src') || a.find('img').attr('data-src'))
          return {
            title: title || 'Naslovnica',
            link: href,
            source,
            image: img ?? null,
            contentSnippet: '',
            isoDate: undefined,
            pubDate: undefined,
            publishedAt: undefined
          }
        }
      }
    }

    /** 2) fallback: generične heuristike */
    const candidates: Candidate[] = []
    $('article, section, div').each((i, el) => {
      const $el = $(el)
      const a = $el.find('a[href]').first()
      if (!a.length) return
      const href = absURL(origin, a.attr('href'))
      if (!href) return

      const title =
        cleanText($el.find('h1,h2,h3').first().text()) ||
        cleanText(a.text()) ||
        cleanText(a.attr('title'))

      if (!title) return
      const img = absURL(origin, $el.find('img').attr('src') || $el.find('img').attr('data-src'))
      let score = 0
      const cls = $el.attr('class') ?? ''
      for (const hint of CLASS_HINTS) if (cls.toLowerCase().includes(hint)) score += 10
      if (img) score += 8
      if (title.length > 20) score += 6
      score += Math.max(0, 20 - Math.floor(i / 20))

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
      isoDate: undefined,
      pubDate: undefined,
      publishedAt: undefined
    }
  } catch (e) {
    console.error('scrapeFeatured error', source, e)
    return null
  }
}
