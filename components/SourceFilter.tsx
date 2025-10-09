// components/SourceFilter.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { SOURCES } from '@/lib/sources'

type Props = {
  /** Trenutno izbran vir: 'Vse' ali npr. 'RTVSLO' */
  value: string
  /** Klicano, ko uporabnik izbere vir */
  onChange: (next: string) => void
  /** Privzeto razprto? */
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

  // seznam čipov (vključno z "Vse" na začetku)
  const chips = useMemo(() => {
    const rest = SOURCES.filter(s => s !== 'Vse')
    return ['Vse', ...rest]
  }, [])

  const summary = useMemo(() => (value === 'Vse' ? 'Vsi viri' : value), [value])

  const select = (s: string) => {
    onChange(s)
    try { localStorage.setItem('selectedSources', JSON.stringify(s === 'Vse' ? [] : [s])) } catch {}
    try { sessionStorage.setItem('filters_interacted', '1') } catch {}
    try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources: s === 'Vse' ? [] : [s] } })) } catch {}
  }

  return (
    <div
      className="sticky top-[var(--hdr-h,56px)] z-30 border-b border-black/10 dark:border-white/10 bg-transparent"
      role="region"
      aria-label="Filtri virov"
    >
      <div className="px-4 md:px-8 lg:px-16">
        {/* zgornja vrstica: povzetek + skrij/prikaži */}
        <div className="flex items-center justify-between gap-2 py-2">
          {!expanded ? (
            <span className="min-w-0 flex-1 truncate text-[13px] text-gray-600 dark:text-gray-400">{summary}</span>
          ) : (
            <span className="min-w-0 flex-1" />
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

        {/* čipi: ena vrstica, subtilni, horizontalni scroll */}
        {expanded && (
          <div className="relative">
            {/* nežna “fade” maska na robovih za namig scrolla */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-transparent to-black/[0.04] dark:to-white/[0.06]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-transparent to-black/[0.04] dark:to-white/[0.06]" />

            <div
              className="flex items-center gap-6 overflow-x-auto whitespace-nowrap pb-2 scrollbar-thin"
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
                      'inline-flex items-center rounded-full px-3 py-1.5 text-[13px] scroll-ml-4',
                      // neaktivni = zelo subtilni; aktivni = majhen “pill” poudarek (kot na tvoji sliki)
                      active
                        ? 'bg-brand text-white'
                        : 'text-gray-800 dark:text-gray-200 hover:text-white hover:bg-white/10 dark:hover:bg-white/10 hover:backdrop-blur-sm',
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
