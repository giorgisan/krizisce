'use client'

import React from 'react'
import { motion } from 'framer-motion'
// Uvozimo definicije kategorij
import { CATEGORIES, CategoryId } from '@/lib/categories'

// Dodamo 'latest' in 'trending' k tipom zavihkov
export type NewsTabId = 'latest' | 'trending' | CategoryId

interface NewsTabsProps {
  active: NewsTabId
  onChange: (tab: NewsTabId) => void
}

export default function NewsTabs({ active, onChange }: NewsTabsProps) {
  
  // 1. Osnovni zavihki (Najnovejše, Aktualno)
  const baseTabs = [
    { 
      id: 'latest' as NewsTabId, 
      label: 'Najnovejše',
      icon: (
        <svg className="w-4 h-4 mr-1.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
           <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 'trending' as NewsTabId, 
      label: 'Aktualno',
      icon: (
        <svg className="w-4 h-4 mr-1.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      ) 
    },
  ]

  // 2. Kategorije iz lib/categories.ts (brez "ostalo")
  const categoryTabs = CATEGORIES
    .filter(c => c.id !== 'ostalo')
    .map(c => ({
      id: c.id as NewsTabId,
      label: c.label,
      // Lahko dodaš barvno piko za ikonco
      icon: <span className={`w-2 h-2 rounded-full mr-2 ${c.color.split(' ')[0].replace('bg-', 'bg-')}`}></span>
    }))

  const allTabs = [...baseTabs, ...categoryTabs]

  return (
    // Dodal sem overflow-x-auto za scrollanje na mobilnikih
    <div className="flex justify-start w-full overflow-x-auto no-scrollbar pb-2">
      <div className="relative flex p-1 bg-gray-200/50 dark:bg-gray-800/60 rounded-full backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 whitespace-nowrap">
        {allTabs.map((tab) => {
          const isActive = tab.id === active
          
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
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className={spanClasses}>
                {tab.id === 'trending' && isActive ? (
                   <span className="text-orange-500 dark:text-orange-400">{tab.icon}</span>
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
    </div>
  )
}
