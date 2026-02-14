/* components/Header.tsx */
'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { theme, setTheme, resolvedTheme } = useTheme()
  const router = useRouter()

  const isHome = router.pathname === '/'
  const showCategories = isHome 

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

  // Fokus na input pri mobile search
  useEffect(() => {
    if (mobileSearchOpen && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [mobileSearchOpen])

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
        // Silent fail
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

  // --- NOVE NOVICE (EVENT LISTENER - FIX) ---
  useEffect(() => {
    const onHasNew = (e: Event) => {
        const has = (e as CustomEvent).detail === true;
        setHasNew(has)
    }
    const onRefreshing = (e: Event) => {
        const isRef = (e as CustomEvent).detail === true;
        setRefreshing(isRef)
        if (isRef) setHasNew(false); 
    }
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
    <>
    <header 
      className={`
        sticky top-0 z-[60] w-full flex flex-col transition-all duration-300
        border-b border-gray-200 dark:border-gray-800
        ${scrolled || mobileMenuOpen 
            ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm' 
            : 'bg-white dark:bg-gray-900'}
        font-sans
      `}
    >
      <div className="w-full relative z-50 border-b border-gray-100 dark:border-gray-800/60">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 h-16 flex items-center justify-between gap-4 relative">
          
          {/* --- 1. LEVO (MOBILE): LUPA / SEARCH --- */}
          <div className="flex md:hidden shrink-0 z-10 w-10">
             <button 
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className={`p-2 -ml-2 rounded-md transition-colors ${mobileSearchOpen ? 'bg-gray-100 dark:bg-gray-800 text-brand' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
             >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
             </button>
          </div>

          {/* --- 2. SREDINA (MOBILE - CENTRIRANO) & LEVO (DESKTOP) --- */}
          <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:flex md:items-center md:gap-4 md:mr-auto z-0 flex flex-col items-center md:flex-row md:items-center text-center md:text-left">
            <Link href="/" onClick={handleLogoClick} className="flex items-center gap-3 md:gap-4 group">
              
              {/* POVEČAN LOGO */}
              <div className="relative w-10 h-10 md:w-14 md:h-14 shrink-0 transition-transform group-hover:scale-105 duration-300">
                <Image src="/logo.png" alt="Logo" fill className="object-contain" />
              </div>
          
              {/* DESNI DEL: NASLOV + SLOGAN POD NJIM */}
              <div className="flex flex-col items-start justify-center">
                <span className="text-xl md:text-3xl font-serif font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                  Križišče
                </span>
                
                {/* SLOGAN POD NAPISOM */}
                <span className="text-[10px] md:text-[13px] font-serif text-gray-500 dark:text-gray-400 leading-none mt-1 md:mt-1.5 opacity-90 whitespace-nowrap">
                  Zadnje novice slovenskih medijev
                </span>
              </div>
          
            </Link>


            {/* SVEŽE NOVICE (DESKTOP) */}
            <AnimatePresence initial={false}>
                {hasNew && !refreshing && isHome && (
                <motion.button
                    key="fresh-pill"
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    onClick={refreshNow}
                    className="hidden lg:flex items-center gap-2 px-3 py-1 
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

          {/* --- 3. DESNO (MOBILE): HAMBURGER --- */}
          <div className="flex md:hidden shrink-0 z-10 w-10 justify-end">
             <button 
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -mr-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md active:bg-gray-200 dark:active:bg-gray-700"
             >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
             </button>
          </div>

          {/* --- 4. DESNO (DESKTOP): CLASSIC LAYOUT --- */}
          <div className="hidden md:flex items-center gap-4 shrink-0 ml-auto">
            
            {/* SEARCH INPUT */}
            {isHome && (
              <div className="w-64 lg:w-80">
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

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
            
            {/* VREME */}
            {weather && (
              <div className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-2.5 py-1 rounded-full border border-gray-200/50 dark:border-gray-700/50" title={`${weather.city}: ${weather.temp}°C`}>
                  <span className="mr-1.5">{weather.city}</span>
                  <span className="text-gray-900 dark:text-white mr-1">{weather.temp} °C</span>
                  <span className="text-sm leading-none">{weather.icon}</span>
              </div>
            )}

            {/* FILTER BUTTON */}
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

            {/* ARHIV & THEME */}
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

      {/* --- MOBILE SEARCH BAR (Slide Down) --- */}
      <AnimatePresence>
        {mobileSearchOpen && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden"
            >
                <div className="px-4 py-3">
                    <form onSubmit={handleSubmit} className="relative flex items-center">
                        <svg className="absolute left-3 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="search"
                            placeholder="Išči po novicah..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-900 border-none rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-brand"
                            value={searchVal}
                            onChange={handleSearchChange}
                        />
                        <button 
                            type="button"
                            onClick={() => setMobileSearchOpen(false)}
                            className="ml-3 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        >
                            Zapri
                        </button>
                    </form>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* --- KATEGORIJE (NAVIGACIJA) --- */}
      {showCategories && (
        <div className="w-full bg-transparent">
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

    {/* --- MOBILE FULLSCREEN MENU (SIDE DRAWER) --- */}
<AnimatePresence>
      {mobileMenuOpen && (
        <>
            {/* Backdrop - Klik zapre meni */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 z-[90] bg-black/20 dark:bg-black/50 backdrop-blur-sm"
            />
            {/* Drawer s Swipe-to-close funkcijo */}
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0, right: 0.5 }}
                onDragEnd={(e, { offset, velocity }) => {
                    if (offset.x > 100 || velocity.x > 500) {
                        setMobileMenuOpen(false);
                    }
                }}
                /* TUKAJ: bg-white/80 (80% opacity) in backdrop-blur za prosojnost */
                className="fixed top-0 right-0 bottom-0 z-[100] w-[85%] max-w-[320px] bg-white/80 dark:bg-gray-950/50 backdrop-blur-xl flex flex-col overflow-hidden shadow-2xl border-l border-gray-200/50 dark:border-gray-800/50 touch-pan-y"
            >
                {/* Menu Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8">
                            <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                        </div>
                        <span className="text-xl font-serif font-bold text-gray-900 dark:text-white">Meni</span>
                    </div>
                    <button 
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900/50 rounded-full"
                    >
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Vsebina menija */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1 text-left">Orodja</p>
                        
                        <Link href="/arhiv" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-2 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-900/50">
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeLinecap="round" />
                            </svg>
                            <span className="text-left">Arhiv novic</span>
                        </Link>
                        
                        <button onClick={() => { onOpenFilter(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-2 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-900/50">
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            <span className="text-left">Filtriraj vire</span>
                        </button>
                        
                        {mounted && (
                            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="w-full flex items-center gap-3 px-2 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-900/50">
                                <span className="text-lg leading-none">{isDark ? '🌙' : '☀️'}</span>
                                <span className="text-left">{isDark ? 'Svetla tema' : 'Temna tema'}</span>
                            </button>
                        )}
                    </div>

                    <hr className="border-gray-100 dark:border-gray-800/50 my-4" />

                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1 text-left">Kontakt</p>
                            <a href="mailto:gjkcme@gmail.com" className="block px-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-brand transition-colors text-left">
                                Pošljite nam sporočilo
                            </a>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1 text-left">Informacije</p>
                            <div className="flex flex-col gap-1">
                                <Link href="/projekt" onClick={() => setMobileMenuOpen(false)} className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-brand transition-colors text-left">
                                    O projektu
                                </Link>
                                <Link href="/pogoji" onClick={() => setMobileMenuOpen(false)} className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-brand transition-colors text-left">
                                    Pogoji uporabe
                                </Link>
                                <Link href="/zasebnost" onClick={() => setMobileMenuOpen(false)} className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-brand transition-colors text-left">
                                    Politika zasebnosti
                                </Link>
                            </div>
                        </div>

                        {/* BRANDING - PORAVNAVA LEVO */}
                        <div className="px-2 pt-6 text-left">
                            <div className="flex items-center justify-start gap-2 mb-2 opacity-80">
                                <div className="relative w-5 h-5">
                                    <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                                </div>
                                <span className="font-serif font-bold text-gray-900 dark:text-white">Križišče</span>
                            </div>
                            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-500 mb-2">
                                Agregator najnovejših novic slovenskih medijev.<br/>
                                Članki so last izvornih portalov.
                            </p>
                            <span className="text-xs text-gray-300 dark:text-gray-600">© 2026 Križišče</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* --- FLOATING FILTER INDICATOR (Mobile Only) --- */}
    {activeSource !== 'Vse' && !mobileMenuOpen && (
        <button 
            onClick={onOpenFilter}
            className="md:hidden fixed bottom-6 left-6 z-40 bg-brand text-white p-3 rounded-full shadow-lg border-2 border-white dark:border-gray-900 animate-bounce"
            title="Filter je vklopljen"
        >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
        </button>
    )}
    </>
  )
}
