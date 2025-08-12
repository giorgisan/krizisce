// components/Footer.tsx
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const SOURCES = [
  { name: 'RTVSLO', url: 'https://www.rtvslo.si/' },
  { name: '24ur', url: 'https://www.24ur.com/' },
  { name: 'Siol.net', url: 'https://siol.net/' },
  { name: 'Slovenske novice', url: 'https://www.slovenskenovice.si/' },
  { name: 'Delo', url: 'https://www.delo.si/' },
  { name: 'Žurnal24', url: 'https://www.zurnal24.si/' },
  { name: 'N1', url: 'https://n1info.si/' },
  { name: 'Svet24', url: 'https://novice.svet24.si/' },
]

export default function Footer() {
  const year = new Date().getFullYear()
  const [open, setOpen] = useState(false)
  const panelRef  = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  // Zapri na ESC in klik izven panela
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDoc = (e: MouseEvent) => {
      if (!open) return
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDoc)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDoc)
    }
  }, [open])

  return (
    <footer className="relative bg-gray-900 text-gray-300 pt-12 pb-6 mt-8 border-t border-gray-800">
      {/* === Zgornji trije stolpci – nespremenjeno === */}
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

        <div className="hidden sm:block w-px bg-gray-800" />

        {/* Srednja kolona */}
        <div className="flex-1">
          <h4 className="text-white font-semibold mb-4">Povezave</h4>
          <ul className="space-y-2 text-sm font-normal">
            <li><Link href="/projekt" className="hover:text-white transition">O projektu</Link></li>
            <li><Link href="/pogoji" className="hover:text-white transition">Pogoji uporabe</Link></li>
          </ul>
        </div>

        <div className="hidden sm:block w-px bg-gray-800" />

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

      {/* === SREDINSKI BLOK: gumb + ABSOLUTNO CENTRIRAN PANEL NAD GUMBOM === */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="relative flex justify-center">
          {/* Gumb (manj vpadljiva ikona) */}
          <button
            ref={buttonRef}
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            aria-controls="sources-panel"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1 ring-white/10
                       text-gray-400 hover:text-white bg-gray-800/30 hover:bg-gray-800/50 transition"
          >
            {/* tri diskretne pike */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="1.4"
                 className="h-4 w-4 opacity-60">
              <circle cx="12" cy="12" r="1.2" />
              <circle cx="6" cy="12" r="1.2" />
              <circle cx="18" cy="12" r="1.2" />
            </svg>
            <span className="text-sm font-medium">Viri</span>
          </button>

          {/* Panel – absolutno centriran, navzgor, polprosojno ozadje */}
          {open && (
            <div
              id="sources-panel"
              ref={panelRef}
              className="absolute left-1/2 -translate-x-1/2 bottom-full mb-4
                         w-[min(92vw,64rem)] rounded-2xl bg-gray-900/85 backdrop-blur
                         ring-1 ring-white/10 shadow-2xl p-4 sm:p-6 animate-fadeUpFromBtn pointer-events-auto"
              style={{ marginTop: '0.5rem' }}
            >
              <p className="px-1 pb-3 text-[11px] uppercase tracking-wide text-gray-500 text-center">
                Viri novic
              </p>
              {/* brez max-height => brez scrolla; grid sredinsko poravnan */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 justify-items-center">
                {SOURCES.map((it) => (
                  <a
                    key={it.name}
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-2 rounded-lg text-gray-300
                               hover:text-white hover:bg-gray-800/60 transition"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-gray-800/70
                                       text-[10px] font-semibold text-gray-300">
                      {it.name.slice(0, 2)}
                    </span>
                    <span className="text-sm">{it.name}</span>
                    <span className="ml-auto text-xs text-gray-500">↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spodnji trak (citat + copyright) */}
      <div className="border-t border-gray-800 mt-12 pt-4 text-center text-sm font-normal text-gray-500">
        <p className="italic mb-2">
          “Informacija ni znanje. Edino razumevanje šteje.” – Albert Einstein
        </p>
        <p>© {year} Križišče – Vse pravice pridržane.</p>
      </div>

      {/* Animacija */}
      <style jsx>{`
        @keyframes fadeUpFromBtn {
          0%   { opacity: 0; transform: translateY(10px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .animate-fadeUpFromBtn { animation: fadeUpFromBtn .28s cubic-bezier(.2,.6,.2,1) both; }
      `}</style>
    </footer>
  )
}
