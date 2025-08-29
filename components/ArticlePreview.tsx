// components/ArticlePreview.tsx
'use client'

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import DOMPurify from 'dompurify'
import { preloadPreview, peekPreview } from '@/lib/previewPrefetch'

interface Props { url: string; onClose: () => void }

type ApiPayload =
  | { error: string }
  | { title: string; site: string; image?: string | null; html: string; url: string }

const TEXT_PERCENT = 0.80
const VIA_TEXT = ' — via Križišče (krizisce.si)'

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

/* Ikone (inline SVG) */
function IconShareIOS(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M12 3c.4 0 .8.16 1.06.44l3 3a1.5 1.5 0 1 1-2.12 2.12L13.5 7.12V14a1.5 1.5 0 1 1-3 0V7.12L9.06 8.56A1.5 1.5 0 0 1 6.94 6.44l3-3C10.2 3.16 10.6 3 11 3h1z"/>
      <path fill="currentColor" d="M5 10.5A2.5 2.5 0 0 0 2.5 13v6A2.5 2.5 0 0 0 5 21.5h14A2.5 2.5 0 0 0 21.5 19v-6A2.5 2.5 0 0 0 19 10.5h-2a1.5 1.5 0 1 0 0 3h2V19H5v-5.5h2a1.5 1.5 0 1 0 0-3H5z"/>
    </svg>
  )
}
function IconCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
    </svg>
  )
}
function IconX(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M17.5 3h-3.1l-3.3 5L7 3H3l6.1 8.5L3.5 21h3.1l3.6-5.4L17 21h4l-6.7-9.2L21 3h-3.5l-3.9 5.8z"/>
    </svg>
  )
}
function IconFacebook(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M13 21v-7h2.3l.4-3H13V9.3c0-.9.3-1.5 1.6-1.5H16V5.1C15.6 5 14.7 5 13.7 5 11.5 5 10 6.3 10 8.9V11H7.7v3H10v7h3z"/>
    </svg>
  )
}
function IconLinkedIn(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M6.5 6.5A2.5 2.5 0 1 1 1.5 6.5a2.5 2.5 0 0 1 5 0zM2 8.8h4.9V22H2zM14.9 8.5c-2.7 0-4 1.5-4.6 2.5V8.8H5.4V22h4.9v-7c0-1.9 1-2.9 2.5-2.9 1.4 0 2.3 1 2.3 2.9V22H20v-7.7c0-3.3-1.8-5.8-5.1-5.8z"/>
    </svg>
  )
}
function IconWhatsApp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M12 2a10 10 0 0 0-8.7 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.6 14.6c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .2-1.7-.1-.4-.1-1-.3-1.8-.7-3.1-1.4-5.2-4.7-5.3-4.9-.2-.3-1.3-1.7-1.3-3.2 0-1.4.7-2.1 1-2.4.2-.2.6-.3 1-.3h.7c.2 0 .5 0 .7.6.3.7 1 2.6 1 2.8.1.2.1.4 0 .6-.1.2-.2.4-.4.6-.2.2-.4.5-.2.9.2.4.9 1.5 2 2.4 1.4 1.2 2.6 1.6 3 .1.2-.4.5-.5.8-.4.3.1 1.8.8 2.1 1 .3.2.5.4.6.6.1.5.1 1-.1 1.2z"/>
    </svg>
  )
}
function IconTelegram(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M21.9 3.3c-.3-.2-.7-.2-1.1 0L2.8 10.6c-.7.3-.7 1.4.1 1.6l4.7 1.5 1.7 5.2c.2.7 1.1.9 1.6.3l2.6-2.8 4.3 3.1c.6.4 1.5.1 1.7-.6l3.1-14.4c.1-.5-.1-1-.6-1.2z"/>
    </svg>
  )
}

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

/** Client-side clean + polish */
function cleanPreviewHTML(html: string, baseUrl: string, knownTitle?: string): string {
  try {
    const wrap = document.createElement('div')
    wrap.innerHTML = html
    wrap.querySelectorAll('noscript,script,style,iframe,form').forEach((n) => n.remove())

    if (knownTitle) {
      const firstHeading = wrap.querySelector('h1, h2, h3')
      if (firstHeading) {
        const a = (firstHeading.textContent || '').trim().toLowerCase()
        const b = knownTitle.trim().toLowerCase()
        if (a && b && a === b) firstHeading.remove()
      }
    }

    wrap.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href')
      if (href) a.setAttribute('href', absolutize(href, baseUrl))
      const rel = (a.getAttribute('rel') || '').split(/\s+/)
      if (!rel.includes('noopener')) rel.push('noopener')
      if (!rel.includes('noreferrer')) rel.push('noreferrer')
      a.setAttribute('rel', rel.join(' ').trim())
      a.setAttribute('target', '_blank')
    })

    const imgs = Array.from(wrap.querySelectorAll('img'))
    if (imgs.length > 0) {
      const first = imgs[0]
      const firstRaw = first.getAttribute('src') || first.getAttribute('data-src') || ''
      const firstAbs = absolutize(firstRaw, baseUrl)
      if (firstAbs) first.setAttribute('src', firstAbs)
      first.removeAttribute('data-src')
      first.removeAttribute('srcset'); first.removeAttribute('sizes')
      first.setAttribute('loading', 'lazy')
      first.setAttribute('decoding', 'async')
      first.setAttribute('referrerpolicy', 'no-referrer')

      const firstKey  = imageKeyFromSrc(firstAbs || firstRaw)
      const firstStem = basenameStem(firstKey)

      const seen = new Set<string>()
      if (firstKey) seen.add(firstKey)

      Array.from(wrap.querySelectorAll('img')).slice(1).forEach((img) => {
        const raw = img.getAttribute('src') || img.getAttribute('data-src') || ''
        if (!raw) { (img.closest('figure, picture') || img).remove(); return }

        const abs = absolutize(raw, baseUrl)
        img.setAttribute('src', abs)
        img.removeAttribute('data-src')
        img.removeAttribute('srcset'); img.removeAttribute('sizes')
        img.setAttribute('loading', 'lazy')
        img.setAttribute('decoding', 'async')
        img.setAttribute('referrerpolicy', 'no-referrer')

        const key  = imageKeyFromSrc(abs)
        const stem = basenameStem(key)

        const duplicate =
          !key || seen.has(key) || stem === firstStem ||
          stem.startsWith(firstStem.slice(0,10)) || firstStem.startsWith(stem.slice(0,10))

        if (duplicate) { (img.closest('figure, picture') || img).remove() }
        else { seen.add(key) }
      })
    }

    return wrap.innerHTML
  } catch { return html }
}

function wordSpans(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = []
  const re = /[A-Za-z0-9À-ÖØ-öø-ÿĀ-žČŠŽčšžĆćĐđ]+(?:['’-][A-Za-z0-9À-ÖØ-öø-ÿĀ-žČŠŽčšžĆćĐđ]+)*/g
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
    const text = (node.textContent || '')
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
  // data
  const [content, setContent] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [site, setSite] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // share UI
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const shareBtnRef = useRef<HTMLButtonElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  // modal infra
  const modalRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // prefer native share samo na “coarse pointer” napravah
  const coarsePointerRef = useRef(false)
  useEffect(() => {
    try { coarsePointerRef.current = window.matchMedia('(pointer: coarse)').matches } catch {}
  }, [])
  const supportsWebShare =
    typeof navigator !== 'undefined' && 'share' in navigator && typeof window !== 'undefined' && window.isSecureContext
  const preferNativeShare = supportsWebShare && coarsePointerRef.current

  // sheet vs. popover
  const [useSheet, setUseSheet] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const set = () => setUseSheet(mq.matches)
    set()
    mq.addEventListener?.('change', set)
    return () => mq.removeEventListener?.('change', set)
  }, [])

  const shareLinks = useMemo(() => {
    const encodedUrl = encodeURIComponent(url)
    const baseTitle = (title || site || 'Križišče')
    const encodedViaTitle = encodeURIComponent(baseTitle + VIA_TEXT)
    return [
      { key: 'x',  label: 'X',        href: `https://x.com/intent/post?url=${encodedUrl}&text=${encodedViaTitle}`, Icon: IconX },
      { key: 'fb', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,          Icon: IconFacebook },
      { key: 'li', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,   Icon: IconLinkedIn },
      { key: 'wa', label: 'WhatsApp', href: `https://api.whatsapp.com/send?text=${encodedViaTitle}%20${encodedUrl}`, Icon: IconWhatsApp },
      { key: 'tg', label: 'Telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedViaTitle}`,     Icon: IconTelegram },
    ]
  }, [url, title, site])

  // load preview (cache-first → clean → trunc → sanitize)
  useEffect(() => {
    let alive = true
    const run = async () => {
      setLoading(true); setError(null)
      try {
        let data = peekPreview(url) as ApiPayload | null
        if (!data) data = await preloadPreview(url)
        if (!alive) return
        if ('error' in data) { setError('Napaka pri nalaganju predogleda.'); setLoading(false); return }
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

  // fokus trap + lock scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (shareOpen) setShareOpen(false)
        else onClose()
      } else if (e.key === 'Tab') {
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
  }, [onClose, shareOpen])

  // klik izven menija
  useEffect(() => {
    const onDocClick = (e: globalThis.MouseEvent) => {
      if (!shareOpen) return
      const target = e.target as Node
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(target) &&
        shareBtnRef.current &&
        !shareBtnRef.current.contains(target)
      ) setShareOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [shareOpen])

  const openSourceAndTrack = useCallback((e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const source = site || (() => { try { return new URL(url).hostname } catch { return 'unknown' } })()
    trackClick(source, url)
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [site, url])

  // SHARE: instant na desktopu (popover), native le na telefonu/tablici
  const handleShareClick = useCallback(() => {
    if (preferNativeShare) {
      const shareData: ShareData = {
        title: (title || site || 'Članek') + VIA_TEXT,
        text: (title ? `${title}${site ? ` – ${site}` : ''}` : (site || 'Križišče')) + VIA_TEXT,
        url,
      }
      try { (navigator as any).share(shareData).catch(() => {}) } catch {}
      return
    }
    setShareOpen((v) => !v)
  }, [preferNativeShare, title, site, url])

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
      document.body.removeChild(ta)
    }
  }, [url])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <style>{`
        body.preview-open a,
        body.preview-open a:hover,
        body.preview-open a:focus { text-decoration: none !important; }
        body.preview-open .group:hover { transform: none !important; }
        body.preview-open .group:hover * { text-decoration: none !important; }
        @media (prefers-reduced-motion: reduce) { .anim-soft { transition: none !important; } }
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

            <div className="flex items-center gap-2 shrink-0 relative">
              {/* Share button */}
              <button
                ref={shareBtnRef}
                type="button"
                onClick={handleShareClick}
                aria-haspopup="menu"
                aria-expanded={shareOpen}
                className="inline-flex items-center justify-center rounded-lg px-3 h-8 text-sm bg-gray-100/70 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 anim-soft"
                title="Deli"
              >
                <IconShareIOS className="mr-1" />
                <span className="hidden sm:inline">Deli</span>
              </button>

              {/* Share menu (ikonice-only) */}
              {shareOpen && (
                <div
                  ref={shareMenuRef}
                  role="menu"
                  className={[
                    useSheet
                      ? 'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl'
                      : 'absolute right-0 top-full mt-2 z-50',
                    'overflow-hidden border border-gray-200/30 bg-white/95 dark:bg-gray-900/95 shadow-2xl backdrop-blur',
                  ].join(' ')}
                >
                  {useSheet && (
                    <div className="px-4 pt-3 pb-2">
                      <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Deli članek</div>
                    </div>
                  )}

                  <div className={useSheet ? 'p-4' : 'p-3'}>
                    {/* primary: copy */}
                    <button
                      onClick={copyToClipboard}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm py-2.5 px-3 anim-soft"
                      role="menuitem"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/70 dark:bg-black/30 border border-gray-200/60 dark:border-gray-700/60">
                        {copied ? <IconCheck /> : '⧉'}
                      </span>
                      {copied ? 'Kopirano!' : 'Kopiraj povezavo'}
                    </button>

                    {/* icons only */}
                    <div className="mt-3 flex items-center gap-2 sm:gap-3">
                      {shareLinks.map(({ key, label, href, Icon }) => (
                        <a
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          role="menuitem"
                          title={label}
                          aria-label={label}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/50 dark:border-gray-700/60 bg-white/80 dark:bg-black/30 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-[1.05] anim-soft"
                          onClick={() => setShareOpen(false)}
                        >
                          <Icon />
                        </a>
                      ))}
                    </div>

                    {useSheet && (
                      <button
                        onClick={() => setShareOpen(false)}
                        className="mt-3 w-full text-center text-sm text-gray-600 dark:text-gray-300 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 anim-soft"
                      >
                        Zapri
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Odpri cel članek */}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={openSourceAndTrack}
                className="no-underline inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm bg-orange-300 text-white hover:bg-amber-600 anim-soft"
              >
                Odpri cel članek
              </a>

              {/* Zapri */}
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Zapri predogled"
                className="inline-flex h-8 px-2 items-center justify-center rounded-lg text-sm bg-gray-100/70 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 anim-soft"
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
                    className="no-underline inline-flex justify-center rounded-md px-5 py-2 dark:bg-gray-700 text-white text-sm dark:hover:bg-gray-600 whitespace-nowrap anim-soft"
                  >
                    Za ogled celotnega članka, obiščite spletno stran
                  </a>

                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex justify-center rounded-md px-4 py-2 bg-gray-100/80 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm anim-soft"
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
