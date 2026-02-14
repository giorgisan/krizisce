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
  if (colorClass.includes('emerald')) return '#10b981'
  if (colorClass.includes('blue')) return '#3b82f6'
  if (colorClass.includes('red')) return '#ef4444'
  if (colorClass.includes('green')) return '#22c55e'
  if (colorClass.includes('slate')) return '#64748b'
  if (colorClass.includes('orange')) return '#f97316'
  if (colorClass.includes('purple')) return '#a855f7'
  if (colorClass.includes('pink')) return '#ec4899'
  return '#6366f1'
}

// --- HELPER ZA VREME ---
const getWeatherIcon = (code: number, isDay: number) => {
  if (code === 0) return isDay ? '☀️' : '🌙'
  if (code >= 1 && code <= 3) return isDay ? '⛅' : '☁️'
  if (code === 45 || code === 48) return '🌫️'
  if (code >= 51 && code <= 67) return '🌧️'
  if (code >= 71 && code <= 77) return '❄️'
  if (code >= 80 && code <= 82) return '🌦️'
  if (code >= 95 && code <= 99) return '⛈️'
  return '🌡️'
}

type WeatherData = {
  temp: number
  city: string
  icon: string
} | null

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
  
  // Mobile states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  
  const [weather, setWeather] = useState<WeatherData>(null)

  const { theme, setTheme, resolvedTheme } = useTheme()
  const router = useRouter()

  const isHome = router.pathname === '/'
  // Na desktopu kaže kategorije vedno, na mobile so v meniju
  const showCategoriesDesktop = isHome 

  useEffect(() => {
    setMounted(true)
  }, [])

  // Zapri menije ob spremembi poti
  useEffect(() => {
    setMobileMenuOpen(false)
    setMobileSearchOpen(false)
  }, [router.asPath])

  // Prepreči scrollanje ko je meni odprt
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  // --- VREME ---
  useEffect(() => {
    const CACHE_KEY = 'krizisce-weather-v1'
    const CACHE_DURATION = 1000 * 60 * 15 

    const fetchWeather = async () => {
      try {
        const ipRes = await fetch('https://ipapi.co/json/')
        if (!ipRes.ok) return
        const ipData = await ipRes.json()
        const { latitude, longitude, city } = ipData

        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
        )
        if (!weatherRes.ok) return
        const weatherData = await weatherRes.json()
        const current = weatherData.current_weather

        const newWeather = {
          temp: Math.round(current.temperature),
          city: city, 
          icon: getWeatherIcon(current.weathercode, current.is_day)
        }

        setWeather(newWeather)
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: newWeather,
          timestamp: Date.now()
        }))

      } catch (err) {
        console.log('Weather fetch skipped.')
      }
    }

    const cachedRaw = localStorage.getItem(CACHE_KEY)
    if (cachedRaw) {
      try {
        const { data, timestamp } = JSON.parse(cachedRaw)
        if (Date.now() - timestamp < CACHE_DURATION) {
          setWeather(data)
          return 
        }
      } catch {}
    }

    setTimeout(fetchWeather, 500)
  }, [])

  // --- NOVE NOVICE ---
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

  // --- SCROLL ---
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
    // Zapri mobile search po iskanju
    if (mobileSearchOpen) setMobileSearchOpen(false)
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
        ${scrolled || mobileMenuOpen
            ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm' 
            : 'bg-white dark:bg-gray-900'}
        font-sans
      `}
    >
      {/* GLAVNI HEADER VRSTICA */}
      <div className="w-full border-b border-gray-100 dark:border-gray-800/60 relative z-50">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 h-14 md:h-16 flex items-center justify-between gap-4">
          
          {/* 1. LEVO (MOBILE): HAMBURGER MENI */}
          <div className="flex md:hidden shrink-0">
             <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center gap-2 text-gray-900 dark:text-white p-1 -ml-1 active:opacity-70 transition-opacity"
             >
                <div className="relative w-6 h-5 flex flex-col justify-between">
                    <span className={`h-0.5 w-full bg-current transform transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2.5' : ''}`} />
                    <span className={`h-0.5 w-full bg-current transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                    <span className={`h-0.5 w-full bg-current transform transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                </div>
                <span className="text-[10px] font-black tracking-[0.2em] uppercase mt-0.5">Meni</span>
             </button>
          </div>

          {/* 2. LEVO (DESKTOP) & SREDINA (MOBILE): LOGO + SLOGAN */}
          <div className="flex items-center gap-4 shrink-0 mx-auto md:mx-0 md:mr-auto">
            <Link href="/" onClick={handleLogoClick} className="flex items-center gap-3 group">
                <div className="relative w-7 h-7 md:w-9 md:h-9">
                  <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-baseline gap-3">
                      <span className="text-xl md:text-2xl font-serif font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                          Križišče
                      </span>
                      
                      {/* PRENOVLJEN SLOGAN - ELITE STYLE */}
                      <span className="hidden md:block h-4 w-px bg-gray-300 dark:bg-gray-700"></span>
                      <span className="hidden md:block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 leading-none transform translate-y-[1px]">
                          Zadnje novice slovenskih medijev
                      </span>
                  </div>
                </div>
            </Link>

            {/* FRESH PILL (Desktop only location) */}
            <AnimatePresence initial={false}>
                {hasNew && !refreshing && isHome && (
                <motion.button
                    key="fresh-pill"
                    initial={{ opacity: 0, scale: 0.95, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: -10 }}
                    onClick={refreshNow}
                    className="hidden lg:flex items-center gap-2 px-3 py-1 
                               bg-[#10b981]/10 dark:bg-[#10b981]/20 
                               border border-[#10b981]/30
                               hover:bg-[#10b981]/20 dark:hover:bg-[#10b981]/30
                               text-[#10b981] dark:text-[#34d399]
                               text-[10px] font-bold uppercase tracking-wider rounded-full 
                               transition-all cursor-pointer backdrop-blur-sm"
                >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75 animate-ping"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10b981]"></span>
                    </span>
                    <span>Sveže</span>
                </motion.button>
                )}
            </AnimatePresence>
          </div>

          {/* 3. DESNO: ACTIONS (Desktop: Search, Weather, etc. / Mobile: Search Icon) */}
          <div className="flex items-center gap-1 md:gap-4 shrink-0">
            
            {/* MOBILE SEARCH TOGGLE */}
            <button 
                className="md:hidden p-2 text-gray-600 dark:text-gray-300"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
                {mobileSearchOpen ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                )}
            </button>

            {/* DESKTOP SEARCH */}
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
                    placeholder="Išči po novicah ..."
                    className="block w-full pl-10 pr-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-transparent 
                              focus:bg-white dark:focus:bg-black focus:border-brand/30 focus:ring-2 focus:ring-brand/10
                              rounded-full text-sm transition-all placeholder-gray-500 text-gray-900 dark:text-white"
                    value={searchVal}
                    onChange={handleSearchChange}
                  />
                </form>
              </div>
            )}

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden md:block"></div>
            
            {/* DESKTOP WEATHER */}
            {weather && (
              <div className="hidden lg:flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-2.5 py-1 rounded-full border border-gray-200/50 dark:border-gray-700/50" title={`${weather.city}: ${weather.temp}°C`}>
                  <span className="mr-1.5">{weather.city}</span>
                  <span className="text-gray-900 dark:text-white mr-1">{weather.temp} °C</span>
                  <span className="text-sm leading-none">{weather.icon}</span>
              </div>
            )}

            {/* DESKTOP FILTER BUTTON */}
            {isHome && (
              <button 
                onClick={onOpenFilter}
                className={`hidden md:block relative p-2 rounded-md transition-colors ${activeSource !== 'Vse' ? 'text-brand bg-brand/10' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
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

            {/* DESKTOP ICONS */}
            <div className="hidden md:flex items-center gap-2">
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
      </div>

      {/* --- MOBILE SEARCH BAR (Slide Down) --- */}
      <AnimatePresence>
        {mobileSearchOpen && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"
            >
                <div className="px-4 py-3">
                    <form onSubmit={handleSubmit} className="relative">
                        <input
                            autoFocus
                            type="search"
                            placeholder="Vpiši iskalni pojem..."
                            className="w-full pl-4 pr-10 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 
                                      rounded-lg text-base shadow-sm focus:ring-2 focus:ring-brand/20 focus:border-brand
                                      text-gray-900 dark:text-white"
                            value={searchVal}
                            onChange={handleSearchChange}
                        />
                        <button 
                            type="submit" 
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand text-white rounded-md"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </form>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* --- MOBILE FULLSCREEN MENU (Slide In) --- */}
      <AnimatePresence>
        {mobileMenuOpen && (
            <motion.div
                initial={{ opacity: 0, x: '-100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '-100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed inset-0 z-[100] bg-white dark:bg-gray-950 md:hidden flex flex-col"
                style={{ top: '0px' }} // Start from very top
            >
                {/* Mobile Menu Header */}
                <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Meni</span>
                    <button 
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 -mr-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu Content */}
                <div className="flex-1 overflow-y-auto px-6 py-8">
                    
                    {/* Slogan in Menu */}
                    <div className="mb-8 text-center">
                        <p className="text-xs font-serif italic text-gray-400 mb-2">Slovenski medijski agregat</p>
                        <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">Križišče</h2>
                    </div>

                    {/* Vreme v meniju */}
                    {weather && (
                        <div className="mb-8 flex justify-center">
                            <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-900 rounded-full">
                                <span className="text-lg">{weather.icon}</span>
                                <div className="flex flex-col text-xs leading-none">
                                    <span className="font-bold text-gray-900 dark:text-white">{weather.city}</span>
                                    <span className="text-gray-500">{weather.temp}°C</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigacija */}
                    <div className="space-y-1">
                        <button
                            onClick={() => { onSelectCategory('vse'); setMobileMenuOpen(false); }}
                            className={`w-full text-left py-3 text-lg font-bold border-b border-gray-100 dark:border-gray-900 
                                ${activeCategory === 'vse' ? 'text-brand' : 'text-gray-800 dark:text-gray-200'}`}
                        >
                            Vse novice
                        </button>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { onSelectCategory(cat.id); setMobileMenuOpen(false); }}
                                className={`w-full text-left py-3 text-lg font-bold border-b border-gray-100 dark:border-gray-900 
                                    ${activeCategory === cat.id ? 'text-brand' : 'text-gray-600 dark:text-gray-400'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Actions footer */}
                    <div className="mt-10 flex flex-col gap-4">
                        <Link href="/arhiv" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Arhiv novic</span>
                        </Link>

                        <button 
                            onClick={() => { onOpenFilter(); setMobileMenuOpen(false); }}
                            className="flex items-center gap-3 py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Filtriraj vire</span>
                        </button>

                        <div className="flex justify-center mt-4">
                            {mounted && (
                                <button
                                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"
                                >
                                    {isDark ? '🌙 Preklopi na svetlo temo' : '☀️ Preklopi na temno temo'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* --- DESKTOP NAVIGACIJA (Originalna, samo hidden na mobile) --- */}
      {showCategoriesDesktop && (
        <div className="w-full bg-transparent hidden md:block">
          <div className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 flex items-center">
            
            <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar flex-1 relative">
              <div className="md:sticky md:left-0 z-10 flex items-center md:pr-4">
                  <button
                    onClick={() => onSelectCategory('vse')}
                    style={{ fontFamily: 'var(--font-inter)' }}
                    className={`
                      relative py-3 text-sm uppercase tracking-wide whitespace-nowrap transition-colors font-bold group
                      ${activeCategory === 'vse' 
                        ? 'text-brand' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
                    `}
                  >
                    {activeCategory !== 'vse' && <span className="mr-1 text-brand">←</span>}
                    Vse novice
                    <span className={`
                      absolute bottom-0 left-0 w-full h-0.5 bg-brand rounded-t-md transition-all duration-200 origin-left
                      ${activeCategory === 'vse' 
                        ? 'opacity-100 scale-x-100' 
                        : 'opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100'}
                    `} />
                  </button>
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
              </div>

              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    style={{ fontFamily: 'var(--font-inter)' }}
                    className={`
                      relative py-3 text-sm uppercase tracking-wide whitespace-nowrap transition-colors
                      font-bold shrink-0 group
                      ${isActive 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
                    `}
                  >
                    {cat.label}
                    <span 
                      className={`
                        absolute bottom-0 left-0 w-full h-0.5 rounded-t-md transition-all duration-200 origin-left
                        ${isActive 
                          ? 'opacity-100 scale-x-100' 
                          : 'opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100'}
                        ${activeSource !== 'Vse' ? 'bg-brand' : ''}
                      `}
                      style={{ 
                        backgroundColor: activeSource === 'Vse' ? getCategoryColor(cat.color) : undefined 
                      }} 
                    />
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
