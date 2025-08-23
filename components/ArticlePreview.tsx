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

// Kolikšen delež besedila prikažemo
const TEXT_PERCENT = 0.76

function trackClick(source: string, url: string) {
  try {
    const payload = JSON.stringify({ source, url, from: 'preview' })
    const endpoint = '/api/click'
    if ('sendBeacon' in navigator) {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon(endpoint, blob)
    } else {
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true as any })
        .catch(() => {})
    }
  } catch {}
}

function absolutize(raw: string, baseUrl: string): string {
  try { return new URL(raw, baseUrl).toString() } catch { return raw }
}
function imageKeyFromSrc(src: string | null | undefined): string {
  if (!src) return ''
  let pathname = ''
  try {
    const u = new URL(src, typeof location !== 'undefined' ? location.origin : 'http://localhost')
    pathname = u.pathname.toLowerCase()
  } catch {
    pathname = (src.split('#')[0] || '').split('?')[0].toLowerCase()
  }
  pathname = pathname.replace(/(-|\_)?\d{2,4}x\d{2,4}(?=\.)/g, '')
  pathname = pathname.replace(/(-|\_)?\d{2,4}x(?=\.)/g, '')
  pathname = pathname.replace(/-scaled(?=\.)/g, '')
  pathname = pathname.replace(/\.(webp|jpeg)$/g, '.jpg')
  return pathname
}
function basenameStem(pathname: string): string {
  const last = pathname.split('/').pop() || ''
  return last
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/(-|\_)?\d{2,4}x\d{2,4}$/g, '')
    .replace(/(-|\_)?\d{2,4}x$/g, '')
    .replace(/-scaled$/g, '')
}

/** Čiščenje HTML-ja pred prikazom (hitro, robustno) */
function cleanPreviewHTML(html: string, baseUrl: string): string {
  try {
    const wrap = document.createElement('div')
    wrap.innerHTML = html

    // odstrani šum
    wrap.querySelectorAll('noscript,script,style,iframe,form').forEach((n) => n.remove())

    // absolutiziraj <a> in utrdi rel
    wrap.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href')
      if (href) a.setAttribute('href', absolutize(href, baseUrl))
      const rel = (a.getAttribute('rel') || '').split(/\s+/)
      if (!rel.includes('noopener')) rel.push('noopener')
      if (!rel.includes('noreferrer')) rel.push('noreferrer')
      a.setAttribute('rel', rel.join(' ').trim())
    })

    const imgs = Array.from(wrap.querySelectorAll('img'))
    if (imgs.length === 0) return wrap.innerHTML

    // pripravi hero referenco
    const first = imgs[0]
    const firstRaw = first.getAttribute('src') || first.getAttribute('data-src') || ''
    const firstSrcAbs = firstRaw ? absolutize(firstRaw, baseUrl) : ''
    if (firstSrcAbs) first.setAttribute('src', firstSrcAbs)
    first.removeAttribute('data-src')
    first.removeAttribute('srcset'); first.removeAttribute('sizes')
    first.setAttribute('loading', 'lazy')
    first.setAttribute('decoding', 'async')
    first.setAttribute('referrerpolicy', 'no-referrer')

    const firstKey = imageKeyFromSrc(firstSrcAbs || firstRaw)
    const firstStem = basenameStem(firstKey)

    // obdrži prvo pojavitev vsake normalizirane slike
    const seen = new Set<string>()
    wrap.querySelectorAll('img').forEach((img) => {
      const raw = img.getAttribute('src') || img.getAttribute('data-src') || ''
      if (raw) {
        const abs = absolutize(raw, baseUrl)
        img.setAttribute('src', abs)
        img.removeAttribute('data-src')
      }
      img.setAttribute('loading', 'lazy')
      img.setAttribute('decoding', 'async')
      img.setAttribute('referrerpolicy', 'no-referrer')
      img.removeAttribute('srcset'); img.removeAttribute('sizes')

      const key = imageKeyFromSrc(img.getAttribute('src') || '')
      if (!key) return
      if (seen.has(key)) {
        ;(img.closest('figure, picture') || img).remove()
      } else {
        seen.add(key)
      }
    })

    // odstrani prvo kasnejšo sliko s podobnim stemom kot hero
    const rest = Array.from(wrap.querySelectorAll('img')).slice(1)
    for (const img of rest) {
      const raw = img.getAttribute('src') || ''
      const key = imageKeyFromSrc(raw)
      if (!key) continue
      const stem = basenameStem(key)
      const similar =
        stem === firstStem ||
        stem.startsWith(firstStem.slice(0, 8)) ||
        firstStem.startsWith(stem.slice(0, 8))
      if (similar) {
        ;(img.closest('figure, picture') || img).remove()
        break
      }
    }

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
  src.querySelectorAll('header,nav,footer,aside,.share,.social,.related,.tags').forEach((n) => n.remove())
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

  // Naloži → (če je v cache-u, instant) → očisti → trunc → sanitize
  useEffect(() => {
    let alive = true
    const run = async () => {
      setLoading(true); setError(null)
      try {
        // 1) poskusi iz cache-a
        let data = peekPreview(url) as ApiPayload | null
        // 2) če ni, prefetch (de-dupe)
        if (!data) data = await preloadPreview(url)
        if (!alive) return

        if ('error' in data) {
          setError('Napaka pri nalaganju predogleda.'); setLoading(false); return
        }
        setTitle(data.title); setSite(data.site)

        const cleaned = cleanPreviewHTML(data.html, url)
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

  // focus trap + zakleni scroll + globalni anti-underline
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
      {/* trd override za ozadje med modalom */}
      <style>{`
        body.preview-open a,
        body.preview-open a:hover,
        body.preview-open a:focus { text-decoration: none !important; }
        body.preview-open .group:hover { transform: none !important; }
        body.preview-open .group:hover * { text-decoration: none !important; }
      `}</style>

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
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200/20 bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-t-xl">
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
                className="no-underline inline-flex items-center justify-center rounded-lg px-2 py-1 text-sm bg-orange-700/80 text-white hover:bg-amber-600"
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
          <div className="px-4 py-4">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700 animate-zenPulse" />
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}

            {!loading && !error && (
              <div className="prose prose-invert max-w-none prose-img:rounded-lg">
                <div className="relative">
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
                </div>

                <div className="mt-4 flex flex-col items-center gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={openSourceAndTrack}
                    className="no-underline inline-flex justify-center rounded-md px-5 py-2 bg-orange-700/80 text-white text-sm hover:bg-amber-600 whitespace-nowrap"
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
