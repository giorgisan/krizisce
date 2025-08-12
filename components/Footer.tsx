// components/Footer.tsx
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type SourceLink = { name: string; url: string }

// Uredi po svojih dejanskih virih (dodaj/odstrani)
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

export default function Footer() {
  const year = new Date().getFullYear()

  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Zapri ob kliku izven ali pritisku ESC
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
    <footer className="mt-12 border-t border-gray-800/80">
      <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-400">
        {/* Levo: copyright / link do About (če ga imaš) */}
        <div className="text-center sm:text-left">
          © {year} <span className="text-white font-semibold">Križišče</span>
          <span className="mx-2">•</span>
          <Link href="/" className="hover:text-white transition">Domov</Link>
        </div>

        {/* Desno: diskreten gumb “Viri” z mehko animacijo krogcev */}
        <div className="relative flex justify-center sm:justify-end">
          <button
            ref={btnRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
            className="inline-flex items-center gap-2 rounded-full bg-gray-800/60 ring-1 ring-white/10 hover:bg-gray-800 px-3 py-1.5 text-gray-300 hover:text-white transition"
          >
            {/* Nežna animacija – trije krogci, počasna rotacija, nizek kontrast */}
            <span className="relative h-4 w-4">
              <span className="absolute inset-0 animate-spin-slower opacity-70">
                <span className="absolute left-1/2 top-0 -translate-x-1/2 h-1 w-1 rounded-full bg-white/70" />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-white/60" />
                <span className="absolute left-1/2 bottom-0 -translate-x-1/2 h-1 w-1 rounded-full bg-white/50" />
              </span>
            </span>
            <span className="font-medium">Viri</span>
          </button>

          {/* Drop‑down meni (drop‑up, ker smo v footerju) */}
          {open && (
            <div
              ref={menuRef}
              role="menu"
              tabIndex={-1}
              className="absolute bottom-11 right-0 w-72 max-h-80 overflow-auto rounded-xl bg-gray-900/95 backdrop-blur shadow-xl ring-1 ring-white/10 p-2 z-50"
            >
              <p className="px-2 pb-2 text-[11px] uppercase tracking-wide text-gray-500">
                Seznam virov
              </p>
              <div className="grid gap-1">
                {SOURCE_LINKS.map((it) => (
                  <a
                    key={it.name}
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800/80 text-gray-200"
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
        </div>
      </div>

      {/* Lokalni stil za počasnejšo rotacijo; barvni odtenki ostanejo diskretni */}
      <style jsx>{`
        .animate-spin-slower {
          animation: spin 10s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </footer>
  )
}
