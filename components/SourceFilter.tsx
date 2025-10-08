// components/SourceFilter.tsx — FULL REPLACEMENT
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SOURCES } from '@/lib/sources'

type Props = {
  value: string                 // trenutno izbran vir (npr. "RTVSLO" ali "Vse")
  onChange: (next: string) => void
}

function persistAndBroadcast(next: string) {
  try { sessionStorage.setItem('filters_interacted', '1') } catch {}
  try { localStorage.setItem('selectedSources', JSON.stringify(next === 'Vse' ? [] : [next])) } catch {}
  try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources: next === 'Vse' ? [] : [next] } })) } catch {}
}

export default function SourceFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const isMobile = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
    [],
  )

  // odpri/zapri iz Header gumba
  useEffect(() => {
    const handler = () => setOpen(v => !v)
    window.addEventListener('toggle-filters', handler as EventListener)
    return () => window.removeEventListener('toggle-filters', handler as EventListener)
  }, [])

  // close na Escape & klik izven
  const panelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current) return
      const t = e.target as Node
      if (!panelRef.current.contains(t)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDoc)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDoc)
    }
  }, [open])

  // fokus v iskalnik
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(id)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const items = SOURCES.filter(s => s !== 'Vse')
    if (!q) return items
    return items.filter(s => s.toLowerCase().includes(q))
  }, [query])

  const select = (next: string) => {
    onChange(next)
    persistAndBroadcast(next)
    setOpen(false)
    setQuery('')
  }

  // pozicija za desktop popover
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 64, right: 16 })
  useEffect(() => {
    if (!open || isMobile) return
    const compute = () => {
      const trigger = document.getElementById('filters-trigger')
      const header = document.getElementById('site-header')
      const tr = trigger?.getBoundingClientRect()
      const hr = header?.getBoundingClientRect()
      const topFromTrigger = (tr?.bottom ?? 56) + 8
      const topFromHeader = (hr?.bottom ?? 56) + 8
      const top = Math.max(topFromHeader, topFromTrigger)
      const right = Math.max(0, window.innerWidth - (tr?.right ?? window.innerWidth))
      setPos({ top, right })
    }
    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', compute, { passive: true })
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', compute)
    }
  }, [open, isMobile])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* zatemnitev ozadja */}
          <motion.div
            key="sf-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-40 bg-black/30"
            aria-hidden
          />

          {/* PANEL */}
          <motion.div
            key="sf-panel"
            ref={panelRef}
            initial={{ opacity: 0, y: isMobile ? 10 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 10 : -6 }}
            transition={{ duration: 0.16 }}
            className={
              isMobile
                ? 'fixed inset-x-0 top-[var(--hdr-h,56px)] bottom-0 z-50 bg-white/90 dark:bg-gray-900/85 backdrop-blur-xl'
                : 'fixed z-50 w-[min(92vw,22rem)] rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/90 dark:bg-gray-900/85 backdrop-blur-xl shadow-xl'
            }
            style={isMobile ? undefined : { top: pos.top, right: pos.right }}
            role="dialog"
            aria-label="Filtriraj vire"
          >
            {/* header + iskalnik (sticky) */}
            <div className={`sticky top-0 ${isMobile ? 'px-4 pt-3 pb-2' : 'px-4 pt-3 pb-2'} bg-white/80 dark:bg-gray-900/75 backdrop-blur`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Filtriraj vire</span>
                <button
                  aria-label="Zapri"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>

              <div className="mt-2 relative">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Išči vir…"
                  className="w-full rounded-md border border-gray-300/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-800/60 px-3 py-2 text-sm outline-none focus:ring-2 ring-brand"
                />
                {!!query && (
                  <button
                    aria-label="Počisti"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                )}
              </div>
            </div>

            {/* seznam */}
            <div className="px-2 pb-2 overflow-y-auto max-h-[70vh] md:max-h-[64vh]">
              <button
                onClick={() => select('Vse')}
                className={`w-full text-left mt-2 mb-1 px-3 py-2 rounded-md transition ${
                  value === 'Vse'
                    ? 'bg-brand text-white'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200'
                }`}
              >
                Pokaži vse
              </button>

              {filtered.map((source, idx) => (
                <button
                  key={source}
                  onClick={() => select(source)}
                  className={`w-full text-left px-3 py-2 rounded-md transition ${
                    value === source
                      ? 'ring-2 ring-brand/60 bg-brand/10 text-gray-900 dark:text-gray-100'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200'
                  }`}
                  style={{ transitionDelay: isMobile ? '0ms' : `${idx * 10}ms` }}
                >
                  {source}
                </button>
              ))}

              {filtered.length === 0 && (
                <p className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">Ni zadetkov.</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
