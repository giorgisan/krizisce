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
    // SPREMEMBA: Odstranjen 'relative', barva ozadja poenostavljena
    <footer className="mt-12 w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
      
      <div className="pt-10 pb-8">
        <div className="mx-auto max-w-6xl px-4 md:px-8 lg:px-16 text-gray-800 dark:text-gray-400">
          <div className="grid gap-8 sm:grid-cols-3 items-start">
            
            {/* Levi stolpec: Info */}
            <div>
              <div className="flex items-center mb-3">
                <Image src="/logo.png" alt="Križišče" width={32} height={32} className="w-6 h-6 rounded-md mr-2" />
                <h4 className="text-base font-bold text-gray-900 dark:text-white">Križišče</h4>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                Agregator najnovejših novic slovenskih medijev. <br />
                Vse novice so last izvornih portalov.
              </p>
            </div>
            
            {/* Srednji stolpec: Povezave */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Povezave</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/arhiv" className="hover:text-brand dark:hover:text-brand transition">Arhiv novic</Link></li>
                <li><Link href="/projekt" className="hover:text-brand dark:hover:text-brand transition">O projektu</Link></li>
                <li><Link href="/pogoji" className="hover:text-brand dark:hover:text-brand transition">Pogoji uporabe</Link></li>
                <li><Link href="/zasebnost" className="hover:text-brand dark:hover:text-brand transition">Politika zasebnosti</Link></li>
              </ul>
            </div>
            
            {/* Desni stolpec: Kontakt */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Kontakt</h4>
              <a href="mailto:gjkcme@gmail.com" className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition block mb-4">
                gjkcme@gmail.com
              </a>
              
              {/* Gumb za Vire prestavljen sem za lepšo strukturo */}
              <div className="relative inline-block">
                <button
                  ref={btnRef}
                  type="button"
                  onClick={() => setOpen(v => !v)}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 ring-1 ring-gray-200 dark:ring-gray-700
                             text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white
                             bg-gray-50 hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700
                             transition text-xs font-medium"
                  aria-haspopup="dialog"
                  aria-expanded={open}
                >
                  <IconSignpost className="h-3.5 w-3.5 opacity-70" />
                  <span>Viri novic</span>
                </button>
                {open && (
                  <div
                    ref={popRef}
                    className="absolute left-0 bottom-full mb-2
                               w-72 sm:w-80 rounded-xl
                               bg-white dark:bg-gray-900
                               ring-1 ring-black/5 dark:ring-white/10 shadow-xl p-4 animate-popoverFade z-50"
                    role="dialog"
                    aria-label="Viri novic"
                  >
                    <p className="px-1 pb-3 text-[10px] uppercase tracking-wide text-gray-400 font-bold">Vključeni viri</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SOURCES.map((it) => {
                        const origin = new URL(it.url).origin
                        return (
                          <a key={it.name} href={it.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            <LogoImg slug={it.slug} origin={origin} label={it.name} />
                            <span className="text-xs font-medium">{it.name}</span>
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Copyright vrstica */}
          <div className="border-t border-gray-100 dark:border-gray-800 mt-10 pt-6 text-center text-xs text-gray-400 dark:text-gray-500 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
            {/* SPREMEMBA: Odstranjen font-serif, ohranjen italic */}
            <p className="italic mb-2 opacity-90">“Informacija ni znanje. Edino razumevanje šteje.” — Albert Einstein</p>
            <p>© {year} Križišče. Vse pravice pridržane.</p>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes popoverFade { 0% { opacity: 0; transform: translateY(8px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-popoverFade { animation: popoverFade .15s ease-out both; }
      `}</style>
    </footer>
  )
}
