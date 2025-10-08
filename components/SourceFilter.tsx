// components/SourceFilter.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SOURCES } from '@/lib/sources'

type Props = {
  /** izbrani viri; [] = vsi (brez filtra) */
  value: string[]
  /** callback, ko se izbira spremeni */
  onChange: (next: string[]) => void
}

function emitFilterUpdate(sources: string[]) {
  try { sessionStorage.setItem('filters_interacted', '1') } catch {}
  try { localStorage.setItem('selectedSources', JSON.stringify(sources)) } catch {}
  try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources } })) } catch {}
}

const ric = (cb: () => void) => {
  if (typeof (window as any).requestIdleCallback === 'function') {
    ;(window as any).requestIdleCallback(cb, { timeout: 500 })
  } else setTimeout(cb, 0)
}

export default function SourceFilter({ value, onChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })

  // local copy za mobile “Potrdi”
  const [draft, setDraft] = useState<string[]>(value)
  useEffect(() => { setDraft(value) }, [value])

  const [query, setQuery] = useState('')

  const isMobile = typeof window !== 'undefined'
    ? window.matchMedia?.('(max-width: 767px)').matches
    : false

  const computeDropdownPos = () => {
    const trigger = document.getElementById('filters-trigger')
    const header = document.getElementById('site-header')
    const triggerRect = trigger?.getBoundingClientRect()
    const headerRect = header?.getBoundingClientRect()

    const topFromTrigger = (triggerRect?.bottom ?? 56) + 8
    const topFromHeader = (headerRect?.bottom ?? 56) + 8
    const top = Math.max(topFromHeader, topFromTrigger)

    const right = Math.max(0, window.innerWidth - (triggerRect?.right ?? window.innerWidth))
    setPos({ top, right })
  }

  // odpiranje prek Headerja
  useEffect(() => {
    const handler = () => { ric(() => computeDropdownPos()); setMenuOpen((s) => !s) }
    window.addEventListener('toggle-filters', handler as EventListener)
    return () => window.removeEventListener('toggle-filters', handler as EventListener)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onResize = () => ric(() => computeDropdownPos())
    const onScroll = () => ric(() => menuOpen && computeDropdownPos())
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    ric(() => computeDropdownPos())
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // filtriran seznam
  const choices = useMemo(
    () => SOURCES.filter(s => s !== 'Vse' && s.toLowerCase().includes(query.toLowerCase())),
    [query]
  )

  const toggle = (s: string) => {
    setDraft(d => d.includes(s) ? d.filter(x => x !== s) : [...d, s])
    if (!isMobile) {
      // desktop: takoj uveljavi
      const next = value.includes(s) ? value.filter(x => x !== s) : [...value, s]
      onChange(next); emitFilterUpdate(next)
    }
  }

  const resetAll = () => {
    setDraft([])
    onChange([]); emitFilterUpdate([])
    setMenuOpen(false)
  }

  const applyMobile = () => {
    onChange(draft); emitFilterUpdate(draft)
    setMenuOpen(false)
  }

  const isActive = (s: string) => (isMobile ? draft : value).includes(s)

  return (
    <AnimatePresence>
      {menuOpen && (
        <>
          {/* clickaway */}
          <motion.div
            key="clickaway"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
            className="fixed inset-0 z-30 bg-black/10 dark:bg-white/5"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />

          {/* panel */}
          <motion.div
            key="filter-dropdown"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className={`fixed z-40 ${isMobile ? 'left-0 right-0 top-[var(--hdr-h,56px)]' : ''}`}
            style={isMobile ? undefined : { top: pos.top, right: pos.right }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Filtriraj vire"
          >
            <div className={`${isMobile ? 'mx-3' : ''} w-[min(92vw,24rem)] rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/95 dark:bg-gray-900/90 backdrop-blur-xl shadow-xl overflow-hidden`}>
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Filtriraj vire</span>
                <button aria-label="Zapri" onClick={() => setMenuOpen(false)} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>

              {/* search */}
              <div className="px-3 pb-2">
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Išči vir…"
                    className="w-full pl-8 pr-3 py-2 rounded-md text-sm bg-white/80 dark:bg-gray-800/70 border border-gray-300/70 dark:border-gray-700/70 focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>
              </div>

              <div className="px-2 pb-2 max-h-[70vh] overflow-y-auto scrollbar-hide">
                <div className="flex items-center justify-between px-1 pb-1">
                  <button onClick={resetAll} className="text-xs underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                    Pokaži vse
                  </button>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    { (isMobile ? draft.length : value.length) } izbranih
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1">
                  {choices.map((source, idx) => {
                    const active = isActive(source)
                    return (
                      <motion.button
                        key={source}
                        onClick={() => toggle(source)}
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.08, delay: 0.01 * idx }}
                        className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition
                                   ${active ? 'bg-brand/15 text-brand ring-1 ring-brand/30' : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200'}`}
                        title={active ? 'Odstrani iz filtra' : 'Dodaj v filter'}
                      >
                        <span className={`inline-flex h-4 w-4 rounded-[4px] ring-1 ${active ? 'bg-brand ring-brand/50' : 'ring-black/20 dark:ring-white/20'}`} />
                        <span className="text-[14px]">{source}</span>
                      </motion.button>
                    )
                  })}
                  {choices.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Ni zadetkov.</div>
                  )}
                </div>
              </div>

              {/* mobile actions */}
              {isMobile && (
                <div className="px-3 pb-3 flex items-center justify-end gap-2">
                  <button onClick={() => setMenuOpen(false)} className="text-sm px-3 py-1.5 rounded-md border border-gray-300/70 dark:border-gray-700/70 hover:bg-black/5 dark:hover:bg-white/5">
                    Prekliči
                  </button>
                  <button onClick={applyMobile} className="text-sm px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-hover">
                    Potrdi
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
