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
import { toBlob } from 'html-to-image'

interface Props { url: string; onClose: () => void }

type ApiPayload =
  | { error: string }
  | { title: string; site: string; image?: string | null; html: string; url: string }

const TEXT_PERCENT = 0.80
const VIA_TEXT = ' — via Križišče (krizisce.si)'
const AUTO_CLOSE_ON_OPEN = true

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

/* Ikone (skrajšano) */
function IconShareIOS(props: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}><path fill="currentColor" d="M12 3c.4 0 .8.16 1.06.44l3 3a1.5 1.5 0 1 1-2.12 2.12L13.5 7.12V14a1.5 1.5 0 1 1-3 0V7.12L9.06 8.56A1.5 1.5 0 0 1 6.94 6.44l3-3C10.2 3.16 10.6 3 11 3h1z"/><path fill="currentColor" d="M5 10.5A2.5 2.5 0 0 0 2.5 13v6A2.5 2.5 0 0 0 5 21.5h14A2.5 2.5 0 0 0 21.5 19v-6A2.5 2.5 0 0 0 19 10.5h-2a1.5 1.5 0 1 0 0 3h2V19H5v-5.5h2a1.5 1.5 0 1 0 0-3H5z"/></svg>) }
function IconFacebook(props: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}><path fill="currentColor" d="M13 21v-7h2.3l.4-3H13V9.3c0-.9.3-1.5 1.6-1.5H16V5.1C15.6 5 14.7 5 13.7 5 11.5 5 10 6.3 10 8.9V11H7.7v3H10v7h3z"/></svg>) }
function IconLinkedIn(props: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}><path fill="currentColor" d="M6.5 6.5A2.5 2.5 0 1 1 1.5 6.5a2.5 2.5 0 0 1 5 0zM2 8.8h4.9V22H2zM14.9 8.5c-2.7 0-4 1.5-4.6 2.5V8.8H5.4V22h4.9v-7c0-1.9 1-2.9 2.5-2.9 1.4 0 2.3 1 2.3 2.9V22H20v-7.7c0-3.3-1.8-5.8-5.1-5.8z"/></svg>) }
function IconWhatsApp(props: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}><path fill="currentColor" d="M12 2a10 10 0 0 0-8.7 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.6 14.6c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .2-1.7-.1-.4-.1-1-.3-1.8-.7-3.1-1.4-5.2-4.7-5.3-4.9-.2-.3-1.3-1.7-1.3-3.2 0-1.4.7-2.1 1-2.4.2-.2.6-.3 1-.3h.7c.2 0 .5 0 .7.6.3.7 1 2.6 1 2.8.1.2.1.4 0 .6-.1.2-.2.4-.4.6-.2.2-.4.5-.2.9.2.4.9 1.5 2 2.4 1.4 1.2 2.6 1.6 3 .1.2-.4.5-.5.8-.4.3.1 1.8.8 2.1 1 .3.2.5.4.6.6.1.5.1 1-.1 1.2z"/></svg>) }
function IconTelegram(props: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}><path fill="currentColor" d="M21.9 3.3c-.3-.2-.7-.2-1.1 0L2.8 10.6c-.7.3-.7 1.4.1 1.6l4.7 1.5 1.7 5.2c.2.7 1.1.9 1.6.3l2.6-2.8 4.3 3.1c.6.4 1.5.1 1.7-.6l3.1-14.4c.1-.5-.1-1-.6-1.2z"/></svg>) }
function IconCamera(props: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}><path fill="currentColor" d="M9 4a2 2 0 0 0-1.8 1.1L6.6 6H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-1.6l-.6-.9A2 2 0 0 0 15 4H9zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.5A2.5 2.5 0 1 0 14.5 14 2.5 2.5 0 0 0 12 11.5z"/></svg>) }
/* dodatni ikoni */
function IconX(props: React.SVGProps<SVGSVGElement>){return(<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}><path d="M3 3l18 18M21 3L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>)}
function IconLink(props: React.SVGProps<SVGSVGElement>){return(<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}><path fill="none" stroke="currentColor" strokeWidth="2" d="M10.5 13.5l3-3M8 14a4 4 0 010-8h3M16 18h-3a4 4 0 010-8"/></svg>)}

/* Utils */
function trackClick(source: string, url: string) {
  try {
    const payload = JSON.stringify({ source, url, from: 'preview' })
    const endpoint = '/api/click'
    if ('sendBeacon' in navigator) {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon(endpoint, blob)
    } else {
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true as any }).catch(() => {})
    }
  } catch {}
}
function absolutize(raw: string, baseUrl: string): string { try { return new URL(raw, baseUrl).toString() } catch { return raw } }
function proxyImageSrc(absUrl: string): string { try { if (new URL(absUrl).pathname.startsWith('/api/img')) return absUrl } catch {} return `/api/img?u=${encodeURIComponent(absUrl)}` }
function withCacheBust(u: string, bust: string) {
  try { const url = new URL(u, typeof location !== 'undefined' ? location.origin : 'http://localhost'); url.searchParams.set('cb', bust); return url.toString() }
  catch { const sep = u.includes('?') ? '&' : '?'; return `${u}${sep}cb=${encodeURIComponent(bust)}` }
}

/* ---- besedilni helperji ---- */
function wordSpans(text: string){ const spans:Array<{start:number;end:number}>=[]; const re=/[A-Za-z0-9À-ÖØ-öø-ÿĀ-žČŠŽčšžĆćĐđ]+(?:['’-][A-Za-z0-9À-ÖØ-öø-ÿĀ-žČŠŽčšžĆćĐđ]+)*/g; let m:RegExpExecArray|null; while((m=re.exec(text))!==null) spans.push({start:m.index,end:m.index+m[0].length}); return spans }
function countWords(text:string){ return wordSpans(text).length }
function truncateHTMLByWordsPercent(html:string, percent=0.76){
  const src=document.createElement('div'); src.innerHTML=html
  src.querySelectorAll('header,nav,footer,aside,.share,.social,.related,.tags').forEach((n)=>n.remove())
  const out=src.cloneNode(true) as HTMLDivElement
  const total=countWords(out.textContent||''); if (total===0) return out.innerHTML
  const target=Math.max(1, Math.floor(total*percent)); let used=0
  const w=document.createTreeWalker(out, NodeFilter.SHOW_TEXT); let node:Node|null=w.nextNode()
  while(node){
    const text=(node.textContent||''); const trimmed=text.trim()
    if (!trimmed){ node=w.nextNode(); continue }
    const spans=wordSpans(text); const local=spans.length; const remain=target-used
    if (local<=remain){ used+=local; node=w.nextNode(); continue }
    const cut=spans[Math.max(0, remain-1)]; const idx=cut?cut.end:0
    ;(node as Text).textContent=text.slice(0, idx).trimEnd()
    const range=document.createRange(); range.setStartAfter(node); const last=out.lastChild; if (last){ range.setEndAfter(last); range.deleteContents() }
    break
  }
  return out.innerHTML
}

/** počakaj na slike */
async function waitForImages(root: HTMLElement, timeoutMs = 6000) {
  const imgs = Array.from(root.querySelectorAll('img'))
  if (imgs.length === 0) return
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth > 0) return
    return new Promise<void>((resolve) => {
      let done = false
      const clear = () => { if (done) return; done = true; img.removeEventListener('load', onload); img.removeEventListener('error', onload); resolve() }
      const onload = () => clear()
      img.addEventListener('load', onload)
      img.addEventListener('error', onload)
      setTimeout(clear, timeoutMs)
    })
  }))
}

/** Očisti HTML + pobere prvo sliko (fallback). */
function cleanAndExtract(html: string, baseUrl: string, knownTitle: string | undefined, bust: string) {
  const wrap = document.createElement('div')
  wrap.innerHTML = html
  wrap.querySelectorAll('noscript,script,style,iframe,form').forEach((n) => n.remove())

  if (knownTitle) {
    const h = wrap.querySelector('h1, h2, h3')
    if (h) {
      const a=(h.textContent||'').trim().toLowerCase(), b=knownTitle.trim().toLowerCase()
      if (a && b && a===b) h.remove()
    }
  }

  wrap.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href'); if (href) a.setAttribute('href', absolutize(href, baseUrl))
    const rel = (a.getAttribute('rel') || '').split(/\s+/)
    if (!rel.includes('noopener')) rel.push('noopener')
    if (!rel.includes('noreferrer')) rel.push('noreferrer')
    a.setAttribute('rel', rel.join(' ').trim()); a.setAttribute('target', '_blank')
  })

  let firstImg: string | null = null
  wrap.querySelectorAll('img').forEach((img, idx) => {
    const raw = img.getAttribute('src') || img.getAttribute('data-src') || ''
    if (!raw) { (img.closest('figure, picture') || img).remove(); return }
    const abs  = absolutize(raw, baseUrl)
    const prox = proxyImageSrc(abs)
    const pinned = withCacheBust(prox, bust)
    img.setAttribute('src', pinned)
    img.removeAttribute('data-src')
    img.removeAttribute('srcset'); img.removeAttribute('sizes')
    img.setAttribute('loading', 'lazy')
    img.setAttribute('decoding', 'async')
    img.setAttribute('referrerpolicy', 'no-referrer')
    img.setAttribute('crossorigin', 'anonymous')
    if (idx === 0) firstImg = pinned
  })

  wrap.querySelectorAll('picture,source').forEach((n) => n.replaceWith(...Array.from(n.childNodes)))
  return { html: wrap.innerHTML, firstImg }
}

export default function ArticlePreview({ url, onClose }: Props) {
  // data
  const [content, setContent] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [site, setSite] = useState<string>('')
  const [coverSnapSrc, setCoverSnapSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // UI
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const shareBtnRef = useRef<HTMLButtonElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // snapshot
  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const [snapMsg, setSnapMsg] = useState<string>('')
  const snapMsgTimer = useRef<number | null>(null)
  const snapshotRef = useRef<HTMLDivElement>(null)

  // per-url cache-bust
  const cacheBust = useMemo(() => Math.random().toString(36).slice(2), [url])

  // prefer native share na coarse pointer
  const coarsePointerRef = useRef(false)
  useEffect(() => { try { coarsePointerRef.current = window.matchMedia('(pointer: coarse)').matches } catch {} }, [])
  const supportsWebShare = typeof navigator !== 'undefined' && 'share' in navigator && typeof window !== 'undefined' && window.isSecureContext
  const preferNativeShare = supportsWebShare && coarsePointerRef.current

  // sheet vs popover
  const [useSheet, setUseSheet] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const set = () => setUseSheet(mq.matches)
    set()
    mq.addEventListener?.('change', set)
    return () => mq.removeEventListener?.('change', set)
  }, [])

  // fetch + sanitize (+cover)
  useEffect(() => {
    let alive = true
    setContent(''); setCoverSnapSrc(null)
    setLoading(true); setError(null)

    const run = async () => {
      try {
        let data = peekPreview(url) as ApiPayload | null
        if (!data) data = await preloadPreview(url)
        if (!alive) return
        if (!data || 'error' in data) throw new Error('preview-failed')

        setTitle(data.title); setSite(data.site)

        const cleaned = cleanAndExtract(data.html, url, data.title, cacheBust)
        const textOnly = DOMPurify.sanitize(cleaned.html)
        const truncated = truncateHTMLByWordsPercent(textOnly, TEXT_PERCENT)

        const primary = data.image ? withCacheBust(proxyImageSrc(data.image), cacheBust) : null
        setCoverSnapSrc(primary || cleaned.firstImg || null)

        setContent(truncated)
        setLoading(false)
      } catch {
        if (!alive) return
        setError('Napaka pri nalaganju predogleda.'); setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [url, cacheBust])

  // fokus + scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open', 'preview-open')
    setTimeout(() => closeRef.current?.focus(), 0)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      document.body.classList.remove('modal-open', 'preview-open')
    }
  }, [onClose, shareOpen])

  // zapri meni ob kliku izven
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

  const showSnapMsg = useCallback((msg: string) => {
    setSnapMsg(msg)
    if (snapMsgTimer.current) window.clearTimeout(snapMsgTimer.current)
    snapMsgTimer.current = window.setTimeout(() => setSnapMsg(''), 2200)
  }, [])

  // Odpri + sledi
  const openSourceAndTrack = useCallback(() => {
    const source = site || (() => { try { return new URL(url).hostname } catch { return 'unknown' } })()
    trackClick(source, url)
    if (AUTO_CLOSE_ON_OPEN) requestAnimationFrame(() => onClose())
  }, [site, url, onClose])

  const onAuxOpen = useCallback((e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (e.button === 1 || e.metaKey || e.ctrlKey) {
      const source = site || (() => { try { return new URL(url).hostname } catch { return 'unknown' } })()
      trackClick(source, url)
      if (AUTO_CLOSE_ON_OPEN) requestAnimationFrame(() => onClose())
    }
  }, [site, url, onClose])

  // SHARE
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

  const openShareWindow = useCallback((href: string) => {
    try { window.open(href, '_blank', 'noopener,noreferrer') } catch {}
  }, [])

  const shareLinks = useMemo(() => {
    const encodedUrl   = encodeURIComponent(url)
    const encodedTitle = encodeURIComponent(title || site || '')
    return {
      x:  `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      fb: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      li: `https://www.linkedin.com/shareArticle?url=${encodedUrl}&title=${encodedTitle}`,
      wa: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      tg: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    }
  }, [url, title, site])

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
      document.body.removeChild(ta)
    }
  }, [url])

  // ---------- SNAPSHOT ----------
  const downloadBlob = useCallback((blob: Blob, filename = 'article-snapshot.png') => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }, [])

  /** Snapshot kartica */
  const doSnapshot = useCallback(async (): Promise<Blob> => {
    const isDark =
      document.documentElement.classList.contains('dark') ||
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const bg = isDark ? '#111827' : '#ffffff'
    const fg = isDark ? '#e5e7eb' : '#111827'
    const sub = isDark ? 'rgba(229,231,235,.6)' : 'rgba(17,24,39,.6)'
    const shade = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'

    const width = snapshotRef.current?.offsetWidth || 640
    const root = document.createElement('div')
    root.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;pointer-events:none;`
    const card = document.createElement('div')
    card.style.cssText = `background:${bg};color:${fg};padding:16px;border-radius:16px;border:1px solid ${shade};font:500 14px/1.55 system-ui,-apple-system,Segoe UI,Roboto;`
    root.appendChild(card)

    const siteText = site || (() => { try { return new URL(url).hostname } catch { return 'krizisce.si' } })()
    const titleEl = document.createElement('div')
    titleEl.textContent = title || 'Članek'
    titleEl.style.cssText = 'font-weight:700;font-size:18px;line-height:1.3;margin:2px 0 6px;'
    const domainEl = document.createElement('div')
    domainEl.textContent = siteText
    domainEl.style.cssText = `color:${sub};font-size:12px;margin-bottom:10px;`
    card.appendChild(titleEl); card.appendChild(domainEl)

    const cover = coverSnapSrc ? withCacheBust(coverSnapSrc, `${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`) : null
    if (cover) {
      const imgWrap = document.createElement('div')
      imgWrap.style.cssText = 'width:100%;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#f3f4f6;margin-bottom:12px;'
      const img = new Image()
      img.decoding = 'sync'; img.loading = 'eager'; img.crossOrigin = 'anonymous'; img.referrerPolicy = 'no-referrer'
      img.src = cover
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;'
      imgWrap.appendChild(img); card.appendChild(imgWrap)
    }

    const rawText = (snapshotRef.current?.textContent || '').replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim()
    const MAX_WORDS = 140
    const words = rawText.split(' ').filter(Boolean).slice(0, MAX_WORDS)
    const excerpt = words.join(' ') + (words.length >= MAX_WORDS ? '…' : '')

    const textWrap = document.createElement('div')
    textWrap.style.cssText = 'position:relative;border-radius:12px;overflow:hidden;'
    const bodyEl = document.createElement('div')
    bodyEl.textContent = excerpt
    bodyEl.style.cssText = 'white-space:pre-wrap;font-size:14px;line-height:1.55;padding-bottom:72px;'
    const fade = document.createElement('div')
    fade.style.cssText = `pointer-events:none;position:absolute;left:0;right:0;bottom:0;height:72px;background:linear-gradient(to top, ${bg}, rgba(0,0,0,0));`
    textWrap.appendChild(bodyEl); textWrap.appendChild(fade)
    card.appendChild(textWrap)

    document.body.appendChild(root)
    await waitForImages(card)

    try {
      const blob = await toBlob(card, {
        cacheBust: true,
        pixelRatio: Math.max(2, window.devicePixelRatio || 1),
        backgroundColor: bg,
      })
      if (!blob) throw new Error('snapshot-render-failed')
      return blob
    } finally { root.remove() }
  }, [title, site, url, coverSnapSrc])

  const handleSnapshot = useCallback(async (e?: ReactMouseEvent<HTMLButtonElement>) => {
    setSnapshotBusy(true)
    try {
      const forceDownload = !!e?.altKey
      const blob = await doSnapshot()
      const isMobileUI = window.matchMedia?.('(max-width: 640px)').matches

      if (isMobileUI && !forceDownload && 'share' in navigator) {
        const file = new File([blob], 'article-snapshot.png', { type: 'image/png' })
        const canShareFiles = (navigator as any).canShare?.({ files: [file] }) ?? false
        if (canShareFiles) {
          await (navigator as any).share({
            files: [file],
            title: title || site || 'Snapshot',
            text: (title ? `${title}${site ? ` – ${site}` : ''}` : (site || 'Članek')),
          })
          showSnapMsg('Deljeno prek sistema.'); setSnapshotBusy(false); return
        }
      }

      const canClipboard =
        !forceDownload &&
        'clipboard' in navigator &&
        typeof (window as any).ClipboardItem !== 'undefined' &&
        typeof navigator.clipboard?.write === 'function'

      if (canClipboard) {
        const CI = (window as any).ClipboardItem as { new (items: Record<string, Blob>): ClipboardItem }
        const item = new CI({
          'image/png': blob,
          'text/plain': new Blob([`Snapshot: ${title || site || ''}`], { type: 'text/plain' }),
        })
        await navigator.clipboard.write([item])
        showSnapMsg('Kopirano (PNG). Alt+klik za prenos.')
      } else {
        downloadBlob(blob)
        showSnapMsg('PNG prenesen.')
      }
    } catch (err) {
      console.error('Snapshot failed:', err)
      showSnapMsg('Napaka pri snapshotu.')
    } finally { setSnapshotBusy(false) }
  }, [doSnapshot, downloadBlob, title, site, showSnapMsg])
  // -----------------------------

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
              {/* Snapshot */}
              <button
                type="button"
                onClick={handleSnapshot}
                disabled={snapshotBusy}
                aria-label="Snapshot predogleda (kopiraj sliko)"
                title="Snapshot (klik = kopiraj; Alt+klik = prenos)"
                className="inline-flex items-center justify-center rounded-lg h-8 w-8 text-sm bg-gray-100/70 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 anim-soft disabled:opacity-60"
              >
                <IconCamera />
              </button>

              {/* Share */}
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

              {/* Modern Share menu */}
              {shareOpen && (
                useSheet ? (
                  // Mobile: bottom sheet
                  <div ref={shareMenuRef} role="menu" aria-label="Deli"
                       className="fixed inset-x-0 bottom-0 z-50">
                    <div className="mx-auto w-full max-w-2xl rounded-t-2xl border border-gray-200/20 bg-white dark:bg-gray-900 shadow-2xl">
                      <div className="flex justify-center py-2">
                        <span className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
                      </div>
                      <div className="px-4 pb-4">
                        <div className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Deli</div>
                        <div className="grid grid-cols-3 gap-3">
                          <button onClick={() => { openShareWindow(shareLinks.x); setShareOpen(false) }}
                                  className="group flex flex-col items-center gap-2 rounded-xl p-3 bg-gray-100/70 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            <IconX />
                            <span className="text-xs">X</span>
                          </button>
                          <button onClick={() => { openShareWindow(shareLinks.fb); setShareOpen(false) }}
                                  className="group flex flex-col items-center gap-2 rounded-xl p-3 bg-gray-100/70 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            <IconFacebook />
                            <span className="text-xs">Facebook</span>
                          </button>
                          <button onClick={() => { openShareWindow(shareLinks.li); setShareOpen(false) }}
                                  className="group flex flex-col items-center gap-2 rounded-xl p-3 bg-gray-100/70 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            <IconLinkedIn />
                            <span className="text-xs">LinkedIn</span>
                          </button>
                          <button onClick={() => { openShareWindow(shareLinks.wa); setShareOpen(false) }}
                                  className="group flex flex-col items-center gap-2 rounded-xl p-3 bg-gray-100/70 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            <IconWhatsApp />
                            <span className="text-xs">WhatsApp</span>
                          </button>
                          <button onClick={() => { openShareWindow(shareLinks.tg); setShareOpen(false) }}
                                  className="group flex flex-col items-center gap-2 rounded-xl p-3 bg-gray-100/70 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            <IconTelegram />
                            <span className="text-xs">Telegram</span>
                          </button>
                          <button onClick={async () => { await copyToClipboard(); setShareOpen(false) }}
                                  className="group flex flex-col items-center gap-2 rounded-xl p-3 bg-gray-100/70 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            <IconLink />
                            <span className="text-xs">{copied ? 'Kopirano!' : 'Kopiraj povezavo'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Desktop: popover
                  <div ref={shareMenuRef} role="menu" aria-label="Deli"
                       className="absolute right-24 top-10 z-50">
                    <div className="relative">
                      {/* arrow */}
                      <div className="absolute right-6 -top-2 h-4 w-4 rotate-45 rounded-sm bg-white dark:bg-gray-900 border-l border-t border-gray-200/20" />
                      <div className="rounded-xl border border-gray-200/20 bg-white dark:bg-gray-900 shadow-2xl p-3 w-72 backdrop-blur">
                        <div className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Deli</div>
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => { openShareWindow(shareLinks.x); setShareOpen(false) }}
                                  className="group flex flex-col items-center gap-1.5 rounded-lg p-3 hover:bg-gray-100/80 dark:hover:bg-gray-800 transition">
                            <IconX /><span className="text-xs">X</span>
                          </button>
                          <button onClick={() => { openShareWindow(shareLinks.fb); setShareOpen(false) }}
                                  className="group flex flex-col items-center gap-1.5 rounded-lg p-3 hover:bg-gray-100/80 dark:hover:bg-gray-800 transition">
                            <IconFacebook /><span className="text-xs">Facebook</span>
                          </button>
                          <button onClick={() => { openShareWindow(shareLinks.li); setShareOpen(false) }}
                                  className="group flex flex-col items-center gap-1.5 rounded-lg p-3 hover:bg-gray-100/80 dark:hover:bg-gray-800 transition">
                            <IconLinkedIn /><span className="text-xs">LinkedIn</span>
                          </button>
                          <button onClick={() => { openShareWindow(shareLinks.wa); setShareOpen(false) }}
                                  className="group flex flex-col items-center gap-1.5 rounded-lg p-3 hover:bg-gray-100/80 dark:hover:bg-gray-800 transition">
                            <IconWhatsApp /><span className="text-xs">WhatsApp</span>
                          </button>
                          <button onClick={() => { openShareWindow(shareLinks.tg); setShareOpen(false) }}
                                  className="group flex flex-col items-center gap-1.5 rounded-lg p-3 hover:bg-gray-100/80 dark:hover:bg-gray-800 transition">
                            <IconTelegram /><span className="text-xs">Telegram</span>
                          </button>
                          <button onClick={async () => { await copyToClipboard(); setShareOpen(false) }}
                                  className="group flex flex-col items-center gap-1.5 rounded-lg p-3 hover:bg-gray-100/80 dark:hover:bg-gray-800 transition">
                            <IconLink /><span className="text-xs">{copied ? 'Kopirano!' : 'Kopiraj povezavo'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={openSourceAndTrack}
                onAuxClick={onAuxOpen}
                className="no-underline inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm bg-orange-300 text-white hover:bg-amber-600 anim-soft"
              >
                Odpri cel članek
              </a>

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
                {/* Točno to bomo zajeli */}
                <div key={url} ref={snapshotRef} className="relative">
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
                </div>

                <div className="mt-5 flex flex-col items-center gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={openSourceAndTrack}
                    onAuxClick={onAuxOpen}
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

          {/* Toast */}
          {snapMsg && (
            <div className="pointer-events-none fixed left-4 bottom-4 z-[60] rounded-lg bg-black/80 text-white text-sm px-3 py-2 shadow-lg">
              {snapMsg}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
