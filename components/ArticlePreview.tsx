'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import DOMPurify from 'dompurify'

interface Props {
  url: string
  onClose: () => void
}

type ApiPayload =
  | { error: string }
  | { title: string; site: string; image?: string | null; html: string; url: string }

/** Absolutizira URL glede na osnovni URL članka */
function absolutize(raw: string, baseUrl: string): string {
  try {
    return new URL(raw, baseUrl).toString()
  } catch {
    return raw
  }
}

/** Normaliziran ključ za sliko (odreži query/hash, odstrani “size suffixe”, .webp/.jpeg → .jpg). */
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

/** “Stem” zadnjega segmenta poti (brez končnice), očiščen suffixev. */
function basenameStem(pathname: string): string {
  const last = pathname.split('/').pop() || ''
  const name = last
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/(-|\_)?\d{2,4}x\d{2,4}$/g, '')
    .replace(/(-|\_)?\d{2,4}x$/g, '')
    .replace(/-scaled$/g, '')
  return name
}

/**
 * Čiščenje HTML-ja pred prikazom:
 * - odstrani <noscript>, <script>, <style>, <iframe>, <form>
 * - absolutizira relativne URL-je
 * - lazy-load za <img>, odstrani srcset/sizes
 * - odstrani duplikate slik (z istim normaliziranim ključem)
 * - dodatno: odstrani prvo “poznejšo” sliko s podobnim stemom kot hero
 * - harden za <a>: doda rel="noopener noreferrer"
 */
function cleanPreviewHTML(html: string, baseUrl: string): string {
  try {
    const wrap = document.createElement('div')
    wrap.innerHTML = html

    // noise stran
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
    first.removeAttribute('srcset')
    first.removeAttribute('sizes')
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
      img.removeAttribute('srcset')
      img.removeAttribute('sizes')

      const key = imageKeyFromSrc(img.getAttribute('src') || '')
      if (!key) return
      if (seen.has(key)) {
        ;(img.closest('figure, picture') || img).remove()
      } else {
        seen.add(key)
      }
    })

    // odstrani prvo kasnejšo sliko z istim “stemom” kot hero
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

/**
 * Trunkacija po količini TEKSTA (~percent), da hero slika ostane in se ne reže sredi odstavka.
 * Ohrani DOM do tistega bloka, kjer se doseže prag; preostanek odstrani.
 */
function truncateHTMLByTextPercent(html: string, percent = 0.76): string {
  const root = document.createElement('div')
  root.innerHTML = html

  // odstrani očitne ne-vsebinske bloke
  root.querySelectorAll('header,nav,footer,aside,.share,.social,.related,.tags').forEach((n) => n.remove())

  const blocks = Array.from(
    root.querySelectorAll(
      // vrstni red po dokumentu
      'article, section, p, li, blockquote, h1, h2, h3, h4, pre, table, dl, ol, ul, figure, div'
    )
  ).filter((el) => {
    const txt = (el.textContent || '').trim()
    return txt.length > 0 // slike (figure) z 0 teksta ne vplivajo na % in zato ostanejo
  })

  const total = blocks.reduce((sum, el) => sum + ((el.textContent || '').trim().length), 0)
  if (total === 0) return root.innerHTML

  const target = Math.max(1, Math.floor(total * percent))
  let acc = 0
  let cutoff: Element | null = null

  for (const el of blocks) {
    acc += ((el.textContent || '').trim().length)
    if (acc >= target) {
      cutoff = el
      break
    }
  }

  if (!cutoff) return root.innerHTML

  // izbriši vse po "cutoff" (v dokumentarnem vrstnem redu), ničesar ne režemo sredi odstavka
  const range = document.createRange()
  const last = root.lastChild
  if (last) {
    range.setStartAfter(cutoff)
    range.setEndAfter(last)
    range.deleteContents()
  }

  return root.innerHTML
}

export default function ArticlePreview({ url, onClose }: Props) {
  const [content, setContent] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [site, setSite] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // naloži → očisti → semantično skrajšaj → sanitiziraj
  useEffect(() => {
    let alive = true
    const fetchContent = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`)
        const data: ApiPayload = await res.json()
        if (!alive) return
        if ('error' in data) {
          setError('Napaka pri nalaganju predogleda.')
          setLoading(false)
          return
        }
        const cleaned = cleanPreviewHTML(data.html, url)
        const truncated = truncateHTMLByTextPercent(cleaned, 0.76) // ~70–80 %
        setTitle(data.title)
        setSite(data.site)
        setContent(DOMPurify.sanitize(truncated))
        setLoading(false)
      } catch {
        if (!alive) return
        setError('Napaka pri nalaganju predogleda.')
        setLoading(false)
      }
    }
    fetchContent()
    return () => {
      alive = false
    }
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
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
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

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Trd override, da v ozadju NI podčrtav in hover efektov, ko je modal odprt */}
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
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
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
                className="no-underline inline-flex items-center justify-center rounded-lg px-2 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700"
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
                <div>
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                  {/* Fade pri dnu za vizualni namig */}
                  <div className="pointer-events-none mt-2 h-16 -translate-y-16 bg-gradient-to-t from-gray-900 to-transparent" />
                </div>

                {/* CTA brez dodatne opombe */}
                <div className="mt-2 flex justify-end">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline inline-flex items-center justify-center rounded-md px-3 py-2 bg-blue-600 text-white text-sm hover:bg-blue-700"
                  >
                    Za ogled celotnega članka, obiščite spletno stran
                  </a>
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
