'use client'

import React from 'react'
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
    icon: (
      <svg className="w-4 h-4 mr-1.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
         <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    id: 'trending', 
    label: 'Aktualno',
    icon: (
      <svg className="w-4 h-4 mr-1.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ) 
  },
  {
    id: 'monitor',
    label: 'Monitor',
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
  return (
    <div className="flex justify-start w-full">
      <div className="relative flex p-1 bg-gray-200/50 dark:bg-gray-800/60 rounded-full backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const isActive = tab.id === active
          
          const baseClasses = `relative z-10 flex items-center px-3 sm:px-4 py-1.5 text-[13px] sm:text-sm font-medium transition-colors duration-200 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shrink-0
            ${isActive 
              ? 'text-gray-900 dark:text-white' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`

          // Če je tab link (Monitor), ga renderiramo kot Next.js Link
          if (tab.isLink && tab.href) {
             return (
                <Link 
                   key={tab.id} 
                   href={tab.href} 
                   className={baseClasses}
                   style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                   <span className="flex items-center relative z-20 group-hover:text-brand transition-colors">
                      <span>{tab.icon}</span>
                      {tab.label}
                   </span>
                </Link>
             )
          }

          // Ostali tabi (Najnovejše, Aktualno) ostanejo gumbi
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={baseClasses}
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
    </div>
  )
}
