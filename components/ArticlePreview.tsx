/* components/ArticlePreview.tsx */
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
import NextImage from 'next/image' 
import { preloadPreview, peekPreview } from '@/lib/previewPrefetch'
import { toBlob } from 'html-to-image'
import { proxiedImage } from '@/lib/img'

interface Props { url: string; onClose: () => void }

type ApiPayload =
  | { error: string }
  | { title: string; site: string; image?: string | null; html: string; url: string }

const TEXT_PERCENT = 0.60
const VIA_TEXT = ' — via Križišče (krizisce.si)'
const AUTO_CLOSE_ON_OPEN = true

/* --- NOVO: Helper za barve virov (za lepši okvir) --- */
const getSourceColor = (site: string) => {
  const s = (site || '').toLowerCase();
  if (s.includes('24ur')) return '#f97316';     // Oranžna
  if (s.includes('rtvslo')) return '#009681';   // RTV MMC Zelena
  if (s.includes('siol')) return '#00a1e1';     // Modra
  if (s.includes('delo')) return '#e11927';     // Rdeča
  if (s.includes('n1')) return '#004a99';       // Temno modra
  if (s.includes('dnevnik')) return '#374151';  // Siva
  if (s.includes('svet24')) return '#eab308';   // Rumena
  if (s.includes('zurnal')) return '#dc2626';   // Živo rdeča
  if (s.includes('vecer')) return '#e11927';    // Rdeča
  return '#fc9c6c'; // Privzeta brand barva
}

/* --- NOVO: Skeleton Loader (nadomesti krog) --- */
const SkeletonLoader = () => (
  <div className="animate-pulse space-y-8 py-8 px-2 max-w-2xl mx-auto w-full">
    {/* Naslov */}
    <div className="space-y-3">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-3/4"></div>
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/2"></div>
    </div>
    {/* Slika */}
    <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
    {/* Besedilo */}
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/6"></div>
    </div>
  </div>
)

const PREVIEW_TYPO_CSS = `
  .preview-typo { font-size: 1rem; line-height: 1.7; color: inherit; }
  .preview-typo > *:first-child { margin-top: 0 !important; }
  .preview-typo p { margin: 0.75rem 0 1.25rem; }
  .preview-typo h1 { margin: 1.00rem 0 1rem; line-height: 1.25; font-weight: 700; }
  .preview-typo h2, .preview-typo h3, .preview-typo h4 {
    margin: 1.5rem 0 0.5rem; line-height: 1.3; font-weight: 700;
  }
  .preview-typo ul, .preview-typo ol { margin: 0.6rem 0 0.9rem; padding-left: 1.25rem; }
  .preview-typo li { margin: 0.25rem 0; }
  .preview-typo img, .preview-typo figure, .preview-typo video {
    display:block; max-width:100%; height:auto; border-radius:12px; margin: 1.5rem 0;
  }
  .preview-typo figure > img { margin-bottom: 0.4rem; }
  .preview-typo figcaption { font-size: 0.85rem; opacity: .75; margin-top: -0.2rem; text-align: center; }
  .preview-typo blockquote {
    margin: 1.5rem 0; padding: 0.5rem 0 0.5rem 1.25rem;
    border-left: 4px solid var(--accent-color, #fc9c6c); opacity: .95;
    background: rgba(0,0,0,0.03); font-style: italic;
  }
  .dark .preview-typo blockquote { background: rgba(255,255,255,0.05); }
  .preview-typo hr { margin: 1.5rem 0; opacity: .25; }
  .preview-typo a { text-decoration: underline; text-underline-offset: 2px; color: var(--accent-color, #fc9c6c); }
`

/* Icons */
function IconShareIOS(p: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path fill="currentColor" d="M12 3c.4 0 .8.16 1.06.44l3 3a1.5 1.5 0 1 1-2.12 2.12L13.5 7.12V14a1.5 1.5 0 1 1-3 0V7.12L9.06 8.56A1.5 1.5 0 0 1 6.94 6.44l3-3C10.2 3.16 10.6 3 11 3h1z"/><path fill="currentColor" d="M5 10.5A2.5 2.5 0 0 0 2.5 13v6A2.5 2.5 0 0 0 5 21.5h14A2.5 2.5 0 0 0 21.5 19v-6A2.5 2.5 0 0 0 19 10.5h-2a1.5 1.5 0 1 0 0 3h2V19H5v-5.5h2a1.5 1.5 0 1 0 0-3H5z"/></svg>) }
function IconFacebook(p: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path fill="currentColor" d="M13 21v-7h2.3l.4-3H13V9.3c0-.9.3-1.5 1.6-1.5H16V5.1C15.6 5 14.7 5 13.7 5 11.5 5 10 6.3 10 8.9V11H7.7v3H10v7h3z"/></svg>) }
function IconLinkedIn(p: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path fill="currentColor" d="M6.5 6.5A2.5 2.5 0 1 1 1.5 6.5a2.5 2.5 0 0 1 5 0zM2 8.8h4.9V22H2zM14.9 8.5c-2.7 0-4 1.5-4.6 2.5V8.8H5.4V22h4.9v-7c0-1.9 1-2.9 2.5-2.9 1.4 0 2.3 1 2.3 2.9V22H20v-7.7c0-3.3-1.8-5.8-5.1-5.8z"/></svg>) }
function IconWhatsApp(p: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path fill="currentColor" d="M12 2a10 10 0 0 0-8.7 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.6 14.6c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .2-1.7-.1-.4-.1-1-.3-1.8-.7-3.1-1.4-5.2-4.7-5.3-4.9-.2-.3-1.3-1.7-1.3-3.2 0-1.4.7-2.1 1-2.4.2-.2.6-.3 1-.3h.7c.2 0 .5 0 .7 .6.3.7 1 2.6 1 2.8.1.2.1.4 0 .6-.1.2-.2.4-.6.6.1.5.1 1-.1 1.2z"/></svg>) }
function IconTelegram(p: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path fill="currentColor" d="M21.9 3.3c-.3-.2-.7-.2-1.1 0L2.8 10.6c-.7.3-.7 1.4.1 1.6l4.7 1.5 1.7 5.2c.2.7 1.1.9 1.6.3l2.6-2.8 4.3 3.1c.6.4 1.5.1 1.7-.6l3.1-14.4c.1-.5-.1-1-.6-1.2z"/></svg>) }
function IconCamera(p: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path fill="currentColor" d="M9 4a2 2 0 0 0-1.8 1.1L6.6 6H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-1.6l-.6-.9A2 2 0 0 0 15 4H9zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.5A2.5 2.5 0 1 0 14.5 14 2.5 2.5 0 0 0 12 11.5z"/></svg>) }
function IconX(p: React.SVGProps<SVGSVGElement>){return(<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path d="M3 3l18 18M21 3L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>)}
function IconLink(p: React.SVGProps<SVGSVGElement>){return(<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path fill="none" stroke="currentColor" strokeWidth="2" d="M10.5 13.5l3-3M8 14a4 4 0 010-8h3M16 18h-3a4 4 0 010-8"/></svg>)}
function IconExternal(p: React.SVGProps<SVGSVGElement>){return(<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path fill="none" stroke="currentColor" strokeWidth="2" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9" fill="none" stroke="currentColor" strokeWidth="2"/><line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2"/></svg>)}

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

// Weserv proxy
function proxyImageSrc(absUrl: string): string { 
  return proxiedImage(absUrl, 800)
}

function withCacheBust(u: string, bust: string) {
  try { const url = new URL(u, typeof location !== 'undefined' ? location.origin : 'http://localhost'); url.searchParams.set('cb', bust); return url.toString() }
  catch { const sep = u.includes('?') ? '&' : '?'; return `${u}${sep}cb=${encodeURIComponent(bust)}` }
}

/* text helpers */
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

/* image dedupe helpers */
function imageKeyFromSrc(src: string | null | undefined): string {
  if (!src) return ''
  let pathname = ''
  try {
    const u = new URL(src, typeof location !== 'undefined' ? location.origin : 'http://localhost')
    pathname = (u.pathname || '').toLowerCase()
  } catch {
    pathname = (src.split('#')[0] || '').split('?')[0].toLowerCase()
  }
  pathname = pathname
    .replace(/\/cache\/[^/]+\/+/g, '/')
    .replace(/\/(fit|fill|resize)\/\d+x\d+\/?/g, '/')
  pathname = pathname.replace(/(-|_)?\d{2,4}x\d{2,4}(?=\.)/g, '')
  pathname = pathname.replace(/(-|_)?\d{2,4}x(?=\.)/g, '')
  pathname = pathname.replace(/-scaled(?=\.)/g, '')
  pathname = pathname.replace(/\.(webp|jpeg)$/g, '.jpg')
  return pathname
}
function basenameStem(pathname: string): string {
  const last = pathname.split('/').pop() || ''
  return last
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/(-|_)?\d{2,4}x\d{2,4}$/g, '')
    .replace(/(-|_)?\d{2,4}x$/g, '')
    .replace(/-scaled$/g, '')
}
function normalizeStemForDedupe(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') 
    .replace(/\.[a-z0-9]+$/, '')                      
    .replace(/(-|_)?\d{2,4}x\d{2,4}$/g, '')
    .replace(/(-|_)?\d{2,4}x$/g, '')
    .replace(/-scaled$/g, '')
    .replace(/\d+/g, '')                                
    .replace(/[-_]+/g, '')                              
    .slice(0, 20)                                       
}

/* wait images */
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

/* clean & extract */
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
    const href = a.getAttribute('href')
    if (href) a.setAttribute('href', absolutize(href, baseUrl))
    const rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean)
    if (!rel.includes('noopener')) rel.push('noopener')
    const filtered = rel.filter((t) => t.toLowerCase() !== 'noreferrer')
    a.setAttribute('rel', filtered.join(' ').trim())
    a.setAttribute('target', '_blank')
    a.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  })

  let firstImgPinned: string | null = null
  let firstKey = ''
  let firstStem = ''
  let firstNormStem = ''

  const imgs = Array.from(wrap.querySelectorAll('img'))
  if (imgs.length > 0) {
    const first = imgs[0]
    const firstRaw = first.getAttribute('src') || first.getAttribute('data-src') || ''
    const firstAbs = absolutize(firstRaw, baseUrl)
    
    firstKey  = imageKeyFromSrc(firstAbs || firstRaw)
    firstStem = basenameStem(firstKey)
    firstNormStem = normalizeStemForDedupe(firstStem)

    if (firstAbs) {
      const prox = proxyImageSrc(firstAbs)
      const pinned = withCacheBust(prox, bust)
      first.setAttribute('src', pinned)
      first.removeAttribute('data-src')
      first.removeAttribute('srcset'); first.removeAttribute('sizes')
      first.setAttribute('loading', 'lazy')
      first.setAttribute('decoding', 'async')
      first.setAttribute('referrerpolicy', 'no-referrer')
      first.setAttribute('crossorigin', 'anonymous')
      firstImgPinned = pinned
    }

    const seenKeys = new Set<string>()
    const seenNormStems = new Set<string>()
    if (firstKey) seenKeys.add(firstKey)
    if (firstNormStem) seenNormStems.add(firstNormStem)

    imgs.slice(1).forEach((img) => {
      const raw = img.getAttribute('src') || img.getAttribute('data-src') || ''
      if (!raw) { (img.closest('figure, picture') || img).remove(); return }

      const abs  = absolutize(raw, baseUrl)
      const key  = imageKeyFromSrc(abs || raw)
      const stem = basenameStem(key)
      const nstem = normalizeStemForDedupe(stem)

      const duplicate =
        !key ||
        seenKeys.has(key) ||
        (nstem && seenNormStems.has(nstem)) ||
        stem === firstStem ||
        (firstStem && stem && (
          stem.startsWith(firstStem.slice(0,10)) ||
          firstStem.startsWith(stem.slice(0,10))
        ))

      if (duplicate) { (img.closest('figure, picture') || img).remove() }
      else { 
          seenKeys.add(key); if (nstem) seenNormStems.add(nstem) 
          const prox = proxyImageSrc(abs)
          const pinned = withCacheBust(prox, bust)
          img.setAttribute('src', pinned)
          img.removeAttribute('data-src'); img.removeAttribute('srcset'); img.removeAttribute('sizes')
          img.setAttribute('loading', 'lazy')
          img.setAttribute('decoding', 'async')
          img.setAttribute('referrerpolicy', 'no-referrer')
          img.setAttribute('crossorigin', 'anonymous')
      }
    })
  }

  wrap.querySelectorAll('picture,source').forEach((n) => n.replaceWith(...Array.from(n.childNodes)))
  return { html: wrap.innerHTML, firstImg: firstImgPinned }
}

export default function ArticlePreview({ url, onClose }: Props) {
  const [content, setContent] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [site, setSite] = useState<string>('')
  const [coverSnapSrc, setCoverSnapSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [progress, setProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const shareBtnRef = useRef<HTMLButtonElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const [snapMsg, setSnapMsg] = useState<string>('')
  const snapMsgTimer = useRef<number | null>(null)
  const snapshotRef = useRef<HTMLDivElement>(null)

  const cacheBust = useMemo(() => Math.random().toString(36).slice(2), [url])

  const coarsePointerRef = useRef(false)
  useEffect(() => { try { coarsePointerRef.current = window.matchMedia('(pointer: coarse)').matches } catch {} }, [])
  const supportsWebShare = typeof navigator !== 'undefined' && 'share' in navigator && typeof window !== 'undefined' && window.isSecureContext
  const preferNativeShare = supportsWebShare && coarsePointerRef.current

  const [useSheet, setUseSheet] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const set = () => setUseSheet(mq.matches)
    set()
    mq.addEventListener?.('change', set)
    return () => mq.removeEventListener?.('change', set)
  }, [])

  /* --- DINAMIČNA BARVA --- */
  const accentColor = useMemo(() => getSourceColor(site), [site]);

  // POPRAVEK: Simulacija progressa (ki ne povozi 100%)
  useEffect(() => {
    if (!loading) {
      return
    }
    setProgress(0)

    const interval = setInterval(() => {
      setProgress(old => {
        if (old >= 100) return 100 // Če smo ročno nastavili 100, ostani tam
        if (old >= 90) return 90   // Ustavi se na 90%
        const diff = Math.random() * 15
        return Math.min(old + diff, 90)
      })
    }, 200)
    
    return () => clearInterval(interval)
  }, [loading])

  // POPRAVEK: Nalaganje s hitrejšim finish efektom (150ms -> 80ms)
  useEffect(() => {
    let alive = true
    setContent(''); setCoverSnapSrc(null)
    setLoading(true); setError(null)
    // Resetiramo progress ob novem URL-ju
    setProgress(0)

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
        
        // --- ZMANJŠAN ZAMIK IZ 150ms NA 80ms ---
        setProgress(100)
        setTimeout(() => {
            if (alive) setLoading(false)
        }, 80)
        // ------------------------------

      } catch {
        if (!alive) return
        setError('Napaka pri nalaganju predogleda. Zaprite in poskusite ponovno.'); 
        setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [url, cacheBust])

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
    const encodedUrl    = encodeURIComponent(url)
    const rawTitle      = (title || site || '') + VIA_TEXT 
    const encodedTitle  = encodeURIComponent(rawTitle)
    
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

  const downloadBlob = useCallback((blob: Blob, filename = 'article-snapshot.png') => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }, [])

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
    root.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;pointer-events:none;z-index:-1;`
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
          showSnapMsg('Deljeno prek sistema.')
          setSnapshotBusy(false)
          return
        }
      }

      const canClipboard =
        !forceDownload &&
        'clipboard' in navigator &&
        typeof (window as any).ClipboardItem !== 'undefined' &&
        typeof navigator.clipboard?.write === 'function'

      if (canClipboard) {
        try {
          const CI = (window as any).ClipboardItem as { new (items: Record<string, Blob>): ClipboardItem }
          const item = new CI({
            'image/png': blob,
            'text/plain': new Blob([`Snapshot: ${title || site || ''}`], { type: 'text/plain' }),
          })
          await navigator.clipboard.write([item])
          showSnapMsg('Kopirano (PNG). Alt+klik za prenos.')
        } catch {
          downloadBlob(blob)
          showSnapMsg('PNG prenesen (clipboard ni podprt).')
        }
      } else {
        downloadBlob(blob)
        showSnapMsg('PNG prenesen.')
      }
    } catch (err) {
      console.error('Snapshot failed:', err)
      showSnapMsg('Napaka pri snapshotu.')
    } finally {
      setSnapshotBusy(false)
    }
  }, [doSnapshot, downloadBlob, title, site, showSnapMsg])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <style>{`
        body.preview-open { overflow: hidden; }
        body.preview-open a,
        body.preview-open a:hover,
        body.preview-open a:focus { text-decoration: none !important; }
        body.preview-open .group:hover { transform: none !important; }
        body.preview-open .group:hover * { text-decoration: none !important; }
        @media (prefers-reduced-motion: reduce) { .anim-soft { transition: none !important; } }
        ${PREVIEW_TYPO_CSS}
      `}</style>

      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 transition-opacity duration-300 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          ref={modalRef}
          style={{ '--accent-color': accentColor } as React.CSSProperties}
          className="bg-white/95 dark:bg-gray-900/95 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto border border-gray-200/10 transform transition-all duration-300 ease-out scale-95 opacity-0 animate-fadeInUp flex flex-col overflow-hidden relative"
        >
          {/* --- TOP ACCENT BORDER --- */}
          <div style={{ backgroundColor: accentColor }} className="h-1 w-full absolute top-0 left-0 z-20" />

          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200/20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-t-xl mt-1">
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
               {/* Križišče branding - POPRAVEK: Priority loading */}
               <div className="flex items-center gap-1.5 opacity-80 mb-1">
                  <NextImage 
                    src="/logo.png" 
                    width={16} 
                    height={16} 
                    alt="Križišče" 
                    className="object-contain" 
                    priority // Tole je nujno za takojšen prikaz
                    unoptimized 
                  />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand" style={{ color: accentColor }}>Križišče</span>
               </div>
               
               {/* Vir branding - POPRAVEK: Re-mount ob spremembi site-a */}
               <div className="flex items-center gap-2">
                  {/* --- POPRAVEK: POGOČNO RENDERING + KEY --- */}
                  {site && (
                    <div className="relative w-4 h-4 shrink-0 rounded-full overflow-hidden bg-gray-100" key={site}>
                        <NextImage 
                          src={`/logos/${site.replace('www.','').split('.')[0]}.png`}
                          alt={site}
                          fill
                          className="object-cover"
                          unoptimized
                          onError={(e) => { (e.target as HTMLElement).style.display='none' }}
                        />
                    </div>
                  )}
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{site}</span>
               </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 relative">
              {/* Gumb ODPRI s tekstom (Obarvan) */}
              <a 
                 href={url} target="_blank" rel="noopener" onClick={openSourceAndTrack}
                 style={{ color: accentColor }}
                 className="hidden sm:inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 hover:brightness-95 text-xs font-bold anim-soft"
                 title="Odpri celoten članek"
               >
                 <span>Odpri</span>
                 <IconExternal />
               </a>
               <a 
                 href={url} target="_blank" rel="noopener" onClick={openSourceAndTrack}
                 style={{ color: accentColor }}
                 className="sm:hidden inline-flex items-center justify-center rounded-lg h-8 w-8 text-sm bg-gray-50 dark:bg-gray-800 hover:brightness-95 anim-soft"
               >
                 <IconExternal />
               </a>

              {/* Snapshot */}
              <button
                type="button"
                onClick={handleSnapshot}
                disabled={snapshotBusy}
                aria-label="Snapshot"
                className="inline-flex items-center justify-center rounded-lg h-8 w-8 text-sm bg-gray-100/70 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
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

              {/* Share menu */}
              {shareOpen && (
                useSheet ? (
                  /* Mobile sheet */
                  <div ref={shareMenuRef} role="menu" aria-label="Deli" className="fixed inset-x-0 bottom-0 z-50">
                    <div className="mx-auto w-full max-w-2xl rounded-t-2xl border border-gray-200/20 bg-white dark:bg-gray-900 shadow-2xl">
                      <div className="flex justify-center py-2">
                        <span className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
                      </div>
                      <div className="px-4 pb-5 space-y-3">
                        <button
                          onClick={async () => { await copyToClipboard(); setShareOpen(false) }}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200/30 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                        >
                          <IconLink /> {copied ? 'Kopirano!' : 'Kopiraj povezavo'}
                        </button>
                        <div className="flex items-center justify-center gap-3 pt-1">
                          <button onClick={() => { openShareWindow(shareLinks.x); setShareOpen(false) }} className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 grid place-items-center transition"><IconX /></button>
                          <button onClick={() => { openShareWindow(shareLinks.fb); setShareOpen(false) }} className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 grid place-items-center transition"><IconFacebook /></button>
                          <button onClick={() => { openShareWindow(shareLinks.li); setShareOpen(false) }} className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 grid place-items-center transition"><IconLinkedIn /></button>
                          <button onClick={() => { openShareWindow(shareLinks.wa); setShareOpen(false) }} className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 grid place-items-center transition"><IconWhatsApp /></button>
                          <button onClick={() => { openShareWindow(shareLinks.tg); setShareOpen(false) }} className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 grid place-items-center transition"><IconTelegram /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Desktop popover */
                  <div ref={shareMenuRef} role="menu" aria-label="Deli" className="absolute right-24 top-10 z-50">
                    <div className="relative">
                      <div className="absolute right-8 -top-2 h-4 w-4 rotate-45 rounded-sm bg-white dark:bg-gray-900 border-l border-t border-gray-200/20" />
                      <div className="rounded-xl border border-gray-200/20 bg-white dark:bg-gray-900 shadow-2xl p-4 w-[360px] backdrop-blur space-y-3">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Deli</div>
                        <button onClick={async () => { await copyToClipboard(); setShareOpen(false) }} className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200/30 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-gray-700 transition"><IconLink /> {copied ? 'Kopirano!' : 'Kopiraj povezavo'}</button>
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => { openShareWindow(shareLinks.x); setShareOpen(false) }} className="h-11 w-11 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 grid place-items-center transition"><IconX /></button>
                          <button onClick={() => { openShareWindow(shareLinks.fb); setShareOpen(false) }} className="h-11 w-11 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 grid place-items-center transition"><IconFacebook /></button>
                          <button onClick={() => { openShareWindow(shareLinks.li); setShareOpen(false) }} className="h-11 w-11 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 grid place-items-center transition"><IconLinkedIn /></button>
                          <button onClick={() => { openShareWindow(shareLinks.wa); setShareOpen(false) }} className="h-11 w-11 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 grid place-items-center transition"><IconWhatsApp /></button>
                          <button onClick={() => { openShareWindow(shareLinks.tg); setShareOpen(false) }} className="h-11 w-11 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 grid place-items-center transition"><IconTelegram /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}

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
          <div className="px-5 pt-0 pb-5">
            {loading && (
              <div className="flex flex-col items-center justify-center py-10">
                 {/* POPRAVEK: SKELETON LOADER namesto kroga */}
                 <SkeletonLoader />
              </div>
            )}

            {!loading && !error && (
              <div className="preview-typo max-w-none text-gray-900 dark:text-gray-100">
                {/* This area is captured for snapshot */}
                <div key={url} ref={snapshotRef} className="relative">
                  {/* Naslov na vrhu */}
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
                    {title}
                  </h1>

                  <div dangerouslySetInnerHTML={{ __html: content }} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
                </div>

                <div className="mt-5 flex flex-col items-center gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener"
                    referrerPolicy="strict-origin-when-cross-origin"
                    onClick={openSourceAndTrack}
                    onAuxClick={onAuxOpen}
                    style={{ backgroundColor: accentColor }}
                    className="no-underline inline-flex justify-center rounded-full px-8 py-3 text-white text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform whitespace-nowrap"
                  >
                    Preberi celoten članek na {site} 🔗
                  </a>
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

        {/* --- NOVI GUMB ZA ZAPIRANJE (Zunaj okna) --- */}
        <button
          onClick={onClose}
          className="mt-4 flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors border border-white/10 shadow-lg shrink-0"
          aria-label="Zapri"
        >
          <svg 
            viewBox="0 0 24 24" 
            width="24" 
            height="24" 
            stroke="currentColor" 
            strokeWidth="2" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

      </div>
    </>,
    document.body
  )
}
