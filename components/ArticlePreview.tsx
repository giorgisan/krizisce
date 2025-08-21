// components/ArticlePreview.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import DOMPurify from 'dompurify'

type ApiPayload =
  | { error: string }
  | { title?: string; site?: string; image?: string | null; html: string; url: string }

type Props = {
  url: string
  onClose: () => void
}

/** Normaliziraj src (odstrani query/hash, naredi absolutno pot) */
function normalizeSrc(src?: string | null): string {
  if (!src) return ''
  try {
    const u = new URL(src, location.origin)
    return (u.origin + u.pathname).toLowerCase()
  } catch {
    return src.split(/[?#]/)[0].toLowerCase()
  }
}

/** Odstrani <noscript> fallbacke in podvojene slike po enakem src */
function cleanPreviewHTML(html: string): string {
  try {
    const wrap = document.createElement('div')
    wrap.innerHTML = html

    // 1) <noscript> pogosto vsebuje kopijo prve slike
    wrap.querySelectorAll('noscript').forEach((n) => n.remove())

    // 2) Odstrani natančne duplikate <img> po src v celotnem dokumentu.
    //    Prvo pojavitev pustimo, naslednje enake odstranimo.
    const seen = new Set<string>()
    for (const img of Array.from(wrap.querySelectorAll('img'))) {
      const norm = normalizeSrc(img.getAttribute('src'))
      if (!norm) continue
      if (seen.has(norm)) {
        img.remove()
      } else {
        seen.add(norm)
      }
    }

    // 3) (Nežno) odstrani prazne figure, ki so ostale po odstranjevanju
    for (const fig of Array.from(wrap.querySelectorAll('figure'))) {
      if (!fig.querySelector('img') && fig.textContent?.trim() === '') {
        fig.remove()
      }
    }

    return wrap.innerHTML
  } catch {
    return html
  }
}

export default function ArticlePreview({ url, onClose }: Props) {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [site, setSite] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
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

        const cleaned = cleanPreviewHTML(data.html)
        setTitle(data.title?.trim() || 'Predogled članka')
        setSite(data.site?.trim() || new URL(url).hostname.replace(/^www\./, ''))
        setContent(DOMPurify.sanitize(cleaned))
        setLoading(false)
      } catch {
        if (!alive) return
        setError('Napaka pri nalaganju predogleda.')
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [url])

  // Fokus trap + zapiranje z ESC + zakleni body scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const nodes = modalRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
        if (!nodes || nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => closeRef.current?.focus(), 0)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
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
              {title}
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
            <div className="prose prose-invert max-w-none prose-img:rounded-lg prose-a:underline">
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
