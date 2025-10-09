// components/InlineFiltersBar.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { SOURCES } from '@/lib/sources'

type Props = {
  /** Trenutno izbrani viri; [] = Vse */
  values: string[]
  /** Ob spremembi izbir */
  onChange: (next: string[]) => void
  /** Začetno stanje (privzeto zaprto) */
  defaultExpanded?: boolean
}

/** Utility: zapis in broadcast v Header */
function emitFilterUpdate(sources: string[]) {
  try { sessionStorage.setItem('filters_interacted', '1') } catch {}
  try { localStorage.setItem('selectedSources', JSON.stringify(sources)) } catch {}
  try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources } })) } catch {}
}

export default function InlineFiltersBar({ values, onChange, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // prilagodi CSS spremenljivko za sticky offset (višina headerja)
  useEffect(() => {
    const setHdr = () => {
      const h = (document.getElementById('site-header')?.offsetHeight ?? 56)
      document.documentElement.style.setProperty('--hdr-h', `${h}px`)
    }
    setHdr()
    window.addEventListener('resize', setHdr)
    return () => window.removeEventListener('resize', setHdr)
  }, [])

  // seznam virov (brez "Vse")
  const ALL = useMemo(() => SOURCES.filter(s => s !== 'Vse'), [])

  // povzetek za levo stran
  const summary = useMemo(() => {
    if (values.length === 0) return 'Vsi viri'
    const shown = values.slice(0, 2).join(', ')
    const extra = values.length - 2
    return extra > 0 ? `${shown} +${extra}` : shown
  }, [values])

  const toggle = (s: string) => {
    const next = values.includes(s) ? values.filter(x => x !== s) : [...values, s]
    onChange(next)
    emitFilterUpdate(next)
  }

  const clearAll = () => {
    onChange([])
    emitFilterUpdate([])
  }

  return (
    <div
      className="sticky top-[var(--hdr-h,56px)] z-30
                 bg-[#FAFAFA]/90 dark:bg-gray-900/80 backdrop-blur-md
                 border-b border-gray-200/70 dark:border-gray-800/70"
      role="region"
      aria-label="Filtri virov"
    >
      <div className="px-4 md:px-8 lg:px-16 py-2">
        {/* Zgornja vrstica: povzetek + gumbi */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 text-[13px] text-gray-600 dark:text-gray-400 truncate">
            {summary}
          </div>
          {values.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="hidden sm:inline px-3 py-1.5 text-[13px] rounded-md
                         bg-amber-600 text-white hover:bg-amber-500"
            >
              Počisti vse
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            className="px-3.5 py-1.5 text-[13px] rounded-md bg-brand text-white hover:bg-brand-hover"
          >
            {expanded ? 'Skrij filtre' : 'Prikaži filtre'}
          </button>
        </div>

        {/* Spodnja vrstica: čipi (samo ko je odprto) */}
        {expanded && (
          <div
            className="mt-2 flex flex-wrap gap-2 overflow-hidden"
            aria-live="polite"
          >
            {/* “Pokaži vse” = prazen izbor */}
            <button
              type="button"
              onClick={clearAll}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-[13px]
                         ring-1 transition
                         ${values.length === 0
                           ? 'bg-brand text-white ring-brand'
                           : 'bg-black/[0.04] dark:bg-white/10 text-gray-800 dark:text-gray-200 ring-black/10 dark:ring-white/10 hover:bg-black/[0.06] dark:hover:bg-white/[0.14]'}
                         `}
            >
              Pokaži vse
            </button>

            {ALL.map((s) => {
              const active = values.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(s)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-[13px]
                              ring-1 transition
                              ${active
                                ? 'bg-brand text-white ring-brand'
                                : 'bg-black/[0.04] dark:bg-white/10 text-gray-800 dark:text-gray-200 ring-black/10 dark:ring-white/10 hover:bg-black/[0.06] dark:hover:bg-white/[0.14]'}
                              `}
                  title={active ? 'Odstrani vir' : 'Dodaj vir'}
                >
                  {s}
                  {active && (
                    <svg className="ml-1" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
