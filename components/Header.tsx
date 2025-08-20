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

  useEffect(() => setMounted(true), [])

  // Poslušaj signal iz index.tsx, da so nove novice na voljo
  useEffect(() => {
    const onHasNew = (e: Event) => {
      const detail = (e as CustomEvent).detail as boolean
      setHasNew(Boolean(detail))
    }
    window.addEventListener('news-has-new', onHasNew as EventListener)
    return () => window.removeEventListener('news-has-new', onHasNew as EventListener)
  }, [])

  const currentTheme = (theme ?? resolvedTheme) || 'dark'
  const isDark = currentTheme === 'dark'

  const toggleFilters = () => {
    window.dispatchEvent(new CustomEvent('toggle-filters'))
  }

  const refreshNow = () => {
    window.dispatchEvent(new CustomEvent('refresh-news'))
  }

  return (
    <header className="sticky top-0 z-40 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
      {/* Višina 56px; poravnano z vrhom kartic */}
      <div className="h-14 px-3 sm:px-4 flex items-center justify-between">
        {/* Logo + naslov (večje) */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"          // enoten logo
            alt="Križišče"
            width={36}
            height={36}
            priority
            className="w-9 h-9 rounded-md"
          />
          <div className="leading-tight">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Križišče
            </h1>
            <p className="hidden sm:block text-[11px] text-gray-600 dark:text-gray-400">
              Najnovejše novice slovenskih medijev
            </p>
          </div>
        </Link>

        {/* Desni kontrolniki */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Osveži – pokaže zeleno piko, ko so nove novice na voljo */}
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
            {/* ikona refresh */}
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M21 4v6h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {hasNew && (
              <span
                className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900 animate-pulse"
                aria-hidden="true"
              />
            )}
          </button>

          {/* Hamburger – še bolj transparenten */}
          <button
            type="button"
            onClick={toggleFilters}
            aria-label="Odpri filter"
            title="Filtri"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md
                       text-black/50 dark:text-white/60
                       hover:text-black/85 dark:hover:text-white/85
                       hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Toggle teme – modern sun/moon */}
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
        </div>
      </div>
    </header>
  )
}
