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
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <footer className="mt-8">
      <div className="mx-auto max-w-6xl px-4 md:px-8 lg:px-16 text-gray-800 dark:text-gray-300">
        {/* Vsebina */}
        <div className="grid gap-6 sm:grid-cols-3 items-start">
          {/* Levo */}
          <div>
            <div className="flex items-center mb-3">
              <Image src="/logo.png" alt="Križišče" width={32} height={32} className="w-8 h-8 rounded-md mr-2" />
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Križišče</h4>
            </div>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              Agregator najnovejših novic slovenskih medijev. <br />
              Članki so last izvornih portalov.
            </p>
          </div>

          {/* Sredina – diskretne povezave, brez CTA boxa */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3">Povezave</h4>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/arhiv" className="hover:text-gray-900 dark:hover:text-white transition">Arhiv</Link></li>
              <li><Link href="/projekt" className="hover:text-gray-900 dark:hover:text-white transition">O projektu</Link></li>
              <li><Link href="/pogoji" className="hover:text-gray-900 dark:hover:text-white transition">Pogoji uporabe</Link></li>
            </ul>
          </div>

          {/* Desno */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3">Kontakt</h4>
            <a href="mailto:gjkcme@gmail.com" className="text-sm hover:text-gray-900 dark:hover:text-white transition">
              Pošljite nam sporočilo
            </a>
          </div>
        </div>

        {/* Viri – ostane kot nevtralen popover */}
        <div className="mt-6 flex justify-center">
          <div className="relative">
            <button
              ref={btnRef}
              type="button"
              onClick={() => setOpen(v => !v)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1 ring-black/10 dark:ring-white/10
                         text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white
                         bg-white/60 hover:bg-white/80 dark:bg-gray-900/60 dark:hover:bg-gray-900/80 
                         backdrop-blur-md transition"
              aria-haspopup="dialog"
              aria-expanded={open}
            >
              <IconSignpost className="h-4 w-4 opacity-80" />
              <span className="text-sm font-medium">Viri</span>
            </button>

            {open && (
              <div
                ref={popRef}
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3
                           w-[min(92vw,64rem)] rounded-2xl
                           bg-white/90 dark:bg-gray-900/85 backdrop-blur-md
                           ring-1 ring-black/10 dark:ring-white/10 shadow-2xl p-4 sm:p-6 animate-popoverFade"
                role="dialog"
                aria-label="Viri novic"
              >
                <p className="px-1 pb-3 text-[11px] uppercase tracking-wide text-gray-500 text-center">
                  Viri novic
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {SOURCES.map((it) => {
                    const origin = new URL(it.url).origin
                    return (
                      <a
                        key={it.name}
                        href={it.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2 py-2 rounded-lg text-gray-700 dark:text-gray-300
                                   hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-gray-800/70 transition"
                      >
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

        {/* Ločnica + copyright */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-4 text-center text-sm text-gray-600 dark:text-gray-500
                        pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
          <p className="italic mb-2">“Informacija ni znanje. Edino razumevanje šteje.” — Albert Einstein</p>
          <p>© {year} Križišče – Vse pravice pridržane.</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes popoverFade {
          0% { opacity: 0; transform: translate(-50%, 8px) scale(0.985); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .animate-popoverFade { animation: popoverFade .18s ease-out both; }
      `}</style>
    </footer>
  )
}
