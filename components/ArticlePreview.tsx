// components/ArticlePreview.tsx
'use client'

import { useEffect, useRef, useState, MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import DOMPurify from 'dompurify'
import { preloadPreview, peekPreview } from '@/lib/previewPrefetch'

interface Props { url: string; onClose: () => void }

type ApiPayload =
  | { error: string }
  | { title: string; site: string; image?: string | null; html: string; url: string }

const TEXT_PERCENT = 0.80

const PREVIEW_TYPO_CSS = `
  .preview-typo { font-size: 0.98rem; line-height: 1.68; }
  .preview-typo > *:first-child { margin-top: 0 !important; }
  .preview-typo p { margin: 0.55rem 0 0.9rem; }
  .preview-typo h1, .preview-typo h2, .preview-typo h3, .preview-typo h4 {
    margin: 1.05rem 0 0.35rem; line-height: 1.25;
  }
  .preview-typo ul, .preview-typo ol { margin: 0.6rem 0 0.9rem; padding-left: 1.25rem; }
  .preview-typo li { margin: 0.25rem 0; }
  .preview-typo img, .preview-typo figure, .preview-typo video {
    display:block; max-width:100%; height:auto; border-radius:12px; margin:0.65rem 0 0.9rem;
  }
  .preview-typo figure > img { margin-bottom: 0.4rem; }
  .preview-typo figcaption { font-size: 0.82rem; opacity: .75; margin-top: -0.2rem; }
  .preview-typo blockquote {
    margin: 0.9rem 0; padding: 0.25rem 0 0.25rem 0.9rem;
    border-left: 3px solid rgba(255,255,255,.15); opacity: .95;
  }
  .preview-typo hr { margin: 1.1rem 0; opacity: .25; }
  .preview-typo a { text-decoration: underline; text-underline-offset: 2px; }
`

function trackClick(source: string, url: string) {
  try {
    const payload = JSON.stringify({ source, url, from: 'preview' })
    const endpoint = '/api/click'
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }))
    } else {
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true as any })
        .catch(() => {})
    }
  } catch {}
}

/** Absolutizira URL (podpira tudi protokol-relativne //...). */
function absolutize(raw: string, baseUrl: string): string {
  try {
    const fixed = raw.startsWith('//') ? (new URL(baseUrl).protocol + raw) : raw
    return new URL(fixed, baseUrl).toString()
  } catch { return raw }
}

/** Ime datoteke iz src (brez poti in razširitve). */
function filenameStem(src: string): string {
  const clean = (src.split('#')[0] || '').split('?')[0]
  const last = clean.split('/').pop() || ''
  return last
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/(-|_)?\d{2,4}x\d{2,4}$/i, '')
    .replace(/(-|_)?\d{2,4}x$/i, '')
    .replace(/@2x$/i, '')
    .replace(/-scaled$/i, '')
    .toLowerCase()
}

/** “Fingerprint” brez številk in ločil, za mehkejše ujemanje. */
function softFingerprint(stem: string): string {
  return stem.replace(/[^a-z]+/g, '')
}

/** Najdaljši skupni prefiks (za hitro primerjavo podobnosti). */
function lcp(a: string, b: string): number {
  const n = Math.min(a.length, b.length)
  let i = 0
  while (i < n && a[i] === b[i]) i++
  return i
}

/** Čiščenje: absolutiziraj URL-je, utrdi rel, odstrani dvojnike slik (natančno + mehko ujemanje). */
function cleanPreviewHTML(html: string, baseUrl: string, knownTitle?: string): string {
  try {
    const wrap = document.createElement('div')
    wrap.innerHTML = html

    wrap.querySelectorAll('noscript,script,style,iframe,form').forEach(n => n.remove())

    // podvojen naslov?
    if (knownTitle) {
      const h = wrap.querySelector('h1, h2, h3')
      if (h) {
        const a = (h.textContent || '').trim().toLowerCase()
        const b = knownTitle.trim().toLowerCase()
        if (a && a === b) h.remove()
      }
    }

    // povezave
    wrap.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href')
      if (href) a.setAttribute('href', absolutize(href, baseUrl))
      const rel = (a.getAttribute('rel') || '').split(/\s+/)
      if (!rel.includes('noopener')) rel.push('noopener')
      if (!rel.includes('noreferrer')) rel.push('noreferrer')
      a.setAttribute('rel', rel.join(' ').trim())
      a.setAttribute('target', '_blank')
    })

    // slike
    const imgs = Array.from(wrap.querySelectorAll<HTMLImageElement>('img'))
    if (!imgs.length) return wrap.innerHTML

    // prvi (hero)
    const first = imgs[0]
    const firstRaw = first.getAttribute('src') || first.getAttribute('data-src') || first.getAttribute('data-original') || ''
    const firstAbs = firstRaw ? absolutize(firstRaw, baseUrl) : ''
    if (firstAbs) first.setAttribute('src', firstAbs)
    first.removeAttribute('data-src'); first.removeAttribute('data-original')
    first.removeAttribute('srcset'); first.removeAttribute('sizes')
    first.setAttribute('loading', 'lazy'); first.setAttribute('decoding', 'async')
    first.setAttribute('referrerpolicy', 'no-referrer')

    const firstStem = filenameStem(firstAbs || firstRaw)
    const firstSoft = softFingerprint(firstStem)

    // zabeleži natančne ključe tudi za ostale
    const seenExact = new Set<string>()
    if (firstAbs) seenExact.add(firstAbs.split('#')[0].split('?')[0].toLowerCase())

    wrap.querySelectorAll('img').forEach((img, idx) => {
      // absolutiziraj + standardni atributi
      const raw = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original') || ''
      if (raw) img.setAttribute('src', absolutize(raw, baseUrl))
      img.removeAttribute('data-src'); img.removeAttribute('data-original')
      img.removeAttribute('srcset'); img.removeAttribute('sizes')
      img.setAttribute('loading', 'lazy'); img.setAttribute('decoding', 'async')
      img.setAttribute('referrerpolicy', 'no-referrer')

      const srcAbs = img.getAttribute('src') || ''
      if (!srcAbs) return

      const exactKey = srcAbs.split('#')[0].split('?')[0].toLowerCase()
      const stem = filenameStem(srcAbs)
      const soft = softFingerprint(stem)

      // Natančen duplikat?
      if (idx > 0 && (seenExact.has(exactKey))) {
        ;(img.closest('figure, picture') || img).remove()
        return
      }
      seenExact.add(exactKey)

      // Mehko ujemanje s prvim (istega imena/crop variacije/cache poti)
      if (idx > 0) {
        const pref = lcp(soft, firstSoft)
        const similarity = (pref / Math.max(1, Math.max(soft.length, firstSoft.length)))
        if (stem === firstStem || similarity >= 0.7) {
          ;(img.closest('figure, picture') || img).remove()
        }
      }
    })

    return wrap.innerHTML
  } catch {
    return html
  }
}

function wordSpans(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = []
  const re =
    /[A-Za-z0-9À-ÖØ-öø-ÿĀ-žČŠŽčšžĆćĐđ]+(?:['’-][A-Za-z0-9À-ÖØ-öø-ÿĀ-žČŠŽčšžĆćĐđ]+)*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) spans.push({ start: m.index, end: m.index + m[0].length })
  return spans
}
function countWords(text: string): number { return wordSpans(text).length }

function truncateHTMLByWordsPercent(html: string, percent = 0.76): string {
  const src = document.createElement('div'); src.innerHTML = html
  src.querySelectorAll('header,nav,footer,aside,.share,.social,.related,.tags').forEach(n => n.remove())
  const out = src.cloneNode(true) as HTMLDivElement

  const totalWords = countWords(out.textContent || '')
  if (totalWords === 0) return out.innerHTML
  const target = Math.max(1, Math.floor(totalWords * percent))
  let used = 0
  const walker = document.createTreeWalker(out, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()

  while (node) {
    const text = node.textContent || ''
    const trimmed = text.trim()
    if (!trimmed) { node = walker.nextNode(); continue }

    const spans = wordSpans(text)
    const localWords = spans.length
    const remain = target - used

    if (localWords <= remain) { used += localWords; node = walker.nextNode(); continue }

    const cutoffSpan = spans[Math.max(0, remain - 1)]
    const cutoffIndex = cutoffSpan ? cutoffSpan.end : 0
    ;(node as Text).textContent = text.slice(0, cutoffIndex).trimEnd()

    const range = document.createRange()
    range.setStartAfter(node)
    const last = out.lastChild
    if (last) { range.setEndAfter(last); range.deleteContents() }
    break
  }
  return out.innerHTML
}

export default function ArticlePreview({ url, onClose }: Props) {
  const [content, setContent] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [site, setSite] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // cache-first → clean → trunc → sanitize
  useEffect(() => {
    let alive = true
    const run = async () => {
      setLoading(true); setError(null)
      try {
        let data = peekPreview(url) as ApiPayload | null
        if (!data) data = await preloadPreview(url)
        if (!alive) return

        if ('error' in data) {
          setError('Napaka pri nalaganju predogleda.'); setLoading(false); return
        }
        setTitle(data.title); setSite(data.site)

        const cleaned = cleanPreviewHTML(data.html, url, data.title)
        const truncated = truncateHTMLByWordsPercent(cleaned, TEXT_PERCENT)
        setContent(DOMPurify.sanitize(truncated))
        setLoading(false)
      } catch {
        if (!alive) return
        setError('Napaka pri nalaganju predogleda.'); setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [url])

  // fokus trap + lock scroll + anti-underline v ozadju
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]; const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open', 'preview-open')
    setTimeout(() => closeRef.current?.focus(), 0)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
      document.body.classList.remove('modal-open', 'preview-open')
    }
  }, [onClose])

  const openSourceAndTrack = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const source = site || (() => { try { return new URL(url).hostname } catch { return 'unknown' } })()
    trackClick(source, url)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <style>{`
        body.preview-open a,
        body.preview-open a:hover,
        body.preview-open a:focus { text-decoration: none !important; }
        body.preview-open .group:hover { transform: none !important; }
        body.preview-open .group:hover * { text-decoration: none !important; }
      `}</style>
      <style>{PREVIEW_TYPO_CSS}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 transition-opacity duration-300"
        role="dialog"
        aria-modal="true"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          ref={modalRef}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto border border-gray-200/10 transform transition-all duration-300 ease-out scale-95 opacity-0 animate-fadeInUp"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200/20 bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-t-xl">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{site}</div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {title || 'Predogled'}
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={openSourceAndTrack}
                className="no-underline inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm bg-orange-300 text-white hover:bg-amber-600"
              >
                Odpri cel članek
              </a>
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Zapri predogled"
                className="inline-flex h-8 px-2 items-center justify-center rounded-lg text-sm bg-gray-100/70 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-5">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700 animate-zenPulse" />
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}

            {!loading && !error && (
              <div className="preview-typo max-w-none text-gray-900 dark:text-gray-100">
                <div className="relative">
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
                </div>

                <div className="mt-5 flex flex-col items-center gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={openSourceAndTrack}
                    className="no-underline inline-flex justify-center rounded-md px-5 py-2 dark:bg-gray-700 text-white text-sm dark:hover:bg-gray-600 whitespace-nowrap"
                  >
                    Za ogled celotnega članka, obiščite spletno stran
                  </a>

                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex justify-center rounded-md px-4 py-2 bg-gray-100/80 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm"
                  >
                    Zapri predogled
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
