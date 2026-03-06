'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type SourceLink = { name: string; url: string; slug: string }
const SOURCES: SourceLink[] = [
  { name: 'RTVSLO', url: 'https://www.rtvslo.si', slug: 'rtvslo' },
  { name: '24ur', url: 'https://www.24ur.com', slug: '24ur' },
  { name: 'Siol.net', url: 'https://siol.net', slug: 'siol' },
  { name: 'Slovenske novice', url: 'https://www.slovenskenovice.si', slug: 'slovenskenovice' },
  { name: 'Delo', url: 'https://www.delo.si', slug: 'delo' },
  { name: 'Dnevnik', url: 'https://www.dnevnik.si', slug: 'dnevnik' },
  { name: 'Žurnal24', url: 'https://www.zurnal24.si', slug: 'zurnal24' },
  { name: 'N1', url: 'https://n1info.si', slug: 'n1' },
  { name: 'Svet24', url: 'https://novice.svet24.si', slug: 'svet24' },
]

function IconSignpost(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3v18" /><path d="M5 6h9l-2.5 3H5z" /><path d="M19 14h-9l2.5-3H19z" />
    </svg>
  )
}

function LogoImg({ slug, origin, label }: { slug: string; origin: string; label: string }) {
  const candidates = [
    `/logos/${slug}.svg`,
    `/logos/${slug}.png`,
    `${origin}/favicon.ico`,
    `${origin}/favicon.png`,
    `${origin}/apple-touch-icon.png`,
  ]
  const [idx, setIdx] = useState(0)
  if (idx >= candidates.length) {
    const initials = label.split(/\s+/).map(w => w[0]?.toUpperCase()).slice(0, 2).join('')
    return (
      <div className="h-7 w-7 grid place-items-center rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold text-gray-700 dark:text-gray-200">
        {initials || '•'}
      </div>
    )
  }
  return (
    <Image
      src={candidates[idx]}
      alt={`${label} logo`}
      width={28}
      height={28}
      className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-700 object-cover"
      loading="lazy"
      onError={() => setIdx(i => i + 1)}
    />
  )
}

export default function Footer() {
  const year = new Date().getFullYear()
  const [open, setOpen] = useState(false)
  const popRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return
      const t = e.target as Node
      if (!popRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [open])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }) 
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Prišlo je do napake.')
      setStatus('success')
      setMsg(data.message)
      setEmail('')
    } catch (err: any) {
      setStatus('error')
      setMsg(err.message)
    }
  }

  return (
    <footer className="mt-16 w-full relative">
      <div className="absolute top-0 left-0 w-full -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
         <div className="bg-white dark:bg-[#0b101b] p-2 rounded-full border border-gray-100 dark:border-white/5 transition-colors">
            <Image src="/logo.png" alt="Križišče" width={35} height={35} className="w-7 h-7 object-contain opacity-65" />
         </div>
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-brand/30 dark:via-brand/30 to-transparent opacity-80"></div>

      <div className="bg-gray-50/80 dark:bg-[#0b101b] pt-12 pb-8 transition-colors">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 lg:px-12 text-gray-800 dark:text-gray-400">
          
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 items-start">
            
            {/* LEVI DEL: Opis in Kontakt */}
            <div className="lg:col-span-4 flex flex-col gap-8">
              <div>
                <div className="flex items-center mb-3">
                  <Image src="/logo.png" alt="Križišče" width={32} height={32} className="w-7 h-7 rounded-md mr-2.5" />
                  <h4 className="text-lg font-bold text-gray-900 dark:text-gray-200">Križišče</h4>
                </div>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-500 max-w-[280px]">
                  Agregator najnovejših novic slovenskih medijev. Članki so last izvornih portalov.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-2">Kontakt</h4>
                <a href="mailto:gjkcme@gmail.com" className="text-sm text-gray-600 dark:text-gray-500 hover:text-brand transition-colors">
                  Pošljite nam sporočilo
                </a>
              </div>
            </div>

            {/* SREDINA: Povezave */}
            <div className="lg:col-span-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-4">Povezave</h4>
              <ul className="space-y-2.5 text-sm text-gray-600 dark:text-gray-500">
                <li><Link href="/analiza" prefetch={false} className="hover:text-brand transition-colors">Medijski Monitor</Link></li>
                <li><Link href="/arhiv" className="hover:text-brand transition-colors">Arhiv novic</Link></li>
                <li><Link href="/projekt" className="hover:text-brand transition-colors">O projektu</Link></li>
                <li><Link href="/pogoji" className="hover:text-brand transition-colors">Pogoji uporabe</Link></li>
                <li><Link href="/zasebnost" className="hover:text-brand transition-colors">Politika zasebnosti</Link></li>
              </ul>
            </div>

            {/* DESNI DEL: Newsletter Box - KOMPAKTNA VERZIJA */}
            <div className="lg:col-span-5 w-full max-w-[420px]" id="narocnina">
              <div className="bg-white dark:bg-[#151a25]/60 border border-gray-200 dark:border-white/5 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col h-full">
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-brand text-xl leading-none">☕</span>
                    <h4 className="text-base font-bold text-gray-900 dark:text-gray-200">Jutranji pregled</h4>
                  </div>
                  <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-snug">
                    Zbudite se z najodmevnejšimi novicami v vašem nabiralniku.
                  </p>
                </div>

                {status === 'success' ? (
                  <div className="mt-auto text-sm text-green-700 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-4 py-4 rounded-xl border border-green-200 dark:border-green-800/30 text-center animate-pulse">
                    {msg}
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="mt-auto flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Vaš e-poštni naslov..."
                        required
                        disabled={status === 'loading'}
                        className="w-full flex-1 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0b101b] px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={status === 'loading' || !email}
                        className="w-full sm:w-auto shrink-0 rounded-xl bg-brand hover:brightness-110 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {status === 'loading' ? 'Prijava...' : 'Prijavi se'}
                      </button>
                    </div>

                    {status === 'error' && <p className="text-sm text-red-500 mt-1 font-medium">{msg}</p>}
                    
                    <div className="flex flex-col gap-1.5 mt-1">
                      {/* TUKAJ JE DODANO ZAGOTOVILO O ZASEBNOSTI */}
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight m-0">
                        S prijavo se strinjate s prejemanjem e-novic. Odjavite se lahko kadarkoli.<span className="font-medium text-gray-500 dark:text-gray-400">Vaše e-pošte ne bomo nikoli tržili ali delili.</span>
                      </p>
                      <Link href="/pregled" className="text-[12px] font-semibold text-brand hover:text-orange-400 transition-colors inline-flex items-center group self-start">
                        Preverite, kako izgleda današnji 'Jutranji pregled' <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
                      </Link>
                    </div>
                  </form>
                )}
              </div>
            </div>

          </div>

          {/* SPODNJI DEL: Gumb za vire in Copywright */}
          <div className="mt-14 flex justify-center">
            <div className="relative">
              <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen(v => !v)}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2 ring-1 ring-black/5 dark:ring-white/5
                           text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200
                           bg-white hover:bg-gray-50 dark:bg-[#151a25] dark:hover:bg-[#1c2230]
                           transition shadow-sm"
                aria-haspopup="dialog"
                aria-expanded={open}
              >
                <IconSignpost className="h-4 w-4 opacity-70" />
                <span className="text-sm font-medium">Viri novic</span>
              </button>
              {open && (
                <div
                  ref={popRef}
                  className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3
                             w-[min(92vw,64rem)] rounded-2xl
                             bg-white/95 dark:bg-[#0b101b]/95 backdrop-blur-xl
                             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl p-4 sm:p-6 animate-popoverFade z-50"
                  role="dialog"
                  aria-label="Viri novic"
                >
                  <p className="px-1 pb-3 text-[11px] uppercase tracking-wide text-gray-500 text-center font-bold">Naši viri</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {SOURCES.map((it) => {
                      const origin = new URL(it.url).origin
                      return (
                        <a key={it.name} href={it.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2 py-2 rounded-xl text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 transition">
                          <LogoImg slug={it.slug} origin={origin} label={it.name} />
                          <span className="text-sm font-medium">{it.name}</span>
                          <span className="ml-auto text-xs text-gray-500">↗</span>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-white/5 mt-8 pt-6 text-center text-xs text-gray-500 dark:text-gray-600 pb-[calc(env(safe-area-inset-bottom,0px))]">
            <p className="italic mb-1 opacity-80 font-sans">Informacija ni znanje. Edino razumevanje šteje.</p>
            <p className="opacity-80 font-medium">© {year > 2025 ? `2025-${year}` : '2025'} Križišče – Vse pravice pridržane.</p>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes popoverFade { 0% { opacity: 0; transform: translate(-50%, 8px) scale(0.985); } 100% { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        .animate-popoverFade { animation: popoverFade .18s ease-out both; }
      `}</style>
    </footer>
  )
}
