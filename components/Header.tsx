// components/Header.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'

export default function Header() {
  const router = useRouter()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [hasNew, setHasNew] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // ali smo na naslovnici?
  const isHome = router.pathname === '/'

  // ura
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

  // signali za sveže novice
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

  // stanje filtra (stran javlja nazaj)
  useEffect(() => {
    const onState = (e: Event) => {
      const open = Boolean((e as CustomEvent).detail?.open)
      setFiltersOpen(open)
    }
    window.addEventListener('ui:filters-state', onState as EventListener)
    return () => window.removeEventListener('ui:filters-state', onState as EventListener)
  }, [])

  const hdrRef = useRef<HTMLElement | null>(null)
  const mobBannerRef = useRef<HTMLDivElement | null>(null)

  // posodobi CSS var za sticky offset
  useEffect(() => {
    const setHdr = () => {
      const h = hdrRef.current?.offsetHeight || 56
      document.documentElement.style.setProperty('--hdr-h', `${h}px`)
    }
    setHdr()
    window.addEventListener('resize', setHdr)
    return () => window.removeEventListener('resize', setHdr)
  }, [])

  // mobilni banner offset
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

  // Klik na brand naj vedno odpre/refresh-a naslovnico
  const onBrandClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault()
    if (isHome) {
      window.location.reload() // hard refresh, resetira state/filtre itd.
    } else {
      router.push('/') // navigacija na naslovnico
    }
  }

  // ikona filtra – stran bo preklopila in vrnila "ui:filters-state"
  const toggleFilters = () => {
    window.dispatchEvent(new CustomEvent('ui:toggle-filters'))
  }

  // preklop teme – en sam SVG, vedno viden
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')

  return (
    <header
      ref={hdrRef}
      id="site-header"
      className="sticky top-0 z-40 bg-[#FAFAFA]/95 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm"
    >
      <div className="py-2 px-4 md:px-8 lg:px-16 flex items-center justify-between gap-2">
        {/* Levo: brand + sveže pil (desktop) */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" onClick={onBrandClick} className="flex items-center gap-3 min-w-0">
            <Image
              src="/logo.png"
              alt="Križišče"
              width={36}
              height={36}
              priority
              fetchPriority="high"
              className="w-9 h-9 rounded-md"
            />
            <div className="min-w-0 leading-tight">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Križišče</h1>
              <p className="text-xs sm:text-[13px] text-gray-600 dark:text-gray-400 mt-0.5">
                Zadnje novice slovenskih medijev
              </p>
            </div>
          </Link>

          <AnimatePresence initial={false}>
            {hasNew && !refreshing && (
              <motion.button
                key="fresh-pill-desktop"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={refreshNow}
                className="hidden md:inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium
                           bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-600/40 hover:bg-emerald-500/15 transition shadow-sm"
                title="Osveži, da prikažeš nove spremembe"
                aria-live="polite"
              >
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

        {/* Desno: ura, (pogojni) filter, arhiv, tema */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="hidden sm:inline-block font-mono tabular-nums text-[13px] text-gray-500 dark:text-gray-400 select-none">
            {time}
          </span>

          {/* FILTER – prikazan samo na naslovnici */}
          {isHome && (
            <button
              type="button"
              onClick={toggleFilters}
              aria-label={filtersOpen ? 'Skrij filtre' : 'Prikaži filtre'}
              title={filtersOpen ? 'Skrij filtre' : 'Prikaži filtre'}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-md transition
                          ${filtersOpen
                            ? 'text-brand bg-brand/10 ring-1 ring-brand/30'
                            : 'text-black/55 dark:text-white/60 hover:text-black/90 dark:hover:text-white/90 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
          )}

          {/* ARHIV – zamenjana ikona: koledar */}
          <Link
            href="/arhiv"
            aria-label="Arhiv"
            title="Arhiv"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md transition
                       text-black/60 dark:text-white/65 hover:text-black/90 dark:hover:text-white/90
                       hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            {/* Koledar: vrhnji obročki + list + mreža */}
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 3v3M17 3v3" />
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 9h18" />
                <path d="M8 13h0M12 13h0M16 13h0M8 17h0M12 17h0M16 17h0" />
              </g>
              <span className="sr-only">Arhiv</span>
            </svg>
          </Link>

          {/* TEMA – vedno vidna ikona (en sam SVG) */}
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Preklopi na svetlo' : 'Preklopi na temno'}
              title={isDark ? 'Preklopi na svetlo' : 'Preklopi na temno'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md
                         text-black/55 dark:text-white/65
                         hover:text-black/90 dark:hover:text-white/90
                         hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
            >
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

      {/* Mobilni banner s svežimi novicami */}
      <AnimatePresence initial={false}>
        {hasNew && !refreshing && (
          <motion.div
            key="banner-mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="md:hidden fixed left-0 right-0 z-40 bg-[#FAFAFA]/95 dark:bg-gray-900/70 backdrop-blur-md"
            style={{ top: 'var(--hdr-h, 56px)' }}
          >
            <div ref={mobBannerRef} className="px-4 md:px-8 lg:px-16 py-1.5 flex justify-center">
              <button
                onClick={refreshNow}
                className="group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium
                           bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-600/40 hover:bg-emerald-500/15 transition shadow-sm"
                title="Osveži, da prikažeš nove spremembe"
              >
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
