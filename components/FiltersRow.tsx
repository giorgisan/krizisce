// components/FiltersRow.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { SOURCES } from '@/lib/sources'

type Props = {
  /** Trenutno izbrani viri; [] = Vse */
  values: string[]
  /** Ob spremembi izbir */
  onChange: (next: string[]) => void
  /** Privzeto odprto? */
  defaultExpanded?: boolean
}

/** zapis + broadcast (če boš kdaj spet rabil v Headerju) */
function persistAndBroadcast(next: string[]) {
  try { localStorage.setItem('selectedSources', JSON.stringify(next)) } catch {}
  try { sessionStorage.setItem('filters_interacted', '1') } catch {}
  try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources: next } })) } catch {}
}

export default function FiltersRow({ values, onChange, defaultExpanded = true }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // poravnaj sticky na višino headerja
  useEffect(() => {
    const setHdr = () => {
      const h = (document.getElementById('site-header')?.offsetHeight ?? 56)
      document.documentElement.style.setProperty('--hdr-h', `${h}px`)
    }
    setHdr()
    window.addEventListener('resize', setHdr)
    return () => window.removeEventListener('resize', setHdr)
  }, [])

  const ALL = useMemo(() => SOURCES.filter(s => s !== 'Vse'), [])

  const toggle = (s: string) => {
    const next = values.includes(s) ? values.filter(x => x !== s) : [...values, s]
    onChange(next)
    persistAndBroadcast(next)
  }

  const clearAll = () => { onChange([]); persistAndBroadcast([]) }

  // povzetek (ko je zloženo)
  const summary = useMemo(() => {
    if (values.length === 0) return 'Vsi viri'
    const shown = values.slice(0, 2).join(', ')
    const extra = values.length - 2
    return extra > 0 ? `${shown} +${extra}` : shown
  }, [values])

  return (
    <div
      className="sticky top-[var(--hdr-h,56px)] z-30 border-b border-black/[0.06] dark:border-white/[0.08] bg-transparent"
      role="region"
      aria-label="Filtri virov"
    >
      <div className="px-4 md:px-8 lg:px-16">
        {/* vrstica z gumbom skrij/prikaži in (ko zloženo) s kratkim povzetkom */}
        <div className="flex items-center gap-2 py-2">
          {!expanded && (
            <span className="min-w-0 flex-1 truncate text-[13px] text-gray-600 dark:text-gray-400">
              {summary}
            </span>
          )}
          {values.length > 0 && expanded && (
            <button
              onClick={clearAll}
              className="hidden sm:inline px-3 py-1.5 text-[13px] rounded-md bg-amber-600 text-white hover:bg-amber-500"
            >
              Počisti vse
            </button>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            className="px-3.5 py-1.5 text-[13px] rounded-md bg-brand text-white hover:bg-brand-hover"
          >
            {expanded ? 'Skrij filtre' : 'Prikaži filtre'}
          </button>
        </div>

        {/* vodoravni čipi – ENA vrstica, prosojno ozadje, horizontalni scroll; brez preloma */}
        {expanded && (
          <div className="relative mb-2">
            {/* mask/fade na robovih za eleganten scroll namig */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[var(--fade-from,#0b0b0b00)] to-transparent dark:[--fade-from:#0b0b0b]"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[var(--fade-from,#0b0b0b00)] to-transparent dark:[--fade-from:#0b0b0b]"></div>

            <div
              className="flex items-center gap-8 overflow-x-auto whitespace-nowrap scrollbar-thin pb-2"
              style={{ scrollSnapType: 'x proximity' }}
            >
              {/* “Vsi” */}
              <button
                onClick={clearAll}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-[13px] ring-1 transition
                           ${values.length === 0
                             ? 'bg-brand text-white ring-brand'
                             : 'bg-black/[0.04] dark:bg-white/10 text-gray-800 dark:text-gray-200 ring-black/10 dark:ring-white/10 hover:bg-black/[0.06] dark:hover:bg-white/[0.14]'}
                          `}
              >
                Vsi viri
              </button>

              {ALL.map((s) => {
                const active = values.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => toggle(s)}
                    aria-pressed={active}
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-[13px] ring-1 transition
                                ${active
                                  ? 'bg-brand text-white ring-brand'
                                  : 'bg-black/[0.04] dark:bg-white/10 text-gray-800 dark:text-gray-200 ring-black/10 dark:ring-white/10 hover:bg-black/[0.06] dark:hover:bg-white/[0.14]'}
                               `}
                    style={{ scrollSnapAlign: 'start' }}
                    title={active ? 'Odstrani vir' : 'Dodaj vir'}
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
