'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  /** Koliko px se mora uporabnik premakniti, da se gumb pokaže */
  threshold?: number
  /** Ali ob osvežitvi tudi scrollamo na vrh */
  scrollOnRefresh?: boolean
}

export default function BackToTop({ threshold = 600, scrollOnRefresh = true }: Props) {
  const [visible, setVisible] = useState(false)
  const [hasNew, setHasNew] = useState(false)         // na voljo nove novice
  const [refreshing, setRefreshing] = useState(false) // aktivno osveževanje
  const prefersReduced = useRef(false)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    prefersReduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const onScroll = () => {
      if (rafId.current) return
      rafId.current = window.requestAnimationFrame(() => {
        setVisible(window.scrollY > threshold)
        rafId.current = null
      })
    }

    const onHasNew = (e: Event) => {
      const ok = !!(e as CustomEvent).detail
      setHasNew(ok)
    }
    const onRefreshing = (e: Event) => {
      const r = !!(e as CustomEvent).detail
      setRefreshing(r)
      if (!r) setHasNew(false) // po uspešni osvežitvi banner skrijemo
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('news-has-new', onHasNew as EventListener)
    window.addEventListener('news-refreshing', onRefreshing as EventListener)
    onScroll() // init

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('news-has-new', onHasNew as EventListener)
      window.removeEventListener('news-refreshing', onRefreshing as EventListener)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [threshold])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReduced.current ? 'auto' : 'smooth',
    })
  }

  const handleClick = () => {
    if (hasNew && !refreshing) {
      // osveži in po želji skoči na vrh
      window.dispatchEvent(new CustomEvent('refresh-news'))
      if (scrollOnRefresh) scrollToTop()
    } else {
      scrollToTop()
    }
  }

  const title = refreshing
    ? 'Osvežujem …'
    : hasNew
    ? 'Nove novice — klikni za osvežitev'
    : 'Nazaj na vrh'

  return (
    <>
      {/* skrij, ko je preview modal odprt; animacije za utrip/spinner */}
      <style jsx global>{`
        body.preview-open .back-to-top { display: none !important; }
        @keyframes bt-pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes bt-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <button
        type="button"
        aria-label={title}
        title={title}
        onClick={handleClick}
        className={[
          'back-to-top fixed z-40 select-none',
          'right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] md:right-6 md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]',
          'h-11 w-11 rounded-full shadow-lg grid place-items-center',
          'ring-1 ring-black/10 dark:ring-white/10',
          'transition-all duration-200 will-change-transform',
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none',
          refreshing
            ? 'bg-brand text-white'
            : hasNew
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-brand hover:bg-brand-hover text-white',
        ].join(' ')}
        style={{
          animation:
            prefersReduced.current
              ? undefined
              : hasNew && !refreshing
              ? 'bt-pulse 1.8s ease-out infinite'
              : undefined,
        }}
      >
        {/* Ikona: spinner med osveževanjem, refresh ko so nove novice, sicer puščica navzgor */}
        {refreshing ? (
          <svg
            viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"
            style={{ animation: prefersReduced.current ? undefined : 'bt-rotate 0.9s linear infinite' }}
          >
            <path d="M12 3a9 9 0 1 0 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : hasNew ? (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 0 0-14-4M4 16a8 8 0 0 0 14 4" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M12 5l-7 7m7-7l7 7M12 5v14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </>
  )
}
