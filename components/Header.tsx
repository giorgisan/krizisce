// components/Header.tsx
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Props = {
  // Dodani vprašaji (?) pomenijo, da so ti parametri neobvezni
  onOpenFilter?: () => void
  onSearch?: (query: string) => void
  activeSource?: string
}

export default function Header({ 
  onOpenFilter = () => {}, // Privzeta vrednost (prazna funkcija)
  onSearch = () => {},     // Privzeta vrednost (prazna funkcija)
  activeSource = 'Vse'     // Privzeta vrednost
}: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  // Preverimo, če smo na strani, ki podpira iskanje (če je onSearch definiran izven defaulta)
  // To je sicer vedno true zaradi defaulta, ampak za logiko prikaza:
  // V tem primeru bomo iskalnik prikazali vedno, a na 404 strani ne bo delal nič (kar je ok),
  // ali pa ga lahko skrijemo, če želimo. Zaenkrat pustimo, da je dizajn konsistenten.

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchVal)
    const activeEl = document.activeElement as HTMLElement
    if (activeEl) activeEl.blur()
  }

  return (
    <header 
      className={`
        sticky top-0 z-40 w-full transition-all duration-300
        ${scrolled 
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm' 
          : 'bg-white dark:bg-gray-900 border-b border-transparent'}
      `}
    >
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 h-16 flex items-center justify-between gap-4">
        
        {/* LEVO: Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative w-8 h-8 md:w-9 md:h-9">
             <Image src="/logo.png" alt="Logo" fill className="object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white hidden sm:block">
            Križišče
          </span>
        </Link>

        {/* SREDINA: Iskalnik */}
        <div className="flex-1 max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400 group-focus-within:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="search"
              placeholder="Išči novice..."
              className="block w-full pl-10 pr-3 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-sm 
                         focus:ring-2 focus:ring-brand/50 focus:bg-white dark:focus:bg-gray-900 transition-all
                         placeholder-gray-500 text-gray-900 dark:text-white"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
          </form>
        </div>

        {/* DESNO: Akcije */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Gumb za Filter */}
          <button 
            onClick={onOpenFilter}
            className={`
              relative p-2 rounded-full transition-colors
              ${activeSource !== 'Vse' 
                ? 'bg-brand/10 text-brand' 
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}
            `}
            aria-label="Filtriraj vire"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {activeSource !== 'Vse' && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full ring-2 ring-white dark:ring-gray-900" />
            )}
          </button>
          
        </div>
      </div>
    </header>
  )
}
