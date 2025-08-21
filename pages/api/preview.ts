// pages/api/preview.ts
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

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'sl-SI,sl;q=0.9,en-US;q=0.8,en;q=0.7',
        Accept: 'text/html,*/*',
      },
      // nekaj strani je občutljivih – 8s timeout je dovolj za preview
      cache: 'no-store',
      redirect: 'follow',
    })

    if (!response.ok) {
      res.status(500).json({ error: `Failed to fetch preview (${response.status})` })
      return
    }

    const html = await response.text()
    const dom = new JSDOM(html, { url }) // pomembno za absolutne/relativne URL-je
    const doc = dom.window.document

    // Poskusi z Readability (izvleče naslov, vsebino, byline ipd.)
    const reader = new Readability(doc)
    const article = reader.parse()

    // Osnovne meta info (fallbacki)
    const ogTitle = getMeta(dom, 'og:title')
    const ogSite = getMeta(dom, 'og:site_name')
    const ogImage = getMeta(dom, 'og:image') || getMeta(dom, 'twitter:image')
    const title = (article?.title || ogTitle || doc.title || 'Predogled').trim()
    const site =
      ogSite ||
      new URL(url).hostname.replace(/^www\./, '') ||
      'Vir'

    // Če Readability spodleti, vzemi glavni <article> ali body kot fallback
    const rawContent =
      article?.content ||
      doc.querySelector('article')?.innerHTML ||
      doc.body.innerHTML

    // Očisti (brez skript, inline-eventov ipd.)
    const DOMPurify = createDOMPurify(dom.window as any)
    const clean = DOMPurify.sanitize(rawContent, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'style'], // stil bomo dodali mi
      ADD_ATTR: ['target', 'rel'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:image\/))/i,
    })

    // Absolutiziraj relativne slike in linke
    const wrap = new JSDOM(`<div id="__preview_root">${clean}</div>`, { url })
    wrap.window.document
      .querySelectorAll<HTMLImageElement>('img[src]')
      .forEach((img) => {
        try {
          img.src = new URL(img.getAttribute('src')!, url).toString()
          img.loading = 'lazy'
          img.decoding = 'async'
        } catch {}
      })
    wrap.window.document
      .querySelectorAll<HTMLAnchorElement>('a[href]')
      .forEach((a) => {
        try {
          a.href = new URL(a.getAttribute('href')!, url).toString()
          a.target = '_blank'
          a.rel = 'noopener noreferrer'
        } catch {}
      })

    const cleanedHTML =
      wrap.window.document.getElementById('__preview_root')?.innerHTML || ''

    // Minimalen, berljiv templating za preview
    const finalHTML = `
      <article class="preview-article">
        ${ogImage ? `<img class="preview-cover" src="${ogImage}" alt="" />` : ''}
        <h1 class="preview-title">${title}</h1>
        <div class="preview-meta">${site}</div>
        <div class="preview-content">${cleanedHTML}</div>
      </article>
      <style>
        .preview-article { line-height: 1.6; font-size: 16px; }
        .preview-title { font-size: 1.4rem; font-weight: 700; margin: 0.25rem 0 0.5rem; }
        .preview-meta { font-size: 0.85rem; opacity: 0.75; margin-bottom: 0.75rem; }
        .preview-cover { width: 100%; height: auto; border-radius: 0.5rem; display:block; margin-bottom: 0.75rem; }
        .preview-content p { margin: 0.5rem 0; }
        .preview-content img { max-width: 100%; height: auto; border-radius: 0.375rem; }
        .preview-content figure { margin: 0.75rem 0; }
        .preview-content h1, .preview-content h2, .preview-content h3 {
          margin: 0.75rem 0 0.25rem; line-height: 1.25;
        }
        .preview-content ul, .preview-content ol { padding-left: 1.25rem; margin: 0.5rem 0; }
        .preview-content blockquote {
          margin: 0.75rem 0; padding-left: 0.75rem; border-left: 3px solid #ccc; opacity: .9;
        }
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
