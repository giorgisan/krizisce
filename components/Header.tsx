'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/router'
import { CATEGORIES, CategoryId } from '../lib/categories'

type Props = {
  onOpenFilter?: () => void
  onSearch?: (query: string) => void
  activeSource?: string
  activeCategory?: CategoryId | 'vse'
  onSelectCategory?: (cat: CategoryId | 'vse') => void
}

export default function Header({ 
  onOpenFilter = () => {}, 
  onSearch = () => {}, 
  activeSource = 'Vse',
  activeCategory = 'vse',
  onSelectCategory = () => {}
}: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [mounted, setMounted] = useState(false)
  
  // --- URA ---
  const [nowMs, setNowMs] = useState<number>(0)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const router = useRouter()

  // Scroll ref za kategorije
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    setNowMs(Date.now())
    const tick = () => setNowMs(Date.now())
    const toNext = 60_000 - (Date.now() % 60_000)
    const timeoutId = window.setTimeout(() => {
      tick()
      const intervalId = window.setInterval(tick, 60_000)
      return () => clearInterval(intervalId)
    }, toNext)
    return () => clearTimeout(timeoutId)
  }, [])

  const time = mounted 
    ? new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date(nowMs))
    : '--:--'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchVal(val)
    onSearch(val)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchVal)
    const activeEl = document.activeElement as HTMLElement
    if (activeEl) activeEl.blur()
  }

  const isDark = (theme === 'dark' || resolvedTheme === 'dark')

  return (
    <header 
      className={`
        sticky top-0 z-40 w-full transition-shadow duration-300 flex flex-col
        bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800
        ${scrolled ? 'shadow-md' : ''}
      `}
    >
      {/* --- ZGORNJA VRSTICA (Logo, Slogan, Search, Tools) --- */}
      <div className="w-full border-b border-gray-100 dark:border-gray-800/50">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 h-16 flex items-center justify-between gap-4">
          
          {/* LEVO: Logo & Slogan */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="relative w-8 h-8 md:w-9 md:h-9">
               <Image src="/logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <div className="flex flex-col justify-center">
               <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                 Križišče
               </span>
               <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 leading-none mt-1 hidden sm:block">
                 Zadnje novice slovenskih medijev
               </span>
            </div>
          </Link>

          {/* SREDINA: Iskalnik */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400 group-focus-within:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="search"
                placeholder="Išči po novicah..."
                className="block w-full pl-10 pr-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-transparent 
                           focus:bg-white dark:focus:bg-black focus:border-brand/30 focus:ring-2 focus:ring-brand/10
                           rounded-md text-sm transition-all placeholder-gray-500 text-gray-900 dark:text-white"
                value={searchVal}
                onChange={handleSearchChange}
              />
            </form>
          </div>

          {/* DESNO: Orodja */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Mobile Search Icon (Expandable logic omitted for brevity, simple input shown on mobile below nav) */}
            
            <span className="hidden lg:inline-block font-mono text-xs text-gray-400 dark:text-gray-500 select-none border-r border-gray-200 dark:border-gray-700 pr-3 mr-1">
              {time}
            </span>

            <button 
              onClick={onOpenFilter}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-medium
                ${activeSource !== 'Vse' 
                  ? 'bg-brand text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}
              `}
              title="Filtriraj po viru"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden sm:inline">{activeSource === 'Vse' ? 'Viri' : activeSource}</span>
            </button>

            <Link
              href="/arhiv"
              className={`
                p-2 rounded-md transition-colors text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800
                ${router.pathname === '/arhiv' ? 'text-brand bg-brand/5' : ''}
              `}
              title="Arhiv"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </Link>

            {mounted && (
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
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
      </div>

      {/* --- SPODNJA VRSTICA (Navigacija Kategorij) --- */}
      <div className="w-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16">
          <nav 
            className="flex items-center gap-6 overflow-x-auto no-scrollbar py-0"
            ref={navRef}
          >
            {/* Iskalnik za mobilne (viden le na malih ekranih znotraj nav vrstice ali nad njo) */}
            <div className="md:hidden py-2 min-w-[140px]">
               <input
                type="search"
                placeholder="Išči..."
                className="w-full px-3 py-1 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-xs"
                value={searchVal}
                onChange={handleSearchChange}
              />
            </div>

            <button
              onClick={() => onSelectCategory('vse')}
              className={`
                whitespace-nowrap py-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors
                ${activeCategory === 'vse' 
                  ? 'border-brand text-brand' 
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'}
              `}
            >
              Vse novice
            </button>

            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`
                  whitespace-nowrap py-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors
                  ${activeCategory === cat.id 
                    ? 'border-brand text-brand' // Lahko uporabiš cat.color za border, če želiš barvno (npr. style={{ borderColor: cat.color }})
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'}
                `}
              >
                {cat.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
