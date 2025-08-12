// components/Footer.tsx

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type SourceLink = { name: string; url: string }

// Uredi/dopolni po svojih dejanskih virih:
const SOURCE_LINKS: SourceLink[] = [
  { name: 'RTVSLO', url: 'https://www.rtvslo.si' },
  { name: '24ur', url: 'https://www.24ur.com' },
  { name: 'Siol.net', url: 'https://siol.net' },
  { name: 'Slovenske novice', url: 'https://www.slovenskenovice.si' },
  { name: 'Delo', url: 'https://www.delo.si' },
  { name: 'Žurnal24', url: 'https://www.zurnal24.si' },
  { name: 'N1', url: 'https://n1info.si' },
  { name: 'Svet24', url: 'https://www.svet24.si' },
]

// Diskreten gumb + drop‑up meni (brez scrolla)
function SourcesDropup({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // zapri na klik izven ali ESC
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-gray-800/50 ring-1 ring-white/10 hover:bg-gray-800/70 px-3 py-1.5 text-gray-300 hover:text-white transition"
      >
        {/* Zelo diskretna animacija treh krogcev */}
        <span className="relative h-4 w-4">
          <span className="absolute inset-0 animate-spin-ultra-slow opacity-60">
            <span className="absolute left-1/2 top-0 -translate-x-1/2 h-1 w-1 rounded-full bg-white/70" />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-white/60" />
            <span className="absolute left-1/2 bottom-0 -translate-x-1/2 h-1 w-1 rounded-full bg-white/50" />
          </span>
        </span>
        <span className="font-medium">Viri</span>
      </button>

      {/* Drop‑UP meni – brez max-height ⇒ brez scrolla, pokaže VSE */}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          className="absolute bottom-11 right-0 w-[min(92vw,44rem)] rounded-xl bg-gray-900/95 backdrop-blur shadow-xl ring-1 ring-white/10 p-3 z-50"
        >
          <p className="px-1 pb-2 text-[11px] uppercase tracking-wide text-gray-500">
            Viri novic
          </p>
          {/* Responsive grid – brez scrolla; meni se po potrebi višinsko razširi navzgor */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {SOURCE_LINKS.map(it => (
              <a
                key={it.name}
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800/70 text-gray-200"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gray-800/80 text-[10px] font-semibold text-gray-300">
                  {it.name.slice(0, 2)}
                </span>
                <span className="text-sm">{it.name}</span>
                <span className="ml-auto text-xs text-gray-500">↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* lokalni stil za počasno rotacijo */}
      <style jsx>{`
        .animate-spin-ultra-slow { animation: spin 12s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ...
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-6 mt-8 border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-8">
        {/* Leva kolona */}
        <div className="flex-1">
          <div className="flex items-center mb-4">
            <img src="/logo.png" alt="Križišče" className="w-8 h-8 rounded-full mr-2" />
            <h4 className="text-white font-semibold text-lg">Križišče</h4>
          </div>
          <p className="text-sm font-normal leading-relaxed">
            Agregator najnovejših novic iz slovenskih medijev. <br />
            Članki so last izvornih portalov.
          </p>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-gray-800"></div>

        {/* Srednja kolona */}
        <div className="flex-1">
          <h4 className="text-white font-semibold mb-4">Povezave</h4>
          <ul className="space-y-2 text-sm font-normal">
            <li>
              <Link href="/projekt" className="hover:text-white transition">
                O projektu
              </Link>
            </li>
            <li>
              <Link href="/pogoji" className="hover:text-white transition">
                Pogoji uporabe
              </Link>
            </li>
          </ul>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-gray-800"></div>

        {/* Desna kolona */}
        <div className="flex-1">
          <h4 className="text-white font-semibold mb-4">Kontakt</h4>
          <p className="text-sm font-normal">
            <a href="mailto:gjkcme@gmail.com" className="hover:text-white transition">
              Pošljite nam sporočilo
            </a>
          </p>
        </div>
      </div>

      {/* Gumb Viri – center aligned pod stolpci */}
      <div className="mt-8 flex justify-center">
        <SourcesDropup />
      </div>

      {/* Spodnji trak */}
      <div className="border-t border-gray-800 mt-12 pt-4 text-center text-sm font-normal text-gray-500">
        <p className="italic mb-2">
          “Informacija ni znanje. Edino razumevanje šteje.” – Albert Einstein
        </p>
        <p>© {new Date().getFullYear()} Križišče – Vse pravice pridržane.</p>
      </div>
    </footer>
  )
}
