// components/Header.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function Header() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => setMounted(true), [])

  // signal iz index.tsx: nove novice
  useEffect(() => {
    const onHasNew = (e: Event) => {
      const detail = (e as CustomEvent).detail as boolean
      setHasNew(Boolean(detail))
    }
    const onRefreshing = (e: Event) => {
      const detail = (e as CustomEvent).detail as boolean
      setRefreshing(Boolean(detail))
    }
    window.addEventListener('news-has-new', onHasNew as EventListener)
    window.addEventListener('news-refreshing', onRefreshing as EventListener)
    return () => {
      window.removeEventListener('news-has-new', onHasNew as EventListener)
      window.removeEventListener('news-refreshing', onRefreshing as EventListener)
    }
  }, [])

  const currentTheme = (theme ?? resolvedTheme) || 'dark'
  const isDark = currentTheme === 'dark'

  const refreshNow = () => {
    setRefreshing(true) // takoj pokaži spin
    window.dispatchEvent(new CustomEvent('refresh-news'))
  }
  const toggleFilters = () =>
    window.dispatchEvent(new CustomEvent('toggle-filters'))

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAFA]/95 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Ujemanje z linijo kartic: enaka vodoravna notranja poravnava kot v <main> */}
      <div className="h-12 px-4 md:px-8 lg:px-16 flex items-center justify-between">
        {/* Levo: logo + naslov (večje) */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png" /* enoten logo */
            alt="Križišče"
            width={36}
            height={36}
            priority
            className="w-9 h-9 rounded-md"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-none">
            Križišče
          </h1>
        </Link>

        {/* Desno: Refresh → Tema → Hamburger (transparentni gumbi) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Refresh (zelen indikator + spin) */}
          <button
            type="button"
            onClick={refreshNow}
            aria-label="Osveži novice"
            title="Osveži"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md
                       text-black/55 dark:text-white/65
                       hover:text-black/90 dark:hover:text-white/90
                       hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              aria-hidden="true"
              className={refreshing ? 'animate-spin' : ''}
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M21 4v6h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {hasNew && !refreshing && (
              <span
                className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900 animate-pulse"
                aria-hidden="true"
              />
            )}
          </button>

          {/* Tema – modern sun/moon */}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-pressed={isDark}
              aria-label="Preklopi temo"
              title={isDark ? 'Svetla tema' : 'Temna tema'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md
                         text-black/55 dark:text-white/65
                         hover:text-black/90 dark:hover:text-white/90
                         hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
            >
              <span className="relative inline-block">
                {/* Sun */}
                <svg
                  viewBox="0 0 24 24" width="20" height="20"
                  className={`transition-transform duration-300 ${isDark ? 'scale-0 rotate-90' : 'scale-100 rotate-0'}`}
                  aria-hidden="true"
                >
                  <path d="M12 4V2M12 22v-2M4.93 4.93 3.52 3.52M20.48 20.48l-1.41-1.41M4 12H2M22 12h-2M4.93 19.07 3.52 20.48M20.48 3.52l-1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                {/* Moon */}
                <svg
                  viewBox="0 0 24 24" width="20" height="20"
                  className={`absolute inset-0 transition-transform duration-300 ${isDark ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`}
                  aria-hidden="true"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </span>
            </button>
          )}

          {/* Hamburger – zadnji, še bolj transparenten */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-filters'))}
            aria-label="Odpri filter"
            title="Filtri"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md
                       text-black/45 dark:text-white/55
                       hover:text-black/85 dark:hover:text-white/85
                       hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
