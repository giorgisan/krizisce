// lib/scrapeFeatured.ts
import { homepages } from './sources'
import type { NewsItem } from '@/types'

type JsonLd = any

function first<T>(arr: T[] | T | undefined | null): T | null {
  if (!arr) return null
  return Array.isArray(arr) ? (arr.length ? arr[0] : null) : (arr as T)
}

function pickString(x: any): string | undefined {
  if (!x) return undefined
  if (typeof x === 'string') return x
  if (Array.isArray(x)) {
    const s = x.find((v) => typeof v === 'string')
    return typeof s === 'string' ? s : undefined
  }
  if (typeof x === 'object') {
    // image can be { url: "..."} or { "@type": "ImageObject", "url": "..." }
    if (typeof x.url === 'string') return x.url
  }
  return undefined
}

function findNewsArticleFromGraph(obj: any): any | null {
  if (!obj) return null
  // @graph array
  const graph = Array.isArray(obj['@graph']) ? obj['@graph'] : null
  if (graph) {
    const candidate = graph.find((n: any) => {
      const t = n['@type']
      return t === 'NewsArticle' || (Array.isArray(t) && t.includes('NewsArticle'))
    })
    if (candidate) return candidate
  }
  // object itself
  const t = obj['@type']
  if (t === 'NewsArticle' || (Array.isArray(t) && t.includes('NewsArticle'))) return obj
  // array of things
  if (Array.isArray(obj)) {
    const item = obj.find((n) => {
      const tt = n?.['@type']
      return tt === 'NewsArticle' || (Array.isArray(tt) && tt.includes('NewsArticle'))
    })
    if (item) return item
  }
  return null
}

export async function scrapeFeatured(source: string): Promise<NewsItem | null> {
  const homepage = homepages[source]
  if (!homepage) return null

  try {
    const res = await fetch(homepage, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; KriZisceBot/1.0; +https://krizisce.si)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`fetch homepage ${source} failed`)
    const html = await res.text()

    // izvleci vsa JSON-LD polja
    const scripts: string[] = []
    const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      scripts.push(m[1])
    }

    for (const raw of scripts) {
      try {
        const json: JsonLd = JSON.parse(raw.trim())
        const art = findNewsArticleFromGraph(json)
        if (!art) continue

        const title = pickString(art.headline) || pickString(art.name)
        const url = pickString(art.url) || pickString(art.mainEntityOfPage)
        const img =
          pickString(art.image) ||
          pickString(art.thumbnailUrl) ||
          pickString(art.primaryImageOfPage)

        if (title && url) {
          const iso = pickString(art.datePublished) || pickString(art.dateModified)
          const item: NewsItem = {
            title,
            link: url,
            source,
            image: img ?? null,
            contentSnippet: pickString(art.description) ?? '',
            isoDate: iso ? new Date(iso).toISOString() : undefined,
            pubDate: iso,
            publishedAt: iso ? Date.parse(iso) : undefined,
          }
          return item
        }
      } catch {
        // ignoriraj posamezni <script>, poskusi naslednjega
      }
    }

    return null
  } catch (e) {
    console.error('scrapeFeatured error', source, e)
    return null
  }
}
