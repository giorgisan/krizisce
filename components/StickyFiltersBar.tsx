// components/StickyFiltersBar.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SOURCES } from '@/lib/sources'

type Props = {
  /** Trenutno izbrani viri; [] = Vse */
  values: string[]
  /** Ob potrditvi sprememb */
  onChange: (next: string[]) => void
}

/* ---------- helpers ---------- */
const isMobile = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [locked])
}

function emitFilterUpdate(sources: string[]) {
  try { sessionStorage.setItem('filters_interacted', '1') } catch {}
  try { localStorage.setItem('selectedSources', JSON.stringify(sources)) } catch {}
  try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources } })) } catch {}
}

/* ---------- komponenta ---------- */
export default function StickyFiltersBar({ values, onChange }: Props) {
  // dialog state
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<string[]>(values)

  // za popover pozicioniranje
  const barRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)

  // keep draft synced z zunanjimi spremembami
  useEffect(() => setDraft(values), [values])

  // izračun sticky offseta (upošteva višino headerja)
  useEffect(() => {
    const setHdr = () => {
      const h = (document.getElementById('site-header')?.offsetHeight ?? 56)
      document.documentElement.style.setProperty('--hdr-h', `${h}px`)
    }
    setHdr()
    window.addEventListener('resize', setHdr)
    return () => window.removeEventListener('resize', setHdr)
  }, [])

  // odpri dialog
  const openDialog = () => {
    setMobile(isMobile())
    setDraft(values)
    setOpen(true)
    setQuery('')
  }
  const closeDialog = () => setOpen(false)

  // ESC + click-away (desktop)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDialog() }
    const onClick = (e: MouseEvent) => {
      if (mobile) return
      if (!popRef.current) return
      if (!popRef.current.contains(e.target as Node)) closeDialog()
    }
    document.addEventListener('keydown', onKey)
    if (!mobile) document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, mobile])

  // lock scroll za bottom-sheet
  useBodyScrollLock(open && mobile)

  // seznam virov brez "Vse"
  const ALL = useMemo(() => SOURCES.filter(s => s !== 'Vse'), [])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ALL
    return ALL.filter(s => s.toLowerCase().includes(q))
  }, [ALL, query])

  const toggleDraft = (s: string) => {
    setDraft(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  const apply = () => {
    onChange(draft)
    emitFilterUpdate(draft)
    closeDialog()
  }
  const clearAll = () => setDraft([])

  // sticky bar content (chips)
  const showChips = values.length > 0
  const shortLabel = useMemo(() => {
    if (values.length === 0) return 'Vsi viri'
    const shown = values.slice(0, 2).join(', ')
    const extra = values.length - 2
    return extra > 0 ? `${shown} +${extra}` : shown
  }, [values])

  return (
    <>
      {/* STICKY BAR */}
      <div
        ref={barRef}
        className="sticky z-30 top-[var(--hdr-h,56px)] bg-[#FAFAFA]/90 dark:bg-gray-900/80 backdrop-blur-md
                   border-b border-gray-200/70 dark:border-gray-800/70"
      >
        <div className="px-4 md:px-8 lg:px-16 py-2 flex items-center gap-2">
          {/* Filter summary */}
          <div className="min-w-0 flex-1">
            <div className="hidden sm:flex items-center gap-2 overflow-x-auto no-scrollbar">
              {showChips ? (
                <>
                  {values.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        const next = values.filter(x => x !== s)
                        onChange(next)
                        emitFilterUpdate(next)
                      }}
                      className="shrink-0 inline-flex items-center gap-1.5 text-[13px] px-2.5 py-1
                                 rounded-full bg-amber-100/60 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100
                                 ring-1 ring-amber-400/40 hover:bg-amber-200/60 dark:hover:bg-amber-900/40 transition"
                      title="Odstrani vir"
                    >
                      {s}
                      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  ))}
                </>
              ) : (
                <span className="text-[13px] text-gray-600 dark:text-gray-400">Prikaz: vsi viri</span>
              )}
            </div>
            {/* Mobile kratek povzetek */}
            <div className="sm:hidden text-[13px] text-gray-600 dark:text-gray-400 truncate">
              {shortLabel}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {values.length > 0 && (
              <button
                onClick={() => { onChange([]); emitFilterUpdate([]) }}
                className="hidden sm:inline px-3 py-1.5 text-[13px] rounded-md bg-amber-600 text-white hover:bg-amber-500"
              >
                Počisti vse
              </button>
            )}
            <button
              onClick={openDialog}
              className="px-3.5 py-1.5 text-[13px] rounded-md bg-brand text-white hover:bg-brand-hover"
              aria-haspopup="dialog"
              aria-expanded={open}
            >
              Filtri
            </button>
          </div>
        </div>
      </div>

      {/* DIALOG: bottom-sheet (mobile) / popover (desktop) */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={mobile ? closeDialog : undefined}
              aria-hidden
            />
            {mobile ? (
              <motion.div
                key="sheet"
                className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'tween', duration: 0.22 }}
                role="dialog" aria-modal="true" aria-label="Filtriraj vire"
              >
                <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0)+10px)]">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-semibold">Filtriraj vire</h2>
                    <button onClick={closeDialog} aria-label="Zapri" className="h-9 w-9 grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10">
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
                      className="w-full rounded-lg px-3 py-2 text-sm bg-gray-100/70 dark:bg-gray-800/70 ring-1 ring-black/10 dark:ring-white/10 outline-none focus:ring-brand"
                    />
                    <button onClick={clearAll} className="px-3 py-2 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-500">
                      Počisti
                    </button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto space-y-1">
                    <button
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
                          onClick={() => toggleDraft(s)}
                          className={`w-full text-left px-3 py-2 rounded-md ${active ? 'bg-brand text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                        >
                          {s}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button onClick={closeDialog} className="px-4 py-2 rounded-md border border-gray-300/60 dark:border-gray-700/60 hover:bg-black/5 dark:hover:bg-white/10">
                      Prekliči
                    </button>
                    <button onClick={apply} className="px-4 py-2 rounded-md bg-brand text-white hover:bg-brand-hover">
                      Uporabi filtre
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="popover"
                ref={popRef}
                className="fixed z-50 w-[min(90vw,28rem)] rounded-xl border border-gray-200/70 dark:border-gray-700/70
                           bg-white/90 dark:bg-gray-900/85 backdrop-blur-xl shadow-2xl overflow-hidden"
                style={{
                  top: `calc((var(--hdr-h,56px)) + 8px)`,
                  right: 'min(16px, 4vw)',
                }}
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                role="dialog" aria-modal="true" aria-label="Filtriraj vire"
              >
                <div className="px-4 py-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">Filtriraj vire</span>
                  <div className="flex items-center gap-2">
                    <button onClick={clearAll} className="text-[13px] px-2 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-500">
                      Počisti
                    </button>
                    <button onClick={closeDialog} aria-label="Zapri" className="h-8 w-8 inline-grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10">
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
                    className="mb-2 w-full rounded-lg px-3 py-2 text-sm bg-gray-100/70 dark:bg-gray-800/70 ring-1 ring-black/10 dark:ring-white/10 outline-none focus:ring-brand"
                  />
                  <div className="max-h-[60vh] overflow-y-auto space-y-1">
                    <button
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
                          onClick={() => toggleDraft(s)}
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
    </>
  )
}
