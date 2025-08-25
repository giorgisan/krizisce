'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Če imaš seznam virov v lib/sources, ga uporabimo.
// Če ne, spremeni ALL_SOURCES prop v parentu.
import { sourceColors } from '@/lib/sources'

type Props = {
  /** Vsi viri, ki jih želiš filtrirati. Če ga ne podaš, vzamemo keys(sourceColors). */
  sources?: string[]
  /** Trenutno izbrani viri (controlled). Če ga ne podaš, komponenta uporablja svoj state. */
  selected?: string[]
  /** Ob vsaki spremembi izbranih virov. */
  onChange?: (next: string[]) => void
  /** Po želji: začetno število “čipov” v vrstici; ostalo je v popoveru. */
  maxInline?: number
  /** Razred na zunanjem wrapperju (za pozicioniranje v headerju ipd.). */
  className?: string
}

/** Majhen ikonični “lijak” (filter) */
function FunnelIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M3 5h18l-7 8v4l-4 2v-6L3 5z" fill="currentColor" />
    </svg>
  )
}

/** Utility: fokus ujame v dialogu (preprost trap) */
function useFocusTrap(enabled: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!enabled) return
    const el = containerRef.current
    if (!el) return
    const sel = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    const focusables = Array.from(el.querySelectorAll<HTMLElement>(sel))
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (focusables.length === 0) { e.preventDefault(); return }
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      } else if (e.key === 'Escape') {
        ;(el.querySelector('[data-close]') as HTMLButtonElement | null)?.click()
      }
    }
    document.addEventListener('keydown', onKey)
    first?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [enabled, containerRef])
}

export default function FilterControl({
  sources,
  selected,
  onChange,
  maxInline = 10,
  className = '',
}: Props) {
  const ALL_SOURCES = useMemo(
    () => (sources && sources.length ? sources.slice() : Object.keys(sourceColors || {})),
    [sources]
  )

  // --- controlled / uncontrolled ---
  const [internal, setInternal] = useState<string[]>(() => selected || [])
  useEffect(() => { if (selected) setInternal(selected) }, [selected])
  const setSelected = (next: string[]) => {
    if (!selected) setInternal(next)
    onChange?.(next)
    // Fallback “broadcast”, če še nimaš povezanega stanja v parentu:
    if (!onChange) {
      try {
        localStorage.setItem('selectedSources', JSON.stringify(next))
        window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources: next } }))
      } catch {}
    }
  }

  const isSelected = (s: string) => internal.includes(s)
  const toggle = (s: string) => {
    setSelected(isSelected(s) ? internal.filter((x) => x !== s) : [...internal, s])
  }
  const clearAll = () => setSelected([])

  // --- UI odprtje ---
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(open, panelRef)

  // zapri na klik izven (desktop popover)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current && !panelRef.current.contains(t)) {
        // na desktopu zapremo; na mobile je bottom sheet s full overlayem
        if (window.matchMedia('(min-width: 768px)').matches) setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // --- render ---
  const inline = ALL_SOURCES.slice(0, maxInline)
  const rest = ALL_SOURCES.slice(maxInline)
  const badge = internal.length

  return (
    <div className={`w-full ${className}`}>
      {/* CHIPS vrstica */}
      <div className="relative -mx-2 px-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          {/* “Vsi” chip */}
          <button
            type="button"
            aria-pressed={internal.length === 0}
            onClick={clearAll}
            className={`whitespace-nowrap h-9 px-3 rounded-full border text-sm transition
              ${internal.length === 0
                ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900'
                : 'bg-transparent text-gray-700 dark:text-gray-200 border-gray-300/60 dark:border-gray-600/60 hover:bg-gray-100/60 dark:hover:bg-gray-800/60'
              }`}
          >
            Vsi
          </button>

          {inline.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={isSelected(s)}
              onClick={() => toggle(s)}
              className={`whitespace-nowrap h-9 px-3 rounded-full border text-sm transition
                ${isSelected(s)
                  ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900'
                  : 'bg-transparent text-gray-700 dark:text-gray-200 border-gray-300/60 dark:border-gray-600/60 hover:bg-gray-100/60 dark:hover:bg-gray-800/60'
                }`}
              title={s}
              style={isSelected(s) ? {} : { borderColor: 'rgba(156,163,175,0.6)' }}
            >
              {s}
            </button>
          ))}

          {/* Gumb Viri (odpre popover/sheet) */}
          {rest.length > 0 && (
            <div className="relative">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-gray-300/60 dark:border-gray-600/60
                           text-sm text-gray-800 dark:text-gray-100 bg-white/70 dark:bg-gray-900/70 backdrop-blur
                           hover:bg-white/90 dark:hover:bg-gray-900/90 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <FunnelIcon />
                <span>Viri</span>
                {badge > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 text-white text-xs px-1">
                    {badge}
                  </span>
                )}
              </button>

              {/* Desktop popover (anchor = ta wrapper) */}
              {open && (
                <div
                  ref={panelRef}
                  className="hidden md:block absolute z-50 right-0 mt-2 w-80 rounded-xl border border-gray-200/60 dark:border-gray-700/60
                             bg-white dark:bg-gray-900 shadow-xl p-3"
                  role="dialog" aria-modal="true" aria-label="Filtri virov"
                >
                  <div className="max-h-[50vh] overflow-auto pr-1">
                    <fieldset className="space-y-1">
                      <legend className="sr-only">Viri</legend>
                      {ALL_SOURCES.map((s) => (
                        <label key={s} className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800/60">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                            checked={isSelected(s)}
                            onChange={() => toggle(s)}
                          />
                          <span className="text-sm">{s}</span>
                        </label>
                      ))}
                    </fieldset>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button type="button" onClick={clearAll}
                            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300/70 dark:border-gray-600/70 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      Počisti
                    </button>
                    <div className="flex gap-2">
                      <button data-close type="button" onClick={() => setOpen(false)}
                              className="text-sm px-3 py-1.5 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                        Zapri
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet (portal v body) */}
      {open && createPortal(
        <div
          className="md:hidden fixed inset-0 z-50"
          role="dialog" aria-modal="true" aria-label="Filtri virov – mobilno"
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div ref={panelRef}
               className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white dark:bg-gray-900 shadow-2xl
                          border-t border-gray-200/70 dark:border-gray-700/70 p-4 max-h-[70vh] overflow-auto">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300/80 dark:bg-gray-600/80 mb-3" />
            <h2 className="text-base font-semibold mb-2">Filtriraj po virih</h2>

            <fieldset className="grid grid-cols-2 gap-2">
              {ALL_SOURCES.map((s) => (
                <label key={s} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200/70 dark:border-gray-700/70">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                    checked={isSelected(s)}
                    onChange={() => toggle(s)}
                  />
                  <span className="text-sm">{s}</span>
                </label>
              ))}
            </fieldset>

            <div className="mt-4 flex items-center justify-between">
              <button type="button" onClick={clearAll}
                      className="text-sm px-3 py-2 rounded-lg border border-gray-300/70 dark:border-gray-600/70">
                Počisti
              </button>
              <button data-close type="button" onClick={() => setOpen(false)}
                      className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                Zapri
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
