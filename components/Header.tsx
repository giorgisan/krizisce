// components/Header.tsx
"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = theme === 'dark'

  return (
    <header className="sticky top-0 z-40 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md backdrop-saturate-150 py-2 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4">
        <div className="flex items-center space-x-3">
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer">
              <Image
                src="/logo.png"
                alt="Križišče"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full transition duration-300 transform hover:scale-105 hover:shadow-lg"
              />
              <div>
                <h1 className="text-xl font-bold leading-tight">Križišče</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Najnovejše novice slovenskih medijev</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {/* Navigacija do drugih strani */}
          <nav className="flex gap-4 text-sm">
            <Link href="/projekt">
              <a className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition">O projektu</a>
            </Link>
            <Link href="/pogoji">
              <a className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition">Pogoji uporabe</a>
            </Link>
          </nav>

          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-pressed={isDark}
              className="text-xl"
            >
              {isDark ? '🌞' : '🌜'}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
