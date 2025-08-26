// components/Header.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'

export default function Header() {
  const router = useRouter()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // null = v tej seji še ni bilo interakcije; [] = resetirano; ['RTVSLO'] = aktiven filter
  const [activeSources, setActiveSources] = useState<string[] | null>(null)

  // >>> ura: osvežuje se vsako minuto, prikazana samo na širših zaslonih
  const [time, setTime] = useState(() =>
    new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date())
  )
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(
        new Intl.DateTimeFormat('sl-SI', { hour: '2-digit', minute: '2-digit' }).format(new Date())
      )
    }, 60_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => setMounted(true), [])

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

  // ---- BRIDGE: prestrezi localStorage.setItem('selectedSources', ... ) in oddaj filters:update
  useEffect(() => {
    try {
      const origSetItem = localStorage.setItem.bind(localStorage)
      const patched = ((key: string, value: string) => {
        origSetItem(key, value)
        if (key === 'selectedSources') {
          try { sessionStorage.setItem('filters_interacted', '1') } catch {}
          try {
            const parsed = JSON.parse(value)
            const arr = Array.isArray(parsed) ? parsed : []
            window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources: arr } }))
          } catch {
            window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources: [] } }))
          }
        }
      }) as unknown as typeof localStorage.setItem

      ;(localStorage as any).__origSetItem__ = origSetItem
      ;(localStorage.setItem as any) = patched

      // fallback: če ob mountu že obstaja izbor in je bil ustvarjen v tej seji
      if (sessionStorage.getItem('filters_interacted') === '1') {
        const raw = localStorage.getItem('selectedSources')
        if (raw) {
          try {
            const arr = JSON.parse(raw)
            if (Array.isArray(arr)) setActiveSources(arr)
          } catch {}
        }
      }

      return () => {
        try {
          const orig = (localStorage as any).__origSetItem__ as typeof localStorage.setItem | undefined
          if (orig) (localStorage.setItem as any) = orig
        } catch {}
      }
    } catch {}
  }, [])

  // poslušaj filters:update (od bridga ali tvojega overlay-a)
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const det = (e as CustomEvent).detail
      const arr = det && Array.isArray(det.sources) ? det.sources : []
      setActiveSources(arr)
    }
    window.addEventListener('filters:update', onUpdate as EventListener)
    return () => window.removeEventListener('filters:update', onUpdate as EventListener)
  }, [])

  const clearFilters = () => {
    try { sessionStorage.setItem('filters_interacted', '1') } catch {}
    try { localStorage.setItem('selectedSources', JSON.stringify([])) } catch {}
    try { window.dispatchEvent(new CustomEvent('filters:update', { detail: { sources: [] } })) } catch {}
    setActiveSources([]) // skrij trak
  }

  const currentTheme = (theme ?? resolvedTheme) || 'dark'
  const isDark = currentTheme === 'dark'

  const refreshNow = () => {
    setRefreshing(true)
    window.dispatchEvent(new CustomEvent('refresh-news'))
  }

  const toggleFilters = () =>
    window.dispatchEvent(new CustomEvent('toggle-filters'))

  const onBrandClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (router.pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const activeLabel = useMemo(() => {
    if (!activeSources || activeSources.length === 0) return ''
    const shown = activeSources.slice(0, 2).join(', ')
    const extra = activeSources.length - 2
    return extra > 0 ? `${shown} +${extra}` : shown
  }, [activeSources])

  return (
    <header
      id="site-header"
      className="sticky top-0 z-40 bg-[#FAFAFA]/95 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm"
    >
      <div className="py-2 px-4 md:px-8 lg:px-16 flex items-center justify-between">
        {/* Levo: Brand */}
        <Link href="/" onClick={onBrandClick} className="flex items-center gap-3 min-w-0">
          <Image
            src="/logo.png"
            alt="Križišče"
            width={36}
            height= {36}
            priority
            fetchPriority="high"
            className="w-9 h-9 rounded-md"
          />
          <div className="min-w-0 leading-tight">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Križišče
            </h1>
            <p className="text-xs sm:text-[13px] text-gray-600 dark:text-gray-400 mt-0.5">
              Zadnje novice slovenskih medijev
            </p>
          </div>
        </Link>

        {/* Desno: ura (prikazana samo >=sm), refresh + tema + filter trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* ura je skrita na mobilnih (sm:hidden) in prikazana na širših sm:inline */}
          <span className="hidden sm:inline-block text-[13px] text-gray-500 dark:text-gray-400">
            {time}
          </span>

          {/* Refresh */}
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
              {/* Sun */}
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                className={`absolute transition-all duration-500 transform ${
                  isDark ? 'opacity-100 scale-100 rotate-0 animate-iconIn' : 'opacity-0 scale-50 -rotate-90'
                }`}
              >
                <path d="M12 4V2M12 22v-2M4.93 4.93 3.52 3.52M20.48 20.48l-1.41-1.41M4 12H2M22 12h-2M4.93 19.07 3.52 20.48M20.48 3.52l-1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              {/* Moon */}
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                className={`absolute transition-all duration-500 transform ${
                  !isDark ? 'opacity-100 scale-100 rotate-0 animate-iconIn' : 'opacity-0 scale-50 rotate-90'
                }`}
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </button>
          )}

          {/* Filter trigger (lijak namesto hamburgerja) */}
          <button
            id="filters-trigger"
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-filters'))}
            aria-label="Filtriraj vire"
            title="Filtriraj vire"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md
                       text-black/45 dark:text-white/55
                       hover:text-black/85 dark:hover:text-white/85
                       hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* trak – prikažemo ga, ko v tej seji obstaja aktiven izbor */}
      {activeSources !== null && activeSources.length > 0 && (
        <div className="px-4 md:px-8 lg:px-16 pb-2">
          <div className="flex items-center justify-between gap-3
                          rounded-lg border border-amber-200/60 dark:border-amber-800/50
                          bg-amber-50/90 dark:bg-amber-900/20
                          text-amber-900 dark:text-amber-200
                          px-3 py-2">
            <div className="min-w-0 text-[13px]">
              <span className="font-medium">Prikazani viri:</span>{' '}
              <span className="truncate">{activeLabel}</span>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-filters'))}
                className="hidden sm:inline text-[13px] underline decoration-amber-600/70 hover:decoration-amber-600"
              >
                Uredi
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="text-[13px] px-2.5 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-500"
              >
                Pokaži vse
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
