// components/SourceFilter.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SOURCES } from '@/lib/sources'

type Props = {
  /** Trenutno izbrani viri; [] = Vse */
  values: string[]
  /** Klicano, ko uporabnik potrdi spremembo */
  onChange: (next: string[]) => void
}

/* ---------- helperji ---------- */
function emitFilterUpdate(sources: string[]) {
  try { sessionStorage.setItem('filters_interacted', '1') } catch {}
  try { localStorage.setItem('selectedSources', JSON.stringify(sources)) } catch {}
  try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources } })) } catch {}
}

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [locked])
}

/* ---------- komponenta ---------- */
export default function SourceFilter({ values, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mobile, setMobile] = useState(false)
  const [draft, setDraft] = useState<string[]>(values) // spremembe v dialogu
  const panelRef = useRef<HTMLDivElement | null>(null)
  const triggerRectRef = useRef<DOMRect | null>(null)

  // poslušalec iz Headerja (ikona filtra)
  useEffect(() => {
    const onToggle = () => {
      setMobile(isMobileViewport())
      const t = document.getElementById('filters-trigger')
      triggerRectRef.current = t?.getBoundingClientRect() || null
      setDraft(values)
      setOpen(v => !v)
    }
    window.addEventListener('toggle-filters', onToggle as EventListener)
    return () => window.removeEventListener('toggle-filters', onToggle as EventListener)
  }, [values])

  // ESC + click-away
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current) return
      if (!panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    if (!mobile) document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, mobile])

  // lock scroll (mobile bottom sheet)
  useBodyScrollLock(open && mobile)

  // seznam virov (brez "Vse")
  const ALL = useMemo(() => SOURCES.filter(s => s !== 'Vse'), [])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ALL
    return ALL.filter(s => s.toLowerCase().includes(q))
  }, [ALL, query])

  // togglanje vira v "draft" izbirah
  const toggle = (s: string) => {
    setDraft(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const apply = () => {
    onChange(draft)
    emitFilterUpdate(draft)
    setOpen(false)
    setQuery('')
  }

  const clearAll = () => setDraft([])

  /* ---------- pozicija (desktop popover) ---------- */
  const popStyle = useMemo(() => {
    if (mobile || !triggerRectRef.current) return {}
    const r = triggerRectRef.current
    const top = Math.max((document.getElementById('site-header')?.getBoundingClientRect().bottom ?? r.bottom) + 8, r.bottom + 8)
    const right = Math.max(8, window.innerWidth - r.right)
    return { top: `${top}px`, right: `${right}px` }
  }, [mobile, open])

  /* ---------- a11y ---------- */
  const labelId = 'filter-label'
  const listId = 'filter-list'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* Panel */}
          {mobile ? (
            // --------- MOBILE: bottom sheet ---------
            <motion.div
              key="sheet"
              ref={panelRef}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-gray-900 shadow-2xl
                         ring-1 ring-black/10 dark:ring-white/10"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              role="dialog" aria-modal="true" aria-labelledby={labelId}
            >
              <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0)+10px)]">
                <div className="flex items-center justify-between mb-2">
                  <h2 id={labelId} className="text-base font-semibold">Filtriraj vire</h2>
                  <button onClick={() => setOpen(false)} aria-label="Zapri" className="h-9 w-9 grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>

                <div className="mb-3 flex gap-2">
                  <input
                    autoFocus
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Išči vir …"
                    className="w-full rounded-lg px-3 py-2 text-sm bg-gray-100/70 dark:bg-gray-800/70
                               ring-1 ring-black/10 dark:ring-white/10 outline-none focus:ring-brand"
                    aria-controls={listId}
                  />
                  <button
                    onClick={clearAll}
                    className="px-3 py-2 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-500"
                    title="Počisti vse"
                  >
                    Počisti
                  </button>
                </div>

                <div id={listId} role="listbox" aria-multiselectable="true" className="max-h-[60vh] overflow-y-auto space-y-1 pb-1">
                  {/* “Pokaži vse” = prazen izbor */}
                  <button
                    role="option"
                    aria-selected={draft.length === 0}
                    onClick={() => setDraft([])}
                    className={`w-full text-left px-3 py-2 rounded-md ${draft.length === 0 ? 'bg-brand text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                  >
                    Pokaži vse
                  </button>
                  {filtered.map((s) => {
                    const active = draft.includes(s)
                    return (
                      <button
                        key={s}
                        role="option"
                        aria-selected={active}
                        onClick={() => toggle(s)}
                        className={`w-full text-left px-3 py-2 rounded-md ${active ? 'bg-brand text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-md border border-gray-300/60 dark:border-gray-700/60 hover:bg-black/5 dark:hover:bg-white/10">
                    Prekliči
                  </button>
                  <button onClick={apply} className="px-4 py-2 rounded-md bg-brand text-white hover:bg-brand-hover">
                    Uporabi filtre
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            // --------- DESKTOP: popover ---------
            <motion.div
              key="popover"
              ref={panelRef}
              className="fixed z-50 w-[min(90vw,26rem)] rounded-xl border border-gray-200/70 dark:border-gray-700/70
                         bg-white/90 dark:bg-gray-900/85 backdrop-blur-xl shadow-2xl overflow-hidden"
              style={popStyle as any}
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              role="dialog" aria-modal="true" aria-labelledby={labelId}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-2 flex items-center justify-between">
                <span id={labelId} className="text-sm font-semibold">Filtriraj vire</span>
                <div className="flex items-center gap-2">
                  <button onClick={clearAll} className="text-[13px] px-2 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-500">
                    Počisti
                  </button>
                  <button aria-label="Zapri" onClick={() => setOpen(false)} className="h-8 w-8 inline-grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>

              <div className="px-3 pb-3">
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Išči vir …"
                  className="mb-2 w-full rounded-lg px-3 py-2 text-sm bg-gray-100/70 dark:bg-gray-800/70
                             ring-1 ring-black/10 dark:ring-white/10 outline-none focus:ring-brand"
                  aria-controls={listId}
                />
                <div id={listId} role="listbox" aria-multiselectable="true" className="max-h-[60vh] overflow-y-auto space-y-1 pb-1">
                  <button
                    role="option"
                    aria-selected={draft.length === 0}
                    onClick={() => setDraft([])}
                    className={`w-full text-left px-3 py-2 rounded-md ${draft.length === 0 ? 'bg-brand text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                  >
                    Pokaži vse
                  </button>
                  {filtered.map((s) => {
                    const active = draft.includes(s)
                    return (
                      <button
                        key={s}
                        role="option"
                        aria-selected={active}
                        onClick={() => toggle(s)}
                        className={`w-full text-left px-3 py-2 rounded-md ${active ? 'bg-brand text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 flex justify-end">
                  <button onClick={apply} className="px-4 py-2 rounded-md bg-brand text-white hover:bg-brand-hover">
                    Uporabi filtre
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  )
}
