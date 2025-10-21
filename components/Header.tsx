// components/Header.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'

type ViewMode = 'grid' | 'list'

export default function Header() {
  const router = useRouter()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [hasNew, setHasNew] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState<ViewMode>('grid')
  const [mobileSource, setMobileSource] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('selectedSources')
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) && arr[0] ? String(arr[0]) : 'Vse'
    } catch { return 'Vse' }
  })

  const isHome = router.pathname === '/'

  const [time, setTime] = useState(() =>
    new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date())
  )
  useEffect(() => {
    const tick = () =>
      setTime(new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date()))
    const t = setInterval(tick, 60_000); tick()
    return () => clearInterval(t)
  }, [])
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const onHasNew = (e: Event) => setHasNew(Boolean((e as CustomEvent).detail))
    const onRefreshing = (e: Event) => setRefreshing(Boolean((e as CustomEvent).detail))
    window.addEventListener('news-has-new', onHasNew as EventListener)
    window.addEventListener('news-refreshing', onRefreshing as EventListener)
    return () => {
      window.removeEventListener('news-has-new', onHasNew as EventListener)
      window.removeEventListener('news-refreshing', onRefreshing as EventListener)
    }
  }, [])

  useEffect(() => {
    const onState = (e: Event) => {
      const open = Boolean((e as CustomEvent).detail?.open)
      setFiltersOpen(open)
    }
    window.addEventListener('ui:filters-state', onState as EventListener)
    return () => window.removeEventListener('ui:filters-state', onState as EventListener)
  }, [])

  useEffect(() => {
    const onFiltersUpdate = (e: Event) => {
      const arr = (e as CustomEvent).detail?.sources as string[] | undefined
      const s = Array.isArray(arr) && arr[0] ? String(arr[0]) : 'Vse'
      setMobileSource(s)
    }
    window.addEventListener('filters:update', onFiltersUpdate as EventListener)
    return () => window.removeEventListener('filters:update', onFiltersUpdate as EventListener)
  }, [])

  useEffect(() => {
    const onView = (e: Event) => {
      const next = (e as CustomEvent).detail?.view as ViewMode | undefined
      if (next === 'grid' || next === 'list') setView(next)
    }
    window.addEventListener('ui:view-state', onView as EventListener)
    return () => window.removeEventListener('ui:view-state', onView as EventListener)
  }, [])

  const hdrRef = useRef<HTMLElement | null>(null)
  const mobBannerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const setHdr = () => {
      const h = hdrRef.current?.offsetHeight || 56
      document.documentElement.style.setProperty('--hdr-h', `${h}px`)
    }
    setHdr()
    window.addEventListener('resize', setHdr)
    return () => window.removeEventListener('resize', setHdr)
  }, [])

  useEffect(() => {
    const updateVars = () => {
      const isMobile = window.matchMedia('(max-width: 767px)').matches
      const visible = hasNew && !refreshing && isMobile
      const h = visible ? (mobBannerRef.current?.offsetHeight || 44) : 0
      const shift = visible ? `calc(${h}px - 1.25rem)` : '0px'
      document.documentElement.style.setProperty('--mob-shift', shift)
    }
    updateVars()
    window.addEventListener('resize', updateVars)
    return () => window.removeEventListener('resize', updateVars)
  }, [hasNew, refreshing])

  const currentTheme = (theme ?? resolvedTheme) || 'dark'
  const isDark = currentTheme === 'dark'

  const refreshNow = () => {
    setRefreshing(true)
    window.dispatchEvent(new CustomEvent('refresh-news'))
  }

  const onBrandClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault()
    if (isHome) { window.location.reload() } else { router.push('/') }
  }

  const toggleFilters = () => { window.dispatchEvent(new CustomEvent('ui:toggle-filters')) }
  const toggleView = () => { window.dispatchEvent(new CustomEvent('ui:toggle-view')) }
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')

  const GridIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...props}>
      <rect x="3" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="14" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="3" y="13" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="14" y="13" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
  const ListBulletsIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...props}>
      <circle cx="5" cy="6" r="1.5" fill="currentColor" />
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="5" cy="18" r="1.5" fill="currentColor" />
      <path d="M9 6h10M9 12h10M9 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
  const CalendarClock = (props: any) => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 9h18" stroke="currentColor" strokeWidth="2"/>
      <circle cx="16.5" cy="15.5" r="3.5" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M16.5 13.5v2l1.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
  const FunnelIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="none" />
    </svg>
  )

  const viewActiveClasses = 'text-brand bg-brand/10 ring-1 ring-brand/30';
  const viewIdleClasses = 'text-black/55 dark:text-white/60 hover:text-black/90 dark:hover:text-white/90 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]';
  const mobileFilterLabel = mobileSource === 'Vse' ? 'Vsi viri' : mobileSource;

  return (
    <header ref={hdrRef} id="site-header" className="sticky top-0 z-40 bg-[#FAFAFA]/95 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="py-2 px-4 md:px-8 lg:px-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" onClick={onBrandClick} className="flex items-center gap-3 min-w-0">
            <Image src="/logo.png" alt="Križišče" width={36} height={36} priority fetchPriority="high" className="w-9 h-9 rounded-md" />
            <div className="min-w-0 leading-tight">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Križišče</h1>
              <p className="hidden sm:block text-xs sm:text-[13px] text-gray-600 dark:text-gray-400 mt-0.5">Zadnje novice slovenskih medijev</p>
              <div className="sm:hidden mt-0.5">
                <button type="button" onClick={toggleFilters} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] ${filtersOpen ? 'text-brand bg-brand/10 ring-1 ring-brand/30' : 'text-gray-600 dark:text-gray-400 bg-white/5 dark:bg-white/5'}`} aria-label="Izberi vir" title="Izberi vir">
                  <span className="inline-block" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="none" />
                    </svg>
                  </span>
                  <span className="truncate max-w-[38vw]">{mobileFilterLabel}</span>
                </button>
              </div>
            </div>
          </Link>
          <AnimatePresence initial={false}>
            {hasNew && !refreshing && (
              <motion.button key="fresh-pill-desktop" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: 'easeOut' }} onClick={refreshNow} className="hidden md:inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-600/40 hover:bg-emerald-500/15 transition shadow-sm" title="Osveži, da prikažeš nove spremembe" aria-live="polite">
                <span className="relative inline-flex">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 opacity-80"></span>
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-25"></span>
                </span>
                <span>Na voljo so sveže novice</span>
                <span className="opacity-70">— klikni za osvežitev</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="hidden sm:inline-block font-mono tabular-nums text-[13px] text-gray-500 dark:text-gray-400 select-none">{time}</span>

          {isHome && (
            <button type="button" onClick={toggleFilters} aria-label={filtersOpen ? 'Skrij filtre' : 'Prikaži filtre'} title={filtersOpen ? 'Skrij filtre' : 'Prikaži filtre'} className={`hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-md transition ${filtersOpen ? 'text-brand bg-brand/10 ring-1 ring-brand/30' : viewIdleClasses}`}>
              <FunnelIcon />
            </button>
          )}

          {isHome && (
            <button type="button" onClick={toggleView} aria-label={view === 'list' ? 'Preklopi na mrežo' : 'Preklopi na seznam'} title={view === 'list' ? 'Mrežni pogled' : 'Seznam brez slik'} className={`inline-flex h-10 w-10 items-center justify-center rounded-md transition ${view === 'list' ? viewActiveClasses : viewIdleClasses}`}>
              <motion.span key={view} initial={{ opacity: 0, scale: 0.9, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.9, rotate: 6 }} transition={{ duration: 0.12 }} className="grid place-items-center">
                {view === 'list' ? <GridIcon /> : <ListBulletsIcon />}
              </motion.span>
            </button>
          )}

          <Link href="/arhiv" aria-label="Arhiv" title="Arhiv (koledar)" className="inline-flex h-10 w-10 items-center justify-center rounded-md transition text-black/60 dark:text-white/65 hover:text-black/90 dark:hover:text-white/90 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
            <CalendarClock />
          </Link>

          {mounted && (
            <button type="button" onClick={toggleTheme} aria-label={isDark ? 'Preklopi na svetlo' : 'Preklopi na temno'} title={isDark ? 'Preklopi na svetlo' : 'Preklopi na temno'} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-black/55 dark:text-white/65 hover:text-black/90 dark:hover:text-white/90 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                {isDark ? (
                  <>
                    <path d="M12 4V2M12 22v-2M4.93 4.93 3.52 3.52M20.48 20.48l-1.41-1.41M4 12H2M22 12h-2M4.93 19.07 3.52 20.48M20.48 3.52l-1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </>
                ) : (
                  <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {hasNew && !refreshing && (
          <motion.div key="banner-mobile" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="md:hidden fixed left-0 right-0 z-40 bg-[#FAFAFA]/95 dark:bg-gray-900/70 backdrop-blur-md" style={{ top: 'var(--hdr-h, 56px)' }}>
            <div ref={mobBannerRef} className="px-4 md:px-8 lg:px-16 py-1.5 flex justify-center">
              <button onClick={refreshNow} className="group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-600/40 hover:bg-emerald-500/15 transition shadow-sm" title="Osveži, da prikažeš nove spremembe">
                <span className="relative inline-flex">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 opacity-80"></span>
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-25"></span>
                </span>
                <span>Na voljo so sveže novice</span>
                <span className="opacity-70 group-hover:opacity-100">— klikni za osvežitev</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
