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

  // Upoštevaj resolvedTheme zaradi "system", če bi ga kdaj vklopili
  const currentTheme = (theme ?? resolvedTheme) || 'dark'
  const isDark = currentTheme === 'dark'

  // Da se izognemo hydration mismatchu, logo določi šele po mountu
  const logoSrc = !mounted
    ? '/logo.png' // placeholder (dark privzeto)
    : isDark
    ? '/logo.png' // svetel/obarvan logo za temno ozadje
    : '/logo.png'  // temen logo za svetlo ozadje

  return (
    <header className="sticky top-0 z-40 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md backdrop-saturate-150 py-2 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4">
        {/* Logo + naslov */}
        <Link href="/" className="flex items-center space-x-3">
          <Image
            src={logoSrc}
            alt="Križišče"
            width={32}
            height={32}
            priority
            className="w-8 h-8 rounded-md transition duration-300 transform hover:scale-105"
          />
          <div className="leading-tight">
            <h1 className="text-xl font-bold">Križišče</h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Najnovejše novice slovenskih medijev
            </p>
          </div>
        </Link>

        {/* Desni del: navigacija + tema */}
        <div className="flex items-center gap-4">
          <nav className="flex gap-4 text-sm">
            <Link
              href="/projekt"
              className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition"
            >
              O projektu
            </Link>
            <Link
              href="/pogoji"
              className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition"
            >
              Pogoji uporabe
            </Link>
          </nav>

          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-pressed={isDark}
              aria-label="Preklopi temo"
              className="text-xl"
              title={isDark ? 'Svetla tema' : 'Temna tema'}
            >
              {isDark ? '🌞' : '🌜'}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
