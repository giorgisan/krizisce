// components/SourcesMenu.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type Item = { name: string; url?: string } // url je neobvezen – nič več ga ne uporabljamo za odpiranje

type Props = {
  items: Item[]
  className?: string
}

export default function SourcesMenu({ items, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [top, setTop] = useState<number>(0)
  const [selected, setSelected] = useState<string[]>([])

  const btnRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // --- HELPER: preberi/zapiši + emit ---
  const emitFiltersUpdate = (sources: string[]) => {
    try {
      localStorage.setItem('selectedSources', JSON.stringify(sources))
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources } }))
    } catch {}
  }

  const loadSelected = () => {
    try {
      const raw = localStorage.getItem('selectedSources')
      const arr = raw ? JSON.parse(raw) : []
      if (Array.isArray(arr)) setSelected(arr)
    } catch {}
  }

  // poravnava panela pod header
  const computeTop = () => {
    const header = btnRef.current?.closest('header')
    const rect = header?.getBoundingClientRect()
    const t = (rect?.bottom ?? 56) + window.scrollY
    setTop(t)
  }

  // poslušaj globalni toggle iz Headerja
  useEffect(() => {
    const onToggle = () => {
      computeTop()
      loadSelected()
      setOpen((v) => !v)
    }
    window.addEventListener('toggle-filters', onToggle as EventListener)
    return () => window.removeEventListener('toggle-filters', onToggle as EventListener)
  }, [])

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
      if (!panelRef.current?.contains(t)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  // spremeni izbor (multi-select)
  const toggleSource = (name: string) => {
    setSelected((prev) => {
      const next = prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
      emitFiltersUpdate(next)
      return next
    })
  }

  const clearAll = () => {
    setSelected([])
    emitFiltersUpdate([])
    setOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Lokalni “samostojni” gumb – NI obvezen, ker poslušamo toggle-filters;
          pusti ga, če to komponento uporabljaš še kje drugje. */}
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Viri novic"
        onClick={() => {
          computeTop()
          loadSelected()
          setOpen((v) => !v)
        }}
        className="relative h-10 w-10 rounded-md
                   text-black/55 dark:text-white/65
                   hover:text-black/90 dark:hover:text-white/90
                   hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                   transition grid place-items-center"
      >
        {/* Ikona lijaka */}
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        </svg>
      </button>

      {/* PANEL */}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Filtriraj vire"
          tabIndex={-1}
          className="fixed inset-x-0 z-50 animate-fadeInUp"
          style={{ top }}
        >
          <div
            className="mx-auto w-full max-w-6xl
                       rounded-b-2xl border border-gray-200/70 dark:border-gray-700/70
                       bg-white/75 dark:bg-gray-900/70 backdrop-blur-xl shadow-xl"
          >
            {/* glava */}
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

            {/* vsebina */}
            <div className="px-4 sm:px-6 pb-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
              {/* Pokaži vse */}
              <button
                onClick={clearAll}
                className="block w-full text-left mb-3 px-3 py-2 rounded-md
                           bg-amber-600 text-white hover:bg-amber-500 transition"
              >
                Pokaži vse
              </button>

              {/* mreža virov (checkboxi) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {items.map((it) => {
                  const checked = selected.includes(it.name)
                  return (
                    <label
                      key={it.name}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition
                        ${checked ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}
                        text-gray-800 dark:text-gray-200`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => toggleSource(it.name)}
                      />
                      <span className="text-sm truncate">{it.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
