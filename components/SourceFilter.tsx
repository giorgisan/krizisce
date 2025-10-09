// components/SourceFilter.tsx
'use client'

import { useEffect, useMemo } from 'react'
import { SOURCES } from '@/lib/sources'

type Props = {
  /** Trenutno izbran vir: 'Vse' ali npr. 'RTVSLO' */
  value: string
  /** Klicano, ko uporabnik izbere vir */
  onChange: (next: string) => void
  /** Ali je vrstica vidna (sticky). Neobvezno; privzeto true. */
  open?: boolean
}

export default function SourceFilter({ value, onChange, open = true }: Props) {
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

  // čipi (Vse prvi)
  const chips = useMemo(() => ['Vse', ...SOURCES.filter(s => s !== 'Vse')], [])

  const select = (s: string) => {
    onChange(s)
    // Sync z obstoječim bridge-om (Header posluša selectedSources)
    try { localStorage.setItem('selectedSources', JSON.stringify(s === 'Vse' ? [] : [s])) } catch {}
    try { sessionStorage.setItem('filters_interacted', '1') } catch {}
    try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources: s === 'Vse' ? [] : [s] } })) } catch {}
  }

  return (
    <div
      className={[
        // sticky bar – kadar je skrit, naj ne pušča praznega prostora (collapse)
        'sticky top-[var(--hdr-h,56px)] z-40 overflow-hidden transition-[max-height,opacity] duration-150 ease-out',
        open ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0',
        // blur + subtilen border
        'border-b border-black/10 dark:border-white/10 bg-white/35 dark:bg-gray-900/35 supports-[backdrop-filter]:backdrop-blur-md',
      ].join(' ')}
      role="region"
      aria-label="Filtri virov"
      aria-hidden={!open}
    >
      {/* ENA vrstica: čipi v vodoravnem scrollu; kompaktno */}
      <div className="px-4 md:px-8 lg:px-16 py-1.5">
        <div className="relative">
          {/* fade robovi za namig scrolla */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white/35 dark:from-gray-900/35 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white/35 dark:from-gray-900/35 to-transparent" />

          <div
            className="flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-thin"
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
                    'inline-flex items-center h-8 rounded-full px-3 text-[13px] scroll-ml-4',
                    'transition-[background,transform,color,box-shadow] duration-120 ease-out will-change-transform',
                    active
                      ? 'text-gray-900 dark:text-white bg-black/12 dark:bg-white/12 ring-1 ring-black/15 dark:ring-white/15 scale-[0.995]'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/8',
                  ].join(' ')}
                  style={{ scrollSnapAlign: 'start' }}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
