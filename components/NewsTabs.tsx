'use client'

import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export type NewsTabId = 'latest' | 'trending' | 'monitor'

interface NewsTabsProps {
  active: string 
  onChange: (tab: any) => void
}

const TABS = [
  { 
    id: 'latest', 
    label: 'Najnovejše',
    isLink: false,
    icon: (
      <svg className="w-4 h-4 mr-1.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
         <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    id: 'trending', 
    label: 'Aktualno',
    isLink: false,
    icon: (
      <svg className="w-4 h-4 mr-1.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ) 
  },
  {
    id: 'monitor',
    // Mobile: "Presek" | Desktop: "Medijski presek"
    labelMobile: 'Presek',
    labelDesktop: 'Medijski presek',
    isLink: true,
    href: '/analiza',
    icon: (
      <svg className="w-4 h-4 mr-1.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
         <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672Zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5" />
      </svg>
    )
  }
]

export default function NewsTabs({ active, onChange }: NewsTabsProps) {
  const stateTabs = TABS.filter(t => !t.isLink)
  const linkTabs = TABS.filter(t => t.isLink)

  // UX dodatek: detekcija scrolla, da vemo, ali naj prikažemo "fading edge" senco na desni
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
      if (scrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          // Če imamo še več kot 5px za scrollanje v desno, prikaži indikator
          setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
      }
  };

  useEffect(() => {
      checkScroll();
      window.addEventListener('resize', checkScroll);
      return () => window.removeEventListener('resize', checkScroll);
  }, []);

  return (
    <div className="relative w-full">
        {/* Fading Edge Indikator na desni (viden samo, ko je scroll mogoč) */}
        <div 
            className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#F9FAFB] dark:from-gray-900 to-transparent pointer-events-none z-30 transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`} 
            aria-hidden="true" 
        />

        <div 
            ref={scrollRef}
            onScroll={checkScroll}
            // pr-4 (padding-right) poskrbi, da gumb ob scrollu na konec ne butne ostro v rob zaslona
            className="flex items-center justify-start w-full gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1 pr-4 sm:pr-0"
        >
          
          {/* 1. KAPSULA ZA STANJE (Najnovejše / Aktualno) */}
          <div className="relative flex p-1 bg-gray-200/50 dark:bg-gray-800/60 rounded-full backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 shrink-0">
            {stateTabs.map((tab) => {
              const isActive = tab.id === active
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onChange(tab.id)}
                  className={`relative z-10 flex items-center px-3 sm:px-4 py-1.5 text-[13px] sm:text-sm font-medium transition-colors duration-200 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shrink-0
                    ${isActive 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <span className={`flex items-center relative z-20 ${isActive && tab.id === 'trending' ? 'text-brand' : ''}`}>
                    {tab.id === 'trending' && isActive ? (
                        <span className="text-brand">{tab.icon}</span>
                    ) : (
                        <span>{tab.icon}</span>
                    )}
                    {tab.label}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-white dark:bg-gray-700 shadow-sm rounded-full z-10"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* 2. SAMOSTOJEN GUMB ZA MONITOR (Odcepljen) */}
          {linkTabs.map((tab) => (
            <Link 
                key={tab.id} 
                href={tab.href!} 
                className="flex items-center px-3 sm:px-4 py-[7px] text-[13px] sm:text-sm font-medium transition-all duration-200 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-600 dark:text-gray-300 hover:text-brand hover:border-brand/30 hover:bg-gray-50 dark:hover:bg-gray-700 shrink-0"
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                <span className="flex items-center transition-colors">
                  <span>{tab.icon}</span>
                  {/* Prikaz različnih label za mobile in desktop */}
                  <span className="sm:hidden">{tab.labelMobile}</span>
                  <span className="hidden sm:inline">{tab.labelDesktop}</span>
                </span>
            </Link>
          ))}

        </div>
    </div>
  )
}
