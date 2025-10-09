// components/SourceFilter.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { SOURCES } from '@/lib/sources'

type Props = {
  /** Trenutno izbran vir: 'Vse' ali npr. 'RTVSLO' */
  value: string
  /** Klicano, ko uporabnik izbere vir */
  onChange: (next: string) => void
  /** Privzeto odprto (true) ali skrito (false) */
  defaultExpanded?: boolean
}

export default function SourceFilter({ value, onChange, defaultExpanded = true }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // poravnaj sticky točko na višino headerja
  useEffect(() => {
    const setHdr = () => {
      const h = (document.getElementById('site-header')?.offsetHeight ?? 56)
      document.documentElement.style.setProperty('--hdr-h', `${h}px`)
    }
    setHdr()
    window.addEventListener('resize', setHdr)
    return () => window.removeEventListener('resize', setHdr)
  }, [])

  // čipi (Vse naj bo prvi)
  const chips = useMemo(() => ['Vse', ...SOURCES.filter(s => s !== 'Vse')], [])

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
        bg-white/35 dark:bg-gray-900/35
        supports-[backdrop-filter]:backdrop-blur-md
      "
      role="region"
      aria-label="Filtri virov"
    >
      {/* ENA VRSTICA: čipi (levo) + toggle (desno). Kompaktno: py-1.5, nizek čip. */}
      <div className="px-4 md:px-8 lg:px-16 py-1.5">
        <div className="flex items-center gap-2">
          {/* CHIPS SCROLLER */}
          <div className="relative flex-1 min-w-0">
            {/* subtilen fade na robovih, samo ko je odprto */}
            {expanded && (
              <>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white/35 dark:from-gray-900/35 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white/35 dark:from-gray-900/35 to-transparent" />
              </>
            )}
            <div
              className={[
                "flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-thin",
                expanded ? "opacity-100 max-h-10" : "opacity-0 max-h-0 pointer-events-none",
                "transition-[opacity,max-height] duration-150 ease-out",
              ].join(' ')}
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
                      "inline-flex items-center h-8 rounded-full px-3 text-[13px] scroll-ml-4",
                      "transition-[background,transform,color,box-shadow] duration-120 ease-out will-change-transform",
                      active
                        ? // NEŽEN aktivni: poltransparenten pill + tanek ring, mikro-scale-in
                          "bg-black/12 dark:bg-white/12 text-white/95 ring-1 ring-white/15 dark:ring-white/15 scale-[0.995]"
                        : // neaktivni: zelo subtilni; na hover malo več kontrasta
                          "text-gray-300 hover:text-white hover:bg-white/8",
                    ].join(' ')}
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* SUBTILEN TOGGLE (chevron), nobenih barvnih gumbov */}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Skrij filtre' : 'Prikaži filtre'}
            title={expanded ? 'Skrij filtre' : 'Prikaži filtre'}
            className="h-8 w-8 grid place-items-center rounded-md text-gray-400 hover:text-gray-100 hover:bg-white/8 transition"
          >
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
      </div>
    </div>
  )
}
