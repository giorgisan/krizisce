import type { NextApiRequest, NextApiResponse } from 'next'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import createDOMPurify from 'dompurify'

type PreviewResponse =
  | { error: string }
  | {
      title: string
      site: string
      image?: string | null
      html: string
      url: string
    }

/**
 * VARNOST: Whitelist dovoljenih domen.
 * Strežnik bo zavrnil vse zahtevke, ki niso na tem seznamu.
 * To preprečuje SSRF (Server-Side Request Forgery) napade.
 */
const ALLOWED_DOMAINS = [
  'rtvslo.si', 'www.rtvslo.si',
  '24ur.com', 'www.24ur.com',
  'siol.net', 'www.siol.net',
  'slovenskenovice.si', 'www.slovenskenovice.si',
  'slovenskenovice.delo.si', 'www.slovenskenovice.delo.si',
  'old.slovenskenovice.si',
  'delo.si', 'www.delo.si',
  'dnevnik.si', 'www.dnevnik.si',
  'zurnal24.si', 'www.zurnal24.si',
  'svet24.si', 'novice.svet24.si', 'www.svet24.si',
  'n1info.si', 'www.n1info.si',
  'metropolitan.si', 'www.metropolitan.si',
  'vecer.com', 'www.vecer.com',
  'primorske.si', 'www.primorske.si',
  // Lokalno testiranje
  'localhost'
]

function getMeta(dom: JSDOM, name: string) {
  const doc = dom.window.document
  return (
    doc.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
    doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ||
    null
  )
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PreviewResponse>
) {
  const { url } = req.query
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' })
    return
  }

  // --- VARNOSTNI PREGLED (Fix za SSRF) ---
  try {
    const parsedUrl = new URL(url)
    // Preverimo, če je hostname na seznamu dovoljenih
    if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
      console.warn(`[Security] Blocked unauthorized preview attempt: ${parsedUrl.hostname}`)
      res.status(403).json({ error: 'Vir ni dovoljen (Unauthorized source)' })
      return
    }
  } catch (e) {
    res.status(400).json({ error: 'Invalid URL format' })
    return
  }
  // ----------------------------------------

  // Edge cache: 5 min sveže + 10 min stale
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  try {
    // 8s timeout je dovolj za preview
    const ac = new AbortController()
    const to = setTimeout(() => ac.abort(), 8000)

    // Lažni User-Agent in headerji, da izgledamo kot pravi Chrome brskalnik
    const FAKE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    const response = await fetch(url, {
      signal: ac.signal,
      headers: {
        'User-Agent': FAKE_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'sl-SI,sl;q=0.9,en-GB;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      },
      redirect: 'follow',
      cache: 'no-store',
    }).finally(() => clearTimeout(to))

    if (!response.ok) {
      res.status(500).json({ error: `Failed to fetch preview (${response.status})` })
      return
    }

    const html = await response.text()
    const dom = new JSDOM(html, { url }) // pomembno za absolutne poti
    const doc = dom.window.document

    // Readability
    const reader = new Readability(doc)
    const article = reader.parse()

    // Meta + fallbacki
    const ogTitle = getMeta(dom, 'og:title')
    const ogSite = getMeta(dom, 'og:site_name')
    const ogImageRaw = getMeta(dom, 'og:image') || getMeta(dom, 'twitter:image')
    const ogImage = ogImageRaw ? new URL(ogImageRaw, url).toString() : null

    const title = (article?.title || ogTitle || doc.title || 'Predogled').trim()
    const site = (ogSite || new URL(url).hostname.replace(/^www\./, '') || 'Vir').trim()

    // Vsebina: Readability → <article> → <body> fallback
    const rawContent =
      article?.content ||
      doc.querySelector('article')?.innerHTML ||
      doc.body.innerHTML

    // SANITIZE (SSR) — JSDOM window pretvorimo v any, da rešimo TS WindowLike
    const DOMPurify = createDOMPurify(dom.window as unknown as any)

    const clean = DOMPurify.sanitize(rawContent, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'noscript'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
      ADD_ATTR: ['target', 'rel', 'loading', 'decoding', 'referrerpolicy'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:image\/))/i,
    })

    // Absolutizacija <img> in <a> + osnovna optimizacija
    const wrap = new JSDOM(`<div id="__preview_root">${clean}</div>`, { url })
    const wdoc = wrap.window.document

    wdoc.querySelectorAll<HTMLImageElement>('img[src]').forEach((img) => {
      try {
        img.src = new URL(img.getAttribute('src')!, url).toString()
        img.setAttribute('loading', 'lazy')
        img.setAttribute('decoding', 'async')
        img.setAttribute('referrerpolicy', 'no-referrer')
        img.removeAttribute('srcset')
        img.removeAttribute('sizes')
      } catch {}
    })

    wdoc.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
      try {
        a.href = new URL(a.getAttribute('href')!, url).toString()
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
      } catch {}
    })

    const cleanedHTML = wdoc.getElementById('__preview_root')?.innerHTML || ''

    // Minimalen, berljiv templating za preview (lahko kasneje “teme po domenah”)
    const finalHTML = `
      <article class="preview-article">
        ${ogImage ? `<img class="preview-cover" src="${ogImage}" alt="" />` : ''}
        <h1 class="preview-title">${title}</h1>
        <div class="preview-meta">${site}</div>
        <div class="preview-content">${cleanedHTML}</div>
      </article>
      <style>
        .preview-article { line-height: 1.6; font-size: 16px; }
        .preview-title { font-size: 1.4rem; font-weight: 700; margin: .25rem 0 .5rem; }
        .preview-meta { font-size: .85rem; opacity: .75; margin-bottom: .75rem; }
        .preview-cover { width: 100%; height: auto; border-radius: .5rem; display:block; margin-bottom: .75rem; }
        .preview-content p { margin: .5rem 0; }
        .preview-content img { max-width: 100%; height: auto; border-radius: .375rem; }
        .preview-content figure { margin: .75rem 0; }
        .preview-content h1, .preview-content h2, .preview-content h3 { margin: .75rem 0 .25rem; line-height: 1.25; }
        .preview-content ul, .preview-content ol { padding-left: 1.25rem; margin: .5rem 0; }
        .preview-content blockquote { margin: .75rem 0; padding-left: .75rem; border-left: 3px solid #ccc; opacity: .9; }
        a { text-decoration: underline; }
      </style>
    `

    res.status(200).json({
      title,
      site,
      image: ogImage,
      html: finalHTML,
      url,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch preview' })
  }
}