// components/SourcesMenu.tsx
import { useEffect, useRef, useState } from 'react'

type Item = { name: string; url: string }

type Props = {
  items: Item[]
  className?: string
}

export default function SourcesMenu({ items, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [top, setTop] = useState<number>(0)

  const btnRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // izračunaj top = spodnji rob headerja (panel se poravna pod header)
  const computeTop = () => {
    // najbližji <header> gumbovemu elementu
    const header = btnRef.current?.closest('header')
    const rect = header?.getBoundingClientRect()
    const t = (rect?.bottom ?? 56) + window.scrollY
    setTop(t)
  }

  useEffect(() => {
    computeTop()
    window.addEventListener('resize', computeTop)
    window.addEventListener('scroll', computeTop, { passive: true })
    return () => {
      window.removeEventListener('resize', computeTop)
      window.removeEventListener('scroll', computeTop)
    }
  }, [])

  // zapri na klik izven in na ESC
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) {
        setOpen(false)
      }
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
      {/* Gumb (ostane isti, lahko pa zamenjaš ikono po želji) */}
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Viri novic"
        onClick={() => {
          computeTop()
          setOpen((v) => !v)
        }}
        className="relative h-10 w-10 rounded-md
                   text-black/55 dark:text-white/65
                   hover:text-black/90 dark:hover:text-white/90
                   hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition grid place-items-center"
      >
        {/* 3 krogci – subtilen “oribiting” efekt */}
        <span className="relative block h-5 w-5">
          <span className="absolute inset-0 animate-spin-slow">
            <span className="absolute left-1/2 top-0 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-current/80" />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-current/70" />
            <span className="absolute left-1/2 bottom-0 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-current/60" />
          </span>
        </span>
      </button>

      {/* MEGA DROPDOWN – širok panel pod headerjem, brez backdropa */}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Viri novic"
          tabIndex={-1}
          // fixed + full width + poravnava pod headerjem
          className="fixed inset-x-0 z-50 animate-fadeInUp"
          style={{ top }}
        >
          <div
            className="mx-auto w-full max-w-6xl
                       rounded-b-2xl border border-gray-200/70 dark:border-gray-700/70
                       bg-white/75 dark:bg-gray-900/70 backdrop-blur-xl
                       shadow-xl"
          >
            {/* glava panela */}
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Filtriraj vire
              </p>
              <button
                onClick={() => setOpen(false)}
                aria-label="Zapri"
                className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* seznam virov – “brez ozadja preko novic”: panel ima svojo nežno podlago, strani pa ne zatemnimo */}
            <div className="px-4 sm:px-6 pb-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
              {/* “Pokaži vse” */}
              <a
                href="/"
                onClick={() => setOpen(false)}
                className="block w-full text-left mb-2 px-3 py-2 rounded-md
                           bg-brand text-white hover:bg-brand-hover transition"
              >
                Pokaži vse
              </a>

              {/* mreža virov */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {items.map((it) => (
                  <a
                    key={it.name}
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md
                               hover:bg-black/5 dark:hover:bg-white/5
                               text-gray-800 dark:text-gray-200 transition"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-bold text-gray-700 dark:text-gray-200">
                      {it.name.slice(0, 2)}
                    </span>
                    <span className="text-sm">{it.name}</span>
                    <span className="ml-auto text-xs text-gray-400">↗</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* lokalni stil za animacijo ikon in odtenke (lahko pustiš tudi v globals.css) */}
      <style jsx>{`
        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
