// components/Header.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function Header() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const currentTheme = (theme ?? resolvedTheme) || 'dark'
  const isDark = currentTheme === 'dark'

  const onHamburgerClick = () => {
    // Globalni dogodek, ki ga ujame pages/index.tsx
    window.dispatchEvent(new CustomEvent('toggle-filters'))
  }

  return (
    <header className="sticky top-0 z-40 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
      {/* Kompakten header: ikone poravnane z vrhom kartic */}
      <div className="h-12 px-3 sm:px-4 flex items-center justify-between">
        {/* Logo + naslov (enoten logo) */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Križišče"
            width={28}
            height={28}
            priority
            className="w-7 h-7 rounded-md"
          />
          <div className="leading-tight">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Križišče
            </h1>
            <p className="hidden sm:block text-[11px] text-gray-600 dark:text-gray-400">
              Najnovejše novice slovenskih medijev
            </p>
          </div>
        </Link>

        {/* Desno: hamburger + tema (poravnano, brez tekstovnih linkov) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Hamburger */}
          <button
            type="button"
            onClick={onHamburgerClick}
            aria-label="Odpri filter"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d="M3 6h18M3 12h18M3 18h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Toggle teme – moderni sun/moon z animacijo */}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-pressed={isDark}
              aria-label="Preklopi temo"
              title={isDark ? 'Svetla tema' : 'Temna tema'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <span className="relative inline-block">
                {/* Sun */}
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  className={`transition-transform duration-300 ${isDark ? 'scale-0 rotate-90' : 'scale-100 rotate-0'}`}
                  aria-hidden="true"
                >
                  <path d="M12 4V2M12 22v-2M4.93 4.93 3.52 3.52M20.48 20.48l-1.41-1.41M4 12H2M22 12h-2M4.93 19.07 3.52 20.48M20.48 3.52l-1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                {/* Moon */}
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
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
