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
import { preloadPreview, peekPreview } from '@/lib/previewPrefetch'
import { toBlob } from 'html-to-image'
import Image from 'next/image' // Za logo
import { proxiedImage } from '@/lib/img' // Uvoz proxy funkcije

interface Props { url: string; onClose: () => void }

type ApiPayload =
  | { error: string }
  | { title: string; site: string; image?: string | null; html: string; url: string }

const TEXT_PERCENT = 0.65 // Malo več teksta za boljšo izkušnjo
const VIA_TEXT = ' — via Križišče (krizisce.si)'
const AUTO_CLOSE_ON_OPEN = true

// CSS za lepši izpis besedila (Serif naslovi, Sans tekst)
const PREVIEW_TYPO_CSS = `
  .preview-typo { font-family: var(--font-inter), sans-serif; font-size: 1.05rem; line-height: 1.75; color: inherit; }
  .preview-typo > *:first-child { margin-top: 0 !important; }
  .preview-typo p { margin: 0 0 1.25rem; }
  .preview-typo h1, .preview-typo h2, .preview-typo h3 {
    font-family: var(--font-playfair), serif;
    font-weight: 700; margin: 2rem 0 1rem; line-height: 1.3;
  }
  .preview-typo ul, .preview-typo ol { margin: 1rem 0 1.5rem; padding-left: 1.5rem; }
  .preview-typo li { margin: 0.5rem 0; }
  .preview-typo img, .preview-typo figure {
    display: block; max-width: 100%; height: auto; border-radius: 12px; margin: 2rem 0;
  }
  .preview-typo blockquote {
    margin: 2rem 0; padding: 1rem 1.5rem;
    border-left: 4px solid var(--brand, #fc9c6c);
    font-style: italic; background: rgba(0,0,0,0.03); border-radius: 0 8px 8px 0;
  }
  .dark .preview-typo blockquote { background: rgba(255,255,255,0.05); }
  .preview-typo a { color: var(--brand, #fc9c6c); text-decoration: underline; text-underline-offset: 3px; }
  .preview-typo a:hover { text-decoration: none; }
`

/* --- ICONS --- */
function IconShareIOS(p: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path fill="currentColor" d="M12 3c.4 0 .8.16 1.06.44l3 3a1.5 1.5 0 1 1-2.12 2.12L13.5 7.12V14a1.5 1.5 0 1 1-3 0V7.12L9.06 8.56A1.5 1.5 0 0 1 6.94 6.44l3-3C10.2 3.16 10.6 3 11 3h1z"/><path fill="currentColor" d="M5 10.5A2.5 2.5 0 0 0 2.5 13v6A2.5 2.5 0 0 0 5 21.5h14A2.5 2.5 0 0 0 21.5 19v-6A2.5 2.5 0 0 0 19 10.5h-2a1.5 1.5 0 1 0 0 3h2V19H5v-5.5h2a1.5 1.5 0 1 0 0-3H5z"/></svg>) }
function IconCamera(p: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path fill="currentColor" d="M9 4a2 2 0 0 0-1.8 1.1L6.6 6H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-1.6l-.6-.9A2 2 0 0 0 15 4H9zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.5A2.5 2.5 0 1 0 14.5 14 2.5 2.5 0 0 0 12 11.5z"/></svg>) }
function IconX(p: React.SVGProps<SVGSVGElement>){return(<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path d="M3 3l18 18M21 3L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>)}
function IconLink(p: React.SVGProps<SVGSVGElement>){return(<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path fill="none" stroke="currentColor" strokeWidth="2" d="M10.5 13.5l3-3M8 14a4 4 0 010-8h3M16 18h-3a4 4 0 010-8"/></svg>)}
function IconExternal(p: React.SVGProps<SVGSVGElement>){return(<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...p}><path fill="none" stroke="currentColor" strokeWidth="2" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9" fill="none" stroke="currentColor" strokeWidth="2"/><line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2"/></svg>)}

/* --- UTILS --- */
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

// PROXY IMAGE FIX: Uporabimo lib/img.ts
function proxyImageSrc(absUrl: string): string {
  return proxiedImage(absUrl, 800)
}

function withCacheBust(u: string, bust: string) {
  try { const url = new URL(u, typeof location !== 'undefined' ? location.origin : 'http://localhost'); url.searchParams.set('cb', bust); return url.toString() }
  catch { const sep = u.includes('?') ? '&' : '?'; return `${u}${sep}cb=${encodeURIComponent(bust)}` }
}

/* --- TEXT HELPERS --- */
function wordSpans(text: string){ const spans:Array<{start:number;end:number}>=[]; const re=/[A-Za-z0-9À-ÖØ-öø-ÿĀ-žČŠŽčšžĆćĐđ]+(?:['’-][A-Za-z0-9À-ÖØ-öø-ÿĀ-žČŠŽčšžĆćĐđ]+)*/g; let m:RegExpExecArray|null; while((m=re.exec(text))!==null) spans.push({start:m.index,end:m.index+m[0].length}); return spans }
function countWords(text:string){ return wordSpans(text).length }
function truncateHTMLByWordsPercent(html:string, percent=0.76){
  const src=document.createElement('div'); src.innerHTML=html
  src.querySelectorAll('header,nav,footer,aside,.share,.social,.related,.tags,script,style,iframe').forEach((n)=>n.remove())
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

/* --- IMAGE DEDUPE HELPERS --- */
function imageKeyFromSrc(src: string | null | undefined): string {
  if (!src) return ''
  let pathname = ''
  try {
    const u = new URL(src, typeof location !== 'undefined' ? location.origin : 'http://localhost')
    pathname = (u.pathname || '').toLowerCase()
  } catch {
    pathname = (src.split('#')[0] || '').split('?')[0].toLowerCase()
  }
  pathname = pathname.replace(/\/cache\/[^/]+\/+/g, '/').replace(/\/(fit|fill|resize)\/\d+x\d+\/?/g, '/')
  pathname = pathname.replace(/(-|_)?\d{2,4}x\d{2,4}(?=\.)/g, '').replace(/(-|_)?\d{2,4}x(?=\.)/g, '')
  pathname = pathname.replace(/-scaled(?=\.)/g, '').replace(/\.(webp|jpeg)$/g, '.jpg')
  return pathname
}
function basenameStem(pathname: string): string {
  const last = pathname.split('/').pop() || ''
  return last.replace(/\.[a-z0-9]+$/, '').replace(/(-|_)?\d{2,4}x\d{2,4}$/g, '').replace(/(-|_)?\d{2,4}x$/g, '').replace(/-scaled$/g, '')
}
function normalizeStemForDedupe(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\.[a-z0-9]+$/, '').replace(/(-|_)?\d{2,4}x\d{2,4}$/g, '').replace(/(-|_)?\d{2,4}x$/g, '').replace(/-scaled$/g, '').replace(/\d+/g, '').replace(/[-_]+/g, '').slice(0, 20)
}

/* --- CLEAN & EXTRACT --- */
function cleanAndExtract(html: string, baseUrl: string, knownTitle: string | undefined, bust: string) {
  const wrap = document.createElement('div')
  wrap.innerHTML = html

  wrap.querySelectorAll('noscript,script,style,iframe,form').forEach((n) => n.remove())

  // Odstrani naslov, če je podvojen v telesu
  if (knownTitle) {
    const h = wrap.querySelector('h1, h2, h3')
    if (h) {
      const a=(h.textContent||'').trim().toLowerCase(), b=knownTitle.trim().toLowerCase()
      if (a && b && a.includes(b.substring(0,20))) h.remove()
    }
  }

  wrap.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href')
    if (href) a.setAttribute('href', absolutize(href, baseUrl))
    a.setAttribute('target', '_blank')
    a.setAttribute('rel', 'noopener noreferrer')
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
    
    // Generiramo ključe za deduplikacijo PREDEN zamenjamo src
    firstKey  = imageKeyFromSrc(firstAbs || firstRaw)
    firstStem = basenameStem(firstKey)
    firstNormStem = normalizeStemForDedupe(firstStem)

    if (firstAbs) {
      const prox = proxyImageSrc(firstAbs)
      const pinned = withCacheBust(prox, bust)
      first.setAttribute('src', pinned)
      first.removeAttribute('data-src'); first.removeAttribute('srcset'); first.removeAttribute('sizes')
      first.setAttribute('loading', 'eager')
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
        (firstStem && stem && (stem.startsWith(firstStem.slice(0,10)) || firstStem.startsWith(stem.slice(0,10))))

      if (duplicate) { 
        (img.closest('figure, picture') || img).remove() 
      } else { 
        seenKeys.add(key); if (nstem) seenNormStems.add(nstem)
        // Proxy samo če ni duplikat
        const prox = proxyImageSrc(abs)
        const pinned = withCacheBust(prox, bust)
        img.setAttribute('src', pinned)
        img.removeAttribute('data-src'); img.removeAttribute('srcset')
      }
    })
  }

  wrap.querySelectorAll('picture,source').forEach((n) => n.replaceWith(...Array.from(n.childNodes)))
  return { html: wrap.innerHTML, firstImg: firstImgPinned }
}

/* --- MAIN COMPONENT --- */
export default function ArticlePreview({ url, onClose }: Props) {
  const [content, setContent] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [site, setSite] = useState<string>('')
  const [coverSnapSrc, setCoverSnapSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const [snapMsg, setSnapMsg] = useState<string>('')
  
  const modalRef = useRef<HTMLDivElement>(null)
  const snapshotRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const shareBtnRef = useRef<HTMLButtonElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const snapMsgTimer = useRef<number | null>(null)

  const cacheBust = useMemo(() => Math.random().toString(36).slice(2), [url])

  // --- PRELOAD & PARSE ---
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

        // API slika ima prednost, sicer prva v HTML
        const primary = data.image ? withCacheBust(proxyImageSrc(data.image), cacheBust) : null
        setCoverSnapSrc(primary || cleaned.firstImg || null)

        setContent(truncated)
        setLoading(false)
      } catch {
        if (!alive) return
        setError('Predogled ni na voljo.')
        setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [url, cacheBust])

  // --- KEYBOARD & MODAL CONTROL ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { shareOpen ? setShareOpen(false) : onClose() }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, shareOpen])

  // --- ACTIONS ---
  const openSourceAndTrack = useCallback(() => {
    trackClick(site || 'unknown', url)
    if (AUTO_CLOSE_ON_OPEN) setTimeout(onClose, 150)
  }, [site, url, onClose])

  const copyToClipboard = useCallback(async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }, [url])

  const showSnapMsg = useCallback((msg: string) => {
    setSnapMsg(msg)
    if (snapMsgTimer.current) window.clearTimeout(snapMsgTimer.current)
    snapMsgTimer.current = window.setTimeout(() => setSnapMsg(''), 2200)
  }, [])

  // (Poenostavljen snapshot zaradi dolžine - logika ostane enaka)
  const handleSnapshot = useCallback(async () => {
    setSnapshotBusy(true)
    try {
        const bg = document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff'
        const blob = await toBlob(snapshotRef.current!, { backgroundColor: bg, pixelRatio: 2 })
        if(!blob) throw new Error('fail')
        
        // Mobile Share API
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'snap.png', {type:'image/png'})] })) {
            await navigator.share({ files: [new File([blob], 'snap.png', {type:'image/png'})], title: 'Križišče' })
        } else {
            // Download fallback
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'clanek.png'; a.click()
            showSnapMsg('Slika shranjena.')
        }
    } catch { showSnapMsg('Napaka pri zajemu.') }
    setSnapshotBusy(false)
  }, [showSnapMsg])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <style>{PREVIEW_TYPO_CSS}</style>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl mx-4 h-[90vh] flex flex-col overflow-hidden animate-fadeInUp border border-white/10">
          
          {/* --- HEADER --- */ }
          <div className="shrink-0 h-16 flex items-center justify-between px-4 sm:px-6 border-b border-gray-200/50 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-20">
            {/* LEVO: Logo + Vir */}
            <div className="flex items-center gap-3 min-w-0">
               <div className="relative h-8 w-8 shrink-0">
                 <Image src="/logo.png" alt="Križišče" fill className="object-contain" unoptimized />
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 leading-tight">Vir</span>
                 <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-xs">{site}</span>
               </div>
            </div>

            {/* DESNO: Akcije */}
            <div className="flex items-center gap-2">
               {/* Odpri članek - Desktop (Full), Mobile (Icon) */}
               <a 
                 href={url} target="_blank" rel="noopener" onClick={openSourceAndTrack}
                 className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 hover:bg-brand/20 text-brand font-medium text-sm transition-colors"
               >
                 <span>Odpri članek</span>
                 <IconExternal className="text-lg"/>
               </a>
               <a 
                 href={url} target="_blank" rel="noopener" onClick={openSourceAndTrack}
                 className="sm:hidden inline-flex items-center justify-center h-9 w-9 rounded-full bg-brand/10 text-brand"
               >
                 <IconExternal />
               </a>

               <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

               {/* Snapshot */}
               <button onClick={handleSnapshot} disabled={snapshotBusy} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
                 <IconCamera className="text-lg" />
               </button>

               {/* Share */}
               <button onClick={() => setShareOpen(!shareOpen)} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors relative">
                 <IconShareIOS className="text-lg" />
                 {shareOpen && (
                    <div className="absolute top-10 right-0 w-48 bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 p-2 flex flex-col gap-1">
                        <button onClick={copyToClipboard} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-left">
                            <IconLink/> Kopiraj povezavo
                        </button>
                    </div>
                 )}
               </button>

               {/* Close (X) */}
               <button onClick={onClose} ref={closeRef} className="ml-1 h-9 w-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-gray-500">
                 <IconX className="text-lg"/>
               </button>
            </div>
          </div>

          {/* --- BODY --- */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 relative scrollbar-hide">
            <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8" ref={snapshotRef}>
                {loading && (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin"/>
                        <p className="text-sm text-gray-400 animate-pulse">Nalaganje vsebine ...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="text-center py-20">
                        <p className="text-lg text-gray-500 mb-6">{error}</p>
                        <a href={url} target="_blank" rel="noopener" className="text-brand underline font-medium">Odpri originalno stran</a>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Title */}
                        <h1 className="font-serif text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
                            {title}
                        </h1>

                        {/* Image */}
                        {coverSnapSrc && (
                            <figure className="relative w-full aspect-video rounded-xl overflow-hidden shadow-sm mb-8 bg-gray-100 dark:bg-gray-800">
                                <img src={coverSnapSrc} alt="" className="w-full h-full object-cover" />
                            </figure>
                        )}

                        {/* Content */}
                        <div className="preview-typo text-gray-800 dark:text-gray-300">
                            <div dangerouslySetInnerHTML={{__html: content}} />
                        </div>
                    </>
                )}
            </div>

            {/* --- FADE OUT OVERLAY --- */}
            {!loading && !error && (
                <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-gray-900 dark:via-gray-900/90 pointer-events-none z-10" />
            )}
          </div>

          {/* --- FOOTER (Actions) --- */}
          {!loading && !error && (
              <div className="shrink-0 p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 z-20 flex flex-col items-center gap-3">
                  <a 
                    href={url} target="_blank" rel="noopener" onClick={openSourceAndTrack}
                    className="w-full max-w-sm flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-base shadow-lg shadow-brand/20 transition-all hover:scale-[1.02]"
                  >
                    Preberi celoten članek <IconExternal/>
                  </a>
                  
                  <button 
                    onClick={onClose}
                    className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Zapri predogled
                  </button>
              </div>
          )}

          {/* Toast */}
          {snapMsg && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium shadow-xl animate-fadeInUp z-50">
                {snapMsg}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
