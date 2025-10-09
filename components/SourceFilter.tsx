// components/SourceFilter.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { SOURCES } from '@/lib/sources'

type Props = {
  /** Trenutno izbran vir: 'Vse' ali npr. 'RTVSLO' */
  value: string
  /** Klicano, ko uporabnik izbere vir */
  onChange: (next: string) => void
  /** Začetno odprto/zaprto stanje (privzeto odprto) */
  defaultExpanded?: boolean
}

export default function SourceFilter({ value, onChange, defaultExpanded = true }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // sticky offset = višina headerja
  useEffect(() => {
    const setHdr = () => {
      const h = (document.getElementById('site-header')?.offsetHeight ?? 56)
      document.documentElement.style.setProperty('--hdr-h', `${h}px`)
    }
    setHdr()
    window.addEventListener('resize', setHdr)
    return () => window.removeEventListener('resize', setHdr)
  }, [])

  // seznam čipov (Vse na začetku)
  const chips = useMemo(() => {
    const rest = SOURCES.filter(s => s !== 'Vse')
    return ['Vse', ...rest]
  }, [])

  const select = (s: string) => {
    onChange(s)
    // sinhronizacija z obstoječim bridge-om (Header posluša selectedSources)
    try { localStorage.setItem('selectedSources', JSON.stringify(s === 'Vse' ? [] : [s])) } catch {}
    try { sessionStorage.setItem('filters_interacted', '1') } catch {}
    try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources: s === 'Vse' ? [] : [s] } })) } catch {}
  }

  return (
    <div
      className="
        sticky top-[var(--hdr-h,56px)] z-40
        border-b border-black/10 dark:border-white/10
        supports-[backdrop-filter]:backdrop-blur-md
        bg-white/40 dark:bg-gray-900/40
      "
      role="region"
      aria-label="Filtri virov"
    >
      <div className="px-4 md:px-8 lg:px-16">
        {/* zgornja mikrovrstica: le subtilen toggle, minimalen vertical breathing */}
        <div className="flex items-center justify-end py-1">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Skrij filtre' : 'Prikaži filtre'}
            title={expanded ? 'Skrij filtre' : 'Prikaži filtre'}
            className="
              h-8 px-2 rounded-md
              text-gray-600 hover:text-gray-800
              dark:text-gray-400 dark:hover:text-gray-100
              hover:bg-black/5 dark:hover:bg-white/10
              transition
            "
          >
            {/* chevron up/down */}
            {expanded ? (
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
            )}
          </button>
        </div>

        {/* čipi: ena vrstica, subtilni; horizontalni scroll z fade robovi */}
        {expanded && (
          <div className="relative">
            {/* fade namig na robovih */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/40 dark:from-gray-900/40 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/40 dark:from-gray-900/40 to-transparent" />

            <div
              className="flex items-center gap-8 overflow-x-auto whitespace-nowrap pb-2 scroll-px-4"
              style={{ scrollSnapType: 'x proximity' }}
            >
              {chips.map((s) => {
                const active = s === value
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => select(s)}
                    aria-pressed={active}
                    className={[
                      'inline-flex items-center rounded-full px-2.5 py-1 text-[13px] scroll-ml-4 transition',
                      active
                        // NEVTRALEN “pill”: poltransparenten + tanek ring (brez oranžne)
                        ? 'text-gray-900 dark:text-white bg-black/10 dark:bg-white/12 ring-1 ring-black/15 dark:ring-white/15'
                        // neaktivni: zelo subtilni; ob hoverju malo več kontrasta
                        : 'text-gray-700 dark:text-gray-300 hover:bg-black/6 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-white',
                    ].join(' ')}
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
