// components/SourceFilter.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SOURCES } from '@/lib/sources'

type Props = {
  // podpremo oboje: 'Vse' ali ['RTVSLO'] (multi-API)
  value: string | string[]
  onChange: (next: string | string[]) => void
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
  // ali je trenutni “mode” multi (array) ali single (string)
  const multi = Array.isArray(value)
  const current = multi ? (value[0] ?? 'Vse') : value

  const [menuOpen, setMenuOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })

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

  // odpiranje prek globalnega eventa iz Headerja
  useEffect(() => {
    const handler = () => { ric(() => computeDropdownPos()); setMenuOpen((s) => !s) }
    window.addEventListener('toggle-filters', handler as EventListener)
    return () => window.removeEventListener('toggle-filters', handler as EventListener)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onResize = () => ric(() => computeDropdownPos())
    const onScroll = () => ric(() => menuOpen && computeDropdownPos())
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('keydown', onKey)
    ric(() => computeDropdownPos())
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const pick = (sel: string) => {
    // posodobi parent state v pravem formatu
    if (multi) onChange(sel === 'Vse' ? [] : [sel])
    else onChange(sel)
    // emit za Header/badge
    emitFilterUpdate(sel === 'Vse' ? [] : [sel])
    setMenuOpen(false)
  }

  const isActive = (s: string) => current === s

  return (
    <AnimatePresence>
      {menuOpen && (
        <>
          <motion.div
            key="clickaway"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
            className="fixed inset-0 z-30 bg-transparent"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <motion.div
            key="filter-dropdown"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="fixed z-40"
            style={{ top: pos.top, right: pos.right }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Filtriraj vire"
          >
            <div className="w-[86vw] max-w-[22rem] rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/75 backdrop-blur-xl shadow-xl overflow-hidden">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Filtriraj vire</span>
                <button aria-label="Zapri" onClick={() => setMenuOpen(false)} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="px-2 pb-2 max-h-[70vh] overflow-y-auto scrollbar-hide">
                <div className="space-y-1">
                  {/* Pokaži vse */}
                  <button
                    onClick={() => pick('Vse')}
                    className={`w-full text-left px-3 py-2 rounded-md transition ${
                      isActive('Vse')
                        ? 'bg-brand text-white hover:bg-brand-hover'
                        : 'bg-brand/10 text-brand hover:bg-brand/15'
                    }`}
                  >
                    Pokaži vse
                  </button>

                  {/* posamezni viri */}
                  {SOURCES.filter((s) => s !== 'Vse').map((source, idx) => {
                    const active = isActive(source)
                    return (
                      <motion.button
                        key={source}
                        onClick={() => pick(source)}
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.1, delay: 0.01 * idx }}
                        className={`w-full text-left px-3 py-2 rounded-md transition ${
                          active
                            ? 'bg-black/5 dark:bg-white/10 text-gray-900 dark:text-gray-100 ring-1 ring-brand/40'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200'
                        }`}
                        aria-pressed={active}
                      >
                        {source}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
