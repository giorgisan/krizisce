// components/NewsTabs.tsx
'use client'

import React from 'react'
import { motion } from 'framer-motion'

export type NewsTabId = 'latest' | 'trending'

interface NewsTabsProps {
  active: NewsTabId
  onChange: (tab: NewsTabId) => void
}

const TABS: { id: NewsTabId; label: string; icon?: React.ReactNode }[] = [
  { 
    id: 'latest', 
    label: 'Najnovejše',
    // Preprosta ikona ure
    icon: (
      <svg className="w-4 h-4 mr-1.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
         <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    id: 'trending', 
    label: 'Aktualno',
    // Ikona ognja
    icon: (
      <svg className="w-4 h-4 mr-1.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ) 
  },
]

export default function NewsTabs({ active, onChange }: NewsTabsProps) {
  return (
    <div className="flex justify-start mb-6 md:mb-8">
      {/* Container - deluje kot stikalo */}
      <div className="relative flex p-1 bg-gray-200/50 dark:bg-gray-800/60 rounded-full backdrop-blur-sm border border-gray-200 dark:border-gray-700/50">
        {TABS.map((tab) => {
          const isActive = tab.id === active
          
          // Izračunamo razrede brez uporabe knjižnice clsx
          const buttonClasses = [
            'relative z-10 flex items-center px-4 py-1.5 text-sm font-medium transition-colors duration-200 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
            isActive 
              ? 'text-gray-900 dark:text-white' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          ].join(' ')

          const spanClasses = [
            'flex items-center relative z-20',
            isActive && tab.id === 'trending' ? 'text-orange-500 dark:text-orange-400' : ''
          ].join(' ')

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={buttonClasses}
              style={{
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Ikona + Label */}
              <span className={spanClasses}>
                {tab.id === 'trending' && isActive ? (
                   <span className="text-orange-500 dark:text-orange-400">{tab.icon}</span>
                ) : (
                   <span>{tab.icon}</span>
                )}
                
                {tab.label}
              </span>

              {/* Drseče ozadje (samo za aktivni tab) */}
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
    </div>
  )
}
