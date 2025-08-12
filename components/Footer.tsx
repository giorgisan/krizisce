// components/Footer.tsx
import { useState, useRef } from 'react'
import Link from 'next/link'

const SOURCE_LINKS = [
  { name: 'RTVSLO', url: 'https://www.rtvslo.si' },
  { name: '24ur', url: 'https://www.24ur.com' },
  { name: 'Siol.net', url: 'https://www.siol.net' },
  { name: 'Slovenske novice', url: 'https://www.slovenskenovice.si' },
  { name: 'Delo', url: 'https://www.delo.si' },
  { name: 'Žurnal24', url: 'https://www.zurnal24.si' },
  { name: 'N1', url: 'https://n1info.si' },
  { name: 'Svet24', url: 'https://novice.svet24.si' }
]

export default function Footer() {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-6 mt-8 border-t border-gray-800 relative">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-8">
        {/* Leva kolona: logotip in opis */}
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

        {/* Srednja kolona: navigacijske povezave */}
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

        {/* Desna kolona: kontakt */}
        <div className="flex-1 relative">
          <h4 className="text-white font-semibold mb-4">Kontakt</h4>
          <p className="text-sm font-normal mb-6">
            <a href="mailto:gjkcme@gmail.com" className="hover:text-white transition">
              Pošljite nam sporočilo
            </a>
          </p>

          {/* Gumb Viri */}
          <div ref={anchorRef} className="relative flex justify-center sm:justify-start">
            <button
              onClick={() => setOpen(v => !v)}
              className="inline-flex items-center gap-2 rounded-full bg-gray-800/55 ring-1 ring-white/10 hover:bg-gray-800/75 px-4 py-2 text-gray-300 hover:text-white transition"
              aria-expanded={open}
              aria-controls="sources-panel"
            >
              <span className="relative h-4 w-4">
                <span className="absolute inset-0 animate-spin-slower opacity-60">
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 h-1 w-1 rounded-full bg-white/70" />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-white/60" />
                  <span className="absolute left-1/2 bottom-0 -translate-x-1/2 h-1 w-1 rounded-full bg-white/50" />
                </span>
              </span>
              <span className="font-medium">Viri</span>
            </button>

            {/* Panel nad gumbom */}
            {open && (
              <div
                className="absolute bottom-full mb-4 w-[min(92vw,64rem)] rounded-2xl bg-gray-900/85 backdrop-blur shadow-2xl ring-1 ring-white/10 p-4 sm:p-6 animate-fadeDown"
              >
                <p className="px-1 pb-3 text-[11px] uppercase tracking-wide text-gray-500">
                  Viri novic
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {SOURCE_LINKS.map((it) => (
                    <a
                      key={it.name}
                      href={it.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-800/70 text-gray-200 transition"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-gray-800/80 text-[10px] font-semibold text-gray-300">
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
      </div>

      {/* Spodnji trak z citatom in avtorsko vrstico */}
      <div className="border-t border-gray-800 mt-12 pt-4 text-center text-sm font-normal text-gray-500">
        <p className="italic mb-2">
          “Informacija ni znanje. Edino razumevanje šteje.” – Albert Einstein
        </p>
        <p>© {new Date().getFullYear()} Križišče – Vse pravice pridržane.</p>
      </div>

      <style jsx>{`
        @keyframes fadeDown {
          0%   { opacity: 0; transform: translateY(8px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .animate-fadeDown { animation: fadeDown .28s cubic-bezier(.2,.6,.2,1) both; }
        .animate-spin-slower { animation: spin 4s linear infinite; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </footer>
  )
}
