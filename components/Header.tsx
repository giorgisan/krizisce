'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes' // Vrnjeno za temni način
import { useRouter } from 'next/router' // Za aktivna stanja

type Props = {
  onOpenFilter?: () => void
  onSearch?: (query: string) => void
  activeSource?: string
}

export default function Header({ 
  onOpenFilter = () => {}, 
  onSearch = () => {}, 
  activeSource = 'Vse' 
}: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [mounted, setMounted] = useState(false)
  
  // --- URNE FUNKCIJE ---
  const [nowMs, setNowMs] = useState<number>(0)
  
  // --- TEMNI NAČIN ---
  const { theme, setTheme, resolvedTheme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    setNowMs(Date.now())

    // Logika za uro
    const tick = () => setNowMs(Date.now())
    const toNext = 60_000 - (Date.now() % 60_000)
    
    const timeoutId = window.setTimeout(() => {
      tick()
      const intervalId = window.setInterval(tick, 60_000)
      return () => clearInterval(intervalId)
    }, toNext)

    return () => clearTimeout(timeoutId)
  }, [])

  // Formatiranje ure
  const time = mounted 
    ? new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date(nowMs))
    : '--:--'

  // Scroll efekt
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchVal(val)
    onSearch(val) // Takoj pošljemo spremembo (index.tsx bo poskrbel za zamik/debounce)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchVal)
    const activeEl = document.activeElement as HTMLElement
    if (activeEl) activeEl.blur() // Skrij tipkovnico na mobilniku
  }

  const isDark = (theme === 'dark' || resolvedTheme === 'dark')

  return (
    <header 
      className={`
        sticky top-0 z-40 w-full transition-all duration-300
        ${scrolled 
          ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm' 
          : 'bg-white dark:bg-gray-900 border-b border-transparent'}
      `}
    >
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 h-16 flex items-center justify-between gap-3 md:gap-6">
        
        {/* LEVO: Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative w-8 h-8 md:w-9 md:h-9">
             <Image src="/logo.png" alt="Logo" fill className="object-contain" />
          </div>
          <div className="hidden sm:block leading-tight">
             <div className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Križišče</div>
          </div>
        </Link>

        {/* SREDINA: Iskalnik */}
        <div className="flex-1 max-w-md">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400 group-focus-within:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="search"
              placeholder="Išči..."
              className="block w-full pl-10 pr-3 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-sm 
                         focus:ring-2 focus:ring-brand/50 focus:bg-white dark:focus:bg-gray-900 transition-all
                         placeholder-gray-500 text-gray-900 dark:text-white"
              value={searchVal}
              onChange={handleSearchChange}
            />
          </form>
        </div>

        {/* DESNO: Akcije (Ura, Filter, Arhiv, Tema) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* URA */}
          <span className="hidden md:inline-block font-mono tabular-nums text-xs text-gray-500 dark:text-gray-400 select-none mr-2">
            {time}
          </span>

          {/* GUMB FILTRI */}
          <button 
            onClick={onOpenFilter}
            className={`
              relative p-2 rounded-full transition-colors
              ${activeSource !== 'Vse' 
                ? 'bg-brand/10 text-brand' 
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}
            `}
            aria-label="Filtriraj vire"
            title="Filtriraj po viru"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {activeSource !== 'Vse' && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full ring-2 ring-white dark:ring-gray-900" />
            )}
          </button>

          {/* GUMB ARHIV */}
          <Link
            href="/arhiv"
            className={`
              p-2 rounded-full transition-colors text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800
              ${router.pathname === '/arhiv' ? 'text-brand bg-brand/10' : ''}
            `}
            aria-label="Arhiv"
            title="Arhiv novic"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </Link>

          {/* GUMB TEMNI NAČIN */}
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              aria-label="Preklopi temo"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          )}
          
        </div>
      </div>
    </header>
  )
}
