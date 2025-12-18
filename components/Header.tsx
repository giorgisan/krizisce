'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/router'
import { CATEGORIES, CategoryId } from '../lib/categories'
import { motion, AnimatePresence } from 'framer-motion'

// --- HELPER ZA BARVE ---
const getCategoryColor = (colorClass: string) => {
  if (colorClass.includes('emerald')) return '#10b981' // Slovenija
  if (colorClass.includes('blue')) return '#3b82f6'    // Svet
  if (colorClass.includes('red')) return '#ef4444'     // Kronika
  if (colorClass.includes('green')) return '#22c55e'   // Šport
  if (colorClass.includes('slate')) return '#64748b'   // Posel & Tech
  if (colorClass.includes('orange')) return '#f97316'  // Moto
  if (colorClass.includes('purple')) return '#a855f7'  // Kultura
  if (colorClass.includes('pink')) return '#ec4899'    // Magazin
  return '#6366f1' // Default
}

type Props = {
  onOpenFilter?: () => void
  onSearch?: (query: string) => void
  activeSource?: string
  activeCategory?: CategoryId | 'vse'
  onSelectCategory?: (cat: CategoryId | 'vse') => void
  onReset?: () => void
}

export default function Header({ 
  onOpenFilter = () => {}, 
  onSearch = () => {}, 
  activeSource = 'Vse',
  activeCategory = 'vse',
  onSelectCategory = () => {},
  onReset = () => {} 
}: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [mounted, setMounted] = useState(false)
  
  const [hasNew, setHasNew] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  const [nowMs, setNowMs] = useState<number>(0)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const router = useRouter()

  const isHome = router.pathname === '/'
  const showCategories = isHome 

  // Ura
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

  // Logika za "Nove novice"
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

  const refreshNow = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setRefreshing(true)
    window.dispatchEvent(new CustomEvent('refresh-news'))
  }

  // Scroll senca
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

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isHome) {
      e.preventDefault()
      setSearchVal('') 
      onReset()       
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const isDark = (theme === 'dark' || resolvedTheme === 'dark')

  return (
    <header 
      className={`
        sticky top-0 z-40 w-full flex flex-col transition-all duration-300
        border-b border-gray-200 dark:border-gray-800
        ${scrolled 
            ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm' 
            : 'bg-white dark:bg-gray-900'}
        font-sans
      `}
    >
      <div className="w-full border-b border-gray-100 dark:border-gray-800/60">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 h-16 flex items-center justify-between gap-4">
          
          {/* LEVO: Logo & Slogan & Gumb */}
          <div className="flex items-center gap-4 shrink-0 mr-auto">
            <Link href="/" onClick={handleLogoClick} className="flex items-center gap-3 group">
                <div className="relative w-8 h-8 md:w-9 md:h-9">
                  <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                </div>
                <div className="flex flex-col justify-center">
                  {/* LOGO FONT - Playfair Display (via global font-serif) */}
                  <span className="text-2xl font-serif font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                      Križišče
                  </span>
                  
                  {/* PODNAPIS */}
                  <span className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400 leading-none mt-1">
                      Zadnje novice slovenskih medijev
                  </span>
                </div>
            </Link>

            {/* --- FRESH NEWS PILL --- */}
            <AnimatePresence initial={false}>
                {hasNew && !refreshing && isHome && (
                <motion.button
                    key="fresh-pill"
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    onClick={refreshNow}
                    className="hidden md:flex items-center gap-2 px-3 py-1 
                               bg-[#10b981]/10 dark:bg-[#10b981]/20 
                               border border-[#10b981]/30
                               hover:bg-[#10b981]/20 dark:hover:bg-[#10b981]/30
                               text-[#10b981] dark:text-[#34d399]
                               text-[10px] md:text-xs font-medium rounded-full 
                               transition-all cursor-pointer ml-3 backdrop-blur-sm"
                >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
                    </span>
                    
                    <span className="flex items-center leading-none">
                        <span className="font-bold">Na voljo so sveže novice</span>
                        <span className="ml-1 opacity-80">— kliknite za osvežitev</span>
                    </span>
                </motion.button>
                )}
            </AnimatePresence>
          </div>

          {/* DESNO: Search + Orodja */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-auto">
            
            {/* SEARCH (Desktop only) */}
            {isHome && (
              <div className="hidden md:block w-64 lg:w-80">
                <form onSubmit={handleSubmit} className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400 group-focus-within:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="search"
                    placeholder="Išči po naslovu ali podnaslovu ..."
                    className="block w-full pl-10 pr-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-transparent 
                              focus:bg-white dark:focus:bg-black focus:border-brand/30 focus:ring-2 focus:ring-brand/10
                              rounded-md text-sm transition-all placeholder-gray-500 text-gray-900 dark:text-white"
                    value={searchVal}
                    onChange={handleSearchChange}
                  />
                </form>
              </div>
            )}

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden md:block"></div>
            
            <span className="hidden lg:inline-block font-mono text-xs text-gray-500 dark:text-gray-400">
              {time}
            </span>

            {isHome && (
              <button 
                onClick={onOpenFilter}
                className={`relative p-2 rounded-md transition-colors ${activeSource !== 'Vse' ? 'text-brand bg-brand/10' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                title="Filtriraj po viru"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {activeSource !== 'Vse' && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full ring-2 ring-white dark:ring-gray-900" />
                )}
              </button>
            )}

            <Link
              href="/arhiv"
              className={`p-2 rounded-md transition-colors text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 ${router.pathname === '/arhiv' ? 'text-brand' : ''}`}
              title="Arhiv"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeLinecap="round" />
              </svg>
            </Link>

            {mounted && (
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                title={isDark ? 'Preklopi na svetlo temo' : 'Preklopi na temno temo'}
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

      {/* --- SPODNJA VRSTICA (Navigacija) --- */}
      {showCategories && (
        <div className="w-full bg-transparent">
          <div className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16">
            <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar">
              
              {/* SEARCH ZA MOBILE */}
              <div className="md:hidden py-2 min-w-[140px]">
                <input
                  type="search"
                  placeholder="Išči..."
                  className="w-full px-3 py-1 bg-gray-100 dark:bg-gray-800 border-none rounded-md text-xs"
                  value={searchVal}
                  onChange={handleSearchChange}
                />
              </div>

              <button
                onClick={() => onSelectCategory('vse')}
                className={`
                  relative py-3 text-sm uppercase tracking-wide whitespace-nowrap transition-colors
                  font-semibold 
                  ${activeCategory === 'vse' 
                    ? 'text-brand' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
                `}
              >
                Vse novice
                {activeCategory === 'vse' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand rounded-t-md" />
                )}
              </button>

              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className={`
                      relative py-3 text-sm uppercase tracking-wide whitespace-nowrap transition-colors
                      font-semibold
                      ${isActive 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
                    `}
                  >
                    {cat.label}
                    {isActive && (
                      <span 
                        // Če je vir "Vse" -> uporabi barvo kategorije (zelena, rdeča...)
                        // Če je vir specifičen -> uporabi 'bg-brand' (oranžna)
                        className={`absolute bottom-0 left-0 w-full h-0.5 rounded-t-md ${activeSource !== 'Vse' ? 'bg-brand' : ''}`}
                        style={{ backgroundColor: activeSource === 'Vse' ? getCategoryColor(cat.color) : undefined }} 
                      />
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
