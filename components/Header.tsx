'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/router'
import { CATEGORIES, CategoryId } from '../lib/categories'
import { motion, AnimatePresence } from 'framer-motion'

// --- HELPER ZA BARVE (Kategorije) ---
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
  const isDark = (theme === 'dark' || resolvedTheme === 'dark')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Zapri menije ob navigaciji
  useEffect(() => {
    setMobileMenuOpen(false)
    setMobileSearchOpen(false)
  }, [router.asPath])

  // Zakleni scroll, ko je meni odprt
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  // Fokus na input, ko odpreš iskanje
  useEffect(() => {
    if (mobileSearchOpen && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [mobileSearchOpen])

  // --- VREME (Isto kot prej) ---
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
  }

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isHome) {
      e.preventDefault()
      setSearchVal('') 
      onReset()        
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <>
    <header 
      className={`
        sticky top-0 z-[60] w-full flex flex-col transition-all duration-300
        border-b border-gray-200 dark:border-gray-800
        ${scrolled ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm' : 'bg-white dark:bg-gray-900'}
        font-sans
      `}
    >
      <div className="w-full">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 h-16 flex items-center justify-between gap-4">
          
          {/* 1. LEVO (MOBILE): SAMO HAMBURGER */}
          <div className="flex md:hidden shrink-0">
             <button 
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -ml-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
             >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
             </button>
          </div>

          {/* 2. SREDINA / LEVO (DESKTOP): LOGO + SLOGAN */}
          <div className="flex items-center gap-4 shrink-0 mx-auto md:mx-0 md:mr-auto">
            <Link href="/" onClick={handleLogoClick} className="flex items-center gap-3 group">
                <div className="relative w-8 h-8">
                  <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-baseline gap-3">
                      <span className="text-xl md:text-2xl font-serif font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                          Križišče
                      </span>
                      {/* Slogan samo na desktopu */}
                      <span className="hidden md:block h-4 w-px bg-gray-300 dark:bg-gray-700"></span>
                      <span className="hidden md:block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 leading-none transform translate-y-[1px]">
                          Zadnje novice slovenskih medijev
                      </span>
                  </div>
                </div>
            </Link>

            {/* Gumb "Sveže novice" */}
            <AnimatePresence>
                {hasNew && !refreshing && isHome && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    onClick={refreshNow}
                    className="hidden lg:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider rounded-full cursor-pointer ml-4"
                >
                    <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span>
                    <span>Sveže</span>
                </motion.button>
                )}
            </AnimatePresence>
          </div>

          {/* 3. DESNO: SEARCH IKONA & OSTALO */}
          <div className="flex items-center gap-1 md:gap-3 shrink-0">
            
            {/* Lupa za odpiranje iskanja (Mobile & Desktop) */}
            <button 
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className={`p-2 rounded-md transition-colors ${mobileSearchOpen ? 'bg-gray-100 dark:bg-gray-800 text-brand' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>

            {/* Desktop only ikone (Arhiv, Vreme, Tema) */}
            <div className="hidden md:flex items-center gap-2">
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>
                {weather && (
                  <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-full" title={`${weather.city}: ${weather.temp}°C`}>
                      <span>{weather.city}</span>
                      <span className="mx-1.5 text-gray-300 dark:text-gray-600">|</span>
                      <span className="font-bold text-gray-900 dark:text-white">{weather.temp}°</span>
                      <span className="ml-1">{weather.icon}</span>
                  </div>
                )}
                {isHome && (
                  <button onClick={onOpenFilter} className={`p-2 rounded-md ${activeSource !== 'Vse' ? 'text-brand' : 'text-gray-500'}`} title="Filtri">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  </button>
                )}
                {mounted && (
                  <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                    {isDark ? '🌙' : '☀️'}
                  </button>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* --- ISKALNA VRSTICA (Slide Down) --- */}
      <AnimatePresence>
        {mobileSearchOpen && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden"
            >
                <div className="max-w-[1800px] mx-auto px-4 py-3">
                    <form onSubmit={handleSubmit} className="relative flex items-center">
                        <svg className="absolute left-3 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="search"
                            placeholder="Išči po naslovih, vsebini, ključnih besedah..."
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

      {/* --- DESKTOP CATEGORIES --- */}
      <div className="hidden md:block border-b border-gray-100 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16">
            <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar">
              <button
                onClick={() => onSelectCategory('vse')}
                className={`py-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors ${activeCategory === 'vse' ? 'border-brand text-brand' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                Vse novice
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  style={{ borderColor: activeCategory === cat.id ? getCategoryColor(cat.color) : 'transparent' }}
                  className={`py-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors ${activeCategory === cat.id ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  {cat.label}
                </button>
              ))}
            </nav>
          </div>
      </div>
    </header>

    {/* --- MOBILE FULLSCREEN MENU (Opaque & Clean) --- */}
    <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white dark:bg-gray-950 flex flex-col overflow-hidden"
        >
            {/* Header menija */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <span className="text-xl font-serif font-bold text-gray-900 dark:text-white">Meni</span>
                <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Vsebina menija */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Vreme widget */}
                {weather && (
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Trenutno vreme</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{weather.city}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl">{weather.icon}</span>
                            <p className="font-mono font-bold text-gray-900 dark:text-white">{weather.temp}°C</p>
                        </div>
                    </div>
                )}

                {/* Kategorije */}
                <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Rubrike</p>
                    <button
                        onClick={() => { onSelectCategory('vse'); setMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-colors ${activeCategory === 'vse' ? 'bg-brand/10 text-brand' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'}`}
                    >
                        Vse novice
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => { onSelectCategory(cat.id); setMobileMenuOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-colors ${activeCategory === cat.id ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'}`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <hr className="border-gray-100 dark:border-gray-800" />

                {/* Orodja */}
                <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Orodja</p>
                    <Link href="/arhiv" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        <span>Arhiv novic</span>
                    </Link>
                    <button onClick={() => { onOpenFilter(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        <span>Filtriraj vire</span>
                    </button>
                    {mounted && (
                        <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900">
                            <span>{isDark ? '🌙' : '☀️'}</span>
                            <span>{isDark ? 'Svetla tema' : 'Temna tema'}</span>
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
