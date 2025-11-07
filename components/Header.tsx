// components/Header.tsx — COMPACT (fixed archive icon color)
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

  const isHome = router.pathname === '/'

  /* ========= Ura (poravnana na :00) + global 'ui:minute' ========= */
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  useEffect(() => {
    let intervalId: number | undefined
    let timeoutId: number | undefined
    const tick = () => {
      setNowMs(Date.now())
      try { window.dispatchEvent(new CustomEvent('ui:minute')) } catch {}
    }
    const startAligned = () => {
      const toNext = 60_000 - (Date.now() % 60_000)
      timeoutId = window.setTimeout(() => {
        tick()
        intervalId = window.setInterval(tick, 60_000) as unknown as number
      }, toNext) as unknown as number
    }
    startAligned()
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        if (timeoutId) clearTimeout(timeoutId)
        if (intervalId) clearInterval(intervalId)
        tick()
        startAligned()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      if (timeoutId) clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [])
  const time = new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date(nowMs))

  useEffect(() => setMounted(true), [])

  /* ========= Signali (nove novice, refreshing, filter state) ========= */
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

  const hdrRef = useRef<HTMLElement | null>(null)
  const mobBannerRef = useRef<HTMLDivElement | null>(null)

  /* ========= CSS var za sticky offset ========= */
  useEffect(() => {
    const setHdr = () => {
      const base = window.matchMedia('(min-width: 768px)').matches ? 60 : 56
      const h = hdrRef.current?.offsetHeight || base
      document.documentElement.style.setProperty('--hdr-h', `${h}px`)
    }
    setHdr()
    window.addEventListener('resize', setHdr)
    return () => window.removeEventListener('resize', setHdr)
  }, [])

  /* ========= Mobilni banner offset ========= */
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

  /* ========= Scroll-then-refresh + anti-anchoring ========= */
  const busyRef = useRef(false)
  function waitForTop(timeoutMs = 1200): Promise<void> {
    return new Promise((resolve) => {
      const done = () => { cleanup(); resolve() }
      const onScroll = () => { if (window.scrollY <= 0) done() }
      const cleanup = () => {
        window.removeEventListener('scroll', onScroll as EventListener)
        clearTimeout(tid)
      }
      if (window.scrollY <= 0) return resolve()
      window.addEventListener('scroll', onScroll as EventListener, { passive: true })
      const tid = window.setTimeout(done, timeoutMs)
    })
  }
  const refreshNow = async () => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        await waitForTop(1200)
      }
      const main = document.querySelector('main') as HTMLElement | null
      try { main?.focus?.() } catch {}
      setRefreshing(true)
      window.dispatchEvent(new CustomEvent('refresh-news'))
    } finally {
      setTimeout(() => { busyRef.current = false }, 50)
    }
  }
  const prevRefreshing = useRef(false)
  useEffect(() => {
    if (prevRefreshing.current && !refreshing) {
      const html = document.documentElement
      const prevBehavior = html.style.scrollBehavior
      const prevAnchor = (document.body.style as any).overflowAnchor
      try {
        html.style.scrollBehavior = 'auto'
        ;(document.body.style as any).overflowAnchor = 'none'
        requestAnimationFrame(() => {
          window.scrollTo(0, 0)
          requestAnimationFrame(() => {
            window.scrollTo(0, 0)
            html.style.scrollBehavior = prevBehavior
            ;(document.body.style as any).overflowAnchor = prevAnchor
          })
        })
      } catch { window.scrollTo(0, 0) }
    }
    prevRefreshing.current = refreshing
  }, [refreshing])

  /* ========= Navigacija ========= */
  const onBrandClick: React.MouseEventHandler<HTMLAnchorElement> = async (e) => {
    e.preventDefault()
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      await waitForTop(800)
    } catch {}
    if (!isHome) router.push('/')
  }
  const toggleFilters = () => window.dispatchEvent(new CustomEvent('ui:toggle-filters'))
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')

  return (
    <header
      ref={hdrRef}
      id="site-header"
      data-new={hasNew && !refreshing ? '1' : undefined}
      className="sticky top-0 z-40
                 bg-[#FAFAFA]/90 dark:bg-gray-900/80 backdrop-blur-md
                 border-b border-black/10 dark:border-white/10
                 shadow-[0_1px_10px_-6px_rgba(0,0,0,0.35)]
                 supports-[backdrop-filter]:backdrop-saturate-150"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
                   focus:bg-black focus:text-white focus:px-3 focus:py-2 focus:rounded-md z-[100]"
      >
        Preskoči na vsebino
      </a>

      <div className="px-4 md:px-8 lg:px-16 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" onClick={onBrandClick} className="flex items-center gap-3 min-w-0">
            <Image
              src="/logo.png"
              alt="Križišče"
              width={32}
              height={32}
              priority
              fetchPriority="high"
              className="w-8 h-8 rounded-md"
            />
            <div className="min-w-0 leading-tight">
              <h1 className="text-[18px] sm:text-[20px] font-bold text-gray-900 dark:text-white">Križišče</h1>
              <p className="text-[11px] sm:text-[12px] text-gray-700 dark:text-gray-300/90">
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
                className="hidden md:inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium
                           bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-600/40 hover:bg-emerald-500/15 transition"
                title="Osveži, da prikažeš nove spremembe"
                aria-live="polite"
              >
                <span className="relative inline-flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 opacity-80"></span>
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-25"></span>
                </span>
                <span>Na voljo so sveže novice</span>
                <span className="opacity-70">— kliknite za osvežitev</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="hidden sm:inline-block font-mono tabular-nums text-[12px] text-gray-600 dark:text-gray-300 select-none">
            {time}
          </span>

          {isHome && (
            <button
              type="button"
              onClick={toggleFilters}
              aria-label={filtersOpen ? 'Skrij filtre' : 'Prikaži filtre'}
              title={filtersOpen ? 'Skrij filtre' : 'Prikaži filtre'}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition
                          ${filtersOpen
                            ? 'text-brand bg-brand/10 ring-1 ring-brand/30'
                            : 'text-black/60 dark:text-white/70 hover:text-black/90 dark:hover:text-white/90 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="none" />
              </svg>
            </button>
          )}

          {/* ARHIV — fixed dark:text-white/70 */}
          <Link
            href="/arhiv"
            aria-label="Arhiv"
            title="Arhiv"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md transition
                       text-black/60 dark:text-white/70 hover:text-black/90 dark:hover:text-white/90
                       hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 3v3" />
                <path d="M17 3v3" />
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 9h18" />
                <path d="M8 13h0M12 13h0M16 13h0M8 17h0M12 17h0M16 17h0" />
              </g>
              <span className="sr-only">Arhiv</span>
            </svg>
          </Link>

          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label={isDark ? 'Preklopi na svetlo' : 'Preklopi na temno'}
              title={isDark ? 'Preklopi na svetlo' : 'Preklopi na temno'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md
                         text-black/60 dark:text-white/70 hover:text-black/90 dark:hover:text-white/90
                         hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
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
                           bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-600/40 hover:bg-emerald-500/15 transition"
                title="Osveži, da prikažeš nove spremembe"
              >
                <span className="relative inline-flex">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 opacity-80"></span>
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-25"></span>
                </span>
                <span>Na voljo so sveže novice</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
