// components/Footer.tsx

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

  return (
    <footer className="mt-8 w-full relative">
      
      {/* --- SPREMEMBA: Dodan logo ornament na sredino črte --- */}
      <div className="absolute top-0 left-0 w-full -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
         <div className="bg-white dark:bg-[#0b101b] p-1.5 rounded-full border border-gray-100 dark:border-white/5 transition-colors">
            <Image src="/logo.png" alt="Križišče" width={20} height={20} className="w-5 h-5 object-contain opacity-80" />
         </div>
      </div>
      {/* ----------------------------------------------------- */}

      <div className="w-full h-px bg-gradient-to-r from-transparent via-brand/30 dark:via-brand/30 to-transparent opacity-80"></div>

      <div className="bg-gray-50/80 dark:bg-[#0b101b] pt-8 pb-8 transition-colors">
        <div className="mx-auto max-w-6xl px-4 md:px-8 lg:px-16 text-gray-800 dark:text-gray-400">
          <div className="grid gap-6 sm:grid-cols-3 items-start">
            
            {/* Levi stolpec: Info */}
            <div>
              <div className="flex items-center mb-2">
                <Image src="/logo.png" alt="Križišče" width={32} height={32} className="w-6 h-6 rounded-md mr-2" />
                <h4 className="text-base font-semibold text-gray-900 dark:text-gray-200">Križišče</h4>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-gray-500">
                Agregator najnovejših novic slovenskih medijev. <br />
                Članki so last izvornih portalov.
              </p>
            </div>
            
            {/* Srednji stolpec: Povezave */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-2">Povezave</h4>
              <ul className="space-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-500">
                <li><Link href="/arhiv" className="hover:text-brand dark:hover:text-brand transition">Arhiv</Link></li>
                <li><Link href="/projekt" className="hover:text-brand dark:hover:text-brand transition">O projektu</Link></li>
                <li><Link href="/pogoji" className="hover:text-brand dark:hover:text-brand transition">Pogoji uporabe</Link></li>
                <li><Link href="/zasebnost" className="hover:text-brand dark:hover:text-brand transition">Politika zasebnosti</Link></li>
              </ul>
            </div>
            
            {/* Desni stolpec: Kontakt */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-2">Kontakt</h4>
              <a href="mailto:gjkcme@gmail.com" className="text-xs sm:text-sm text-gray-600 dark:text-gray-500 hover:text-brand dark:hover:text-brand transition">
                Pošljite nam sporočilo
              </a>
            </div>
          </div>

          {/* Gumb za Vire */}
          <div className="mt-6 flex justify-center">
            <div className="relative">
              <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen(v => !v)}
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 ring-1 ring-black/5 dark:ring-white/5
                           text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200
                           bg-white hover:bg-gray-50 dark:bg-[#151a25] dark:hover:bg-[#1c2230]
                           transition shadow-sm"
                aria-haspopup="dialog"
                aria-expanded={open}
              >
                <IconSignpost className="h-3.5 w-3.5 opacity-70" />
                <span className="text-xs sm:text-sm font-medium">Viri</span>
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
                  <p className="px-1 pb-3 text-[11px] uppercase tracking-wide text-gray-500 text-center">Viri novic</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {SOURCES.map((it) => {
                      const origin = new URL(it.url).origin
                      return (
                        <a key={it.name} href={it.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 transition">
                          <LogoImg slug={it.slug} origin={origin} label={it.name} />
                          <span className="text-sm">{it.name}</span>
                          <span className="ml-auto text-xs text-gray-500">↗</span>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Copyright vrstica */}
          <div className="border-t border-gray-200 dark:border-white/5 mt-6 pt-4 text-center text-xs text-gray-500 dark:text-gray-600 pb-[calc(env(safe-area-inset-bottom,0px))]">
            {/* SPREMEMBA: Odstranjen font-serif, ohranjen italic */}
            <p className="italic mb-1 opacity-80 font-sans">Informacija ni znanje. Edino razumevanje šteje.</p>
            <p className="opacity-80">© {year} Križišče – Vse pravice pridržane.</p>
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
