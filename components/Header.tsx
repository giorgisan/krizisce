// components/Header.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Header() {
  const router = useRouter()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => setMounted(true), [])

  // Signali iz index.tsx
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

  const currentTheme = (theme ?? resolvedTheme) || 'dark'
  const isDark = currentTheme === 'dark'

  const refreshNow = () => {
    setRefreshing(true)
    window.dispatchEvent(new CustomEvent('refresh-news'))
  }

  const toggleFilters = () =>
    window.dispatchEvent(new CustomEvent('toggle-filters'))

  // Če smo že na "/", prepreči navigacijo in samo scroll-aj na vrh
  const onBrandClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (router.pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAFA]/95 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
      {/* višina ni več fiksna; damo prijeten padding, da “diha” */}
      <div className="py-2 px-4 md:px-8 lg:px-16 flex items-center justify-between">
        {/* Levo: Brand (logo + naslov + slogan) + REFRESH gumb */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" onClick={onBrandClick} className="flex items-center gap-3 min-w-0">
            <Image
              src="/logo.png"
              alt="Križišče"
              width={36}
              height={36}
              priority
              className="w-9 h-9 rounded-md"
            />
            <div className="min-w-0 leading-tight">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Križišče
              </h1>
              <p className="text-xs sm:text-[13px] text-gray-600 dark:text-gray-400 mt-0.5">
                Najnovejše novice slovenskih medijev
              </p>
            </div>
          </Link>

          {/* Refresh – premaknjen levo, poleg naslova/loga */}
          <button
            type="button"
            onClick={refreshNow}
            aria-label="Osveži novice"
            title="Osveži"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md
                       text-black/60 dark:text-white/70
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
              <path
                d="M16.023 9.348h4.992V4.356M7.5 15.75H2.508v4.992"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M5.598 8.52a8.25 8.25 0 0113.434-1.908M18.432 16.98A8.25 8.25 0 016.75 19.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            {hasNew && !refreshing && (
              <span
                className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900 animate-pulse"
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        {/* Desno: tema + hamburger */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Tema toggle */}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label="Preklopi temo"
              title={isDark ? 'Preklopi na svetlo' : 'Preklopi na temno'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md
                         text-black/55 dark:text-white/65
                         hover:text-black/90 dark:hover:text-white/90
                         hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition relative overflow-hidden"
            >
              {/* Ikona sonca (vidna v temni temi) */}
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                className={`absolute transition-all duration-500 transform ${
                  isDark
                    ? 'opacity-100 scale-100 rotate-0 animate-iconIn'
                    : 'opacity-0 scale-50 -rotate-90'
                }`}
              >
                <path d="M12 4V2M12 22v-2M4.93 4.93 3.52 3.52M20.48 20.48l-1.41-1.41M4 12H2M22 12h-2M4.93 19.07 3.52 20.48M20.48 3.52l-1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              {/* Ikona lune (vidna v svetli temi) */}
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                className={`absolute transition-all duration-500 transform ${
                  !isDark
                    ? 'opacity-100 scale-100 rotate-0 animate-iconIn'
                    : 'opacity-0 scale-50 rotate-90'
                }`}
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </button>
          )}

          {/* Hamburger */}
          <button
            type="button"
            onClick={toggleFilters}
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
