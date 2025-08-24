'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  /** Koliko px se mora uporabnik premakniti, da se gumb pokaže */
  threshold?: number
}

export default function BackToTop({ threshold = 600 }: Props) {
  const [visible, setVisible] = useState(false)
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

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // init
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [threshold])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReduced.current ? 'auto' : 'smooth',
    })
  }

  return (
    <>
      {/* skrij, ko je preview modal odprt */}
      <style jsx global>{`
        body.preview-open .back-to-top {
          display: none !important;
        }
      `}</style>

      <button
        type="button"
        aria-label="Nazaj na vrh"
        title="Nazaj na vrh"
        onClick={scrollToTop}
        className={[
          'back-to-top fixed z-40',
          'right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] md:right-6 md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]',
          'h-11 w-11 rounded-full shadow-lg',
          'bg-brand text-white hover:bg-brand-hover',
          'ring-1 ring-black/10 dark:ring-white/10',
          'grid place-items-center',
          'transition-all duration-200 will-change-transform',
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none',
        ].join(' ')}
      >
        {/* puščica navzgor */}
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M12 5l-7 7m7-7l7 7M12 5v14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  )
}
