// components/NewsTabs.tsx
'use client'

import React from 'react'

export type NewsTabId = 'latest' | 'trending'

interface NewsTabsProps {
  active: NewsTabId
  onChange: (tab: NewsTabId) => void
}

const TABS: { id: NewsTabId; label: React.ReactNode }[] = [
  { id: 'latest', label: 'Najnovejše' },
  { id: 'trending', label: <>🔥 Aktualno</> },
]

export default function NewsTabs({ active, onChange }: NewsTabsProps) {
  const makeClasses = (isActive: boolean) => {
    const base =
      'relative pb-2 text-sm md:text-[15px] font-medium transition-colors select-none outline-none'
    const idle =
      'text-gray-400 hover:text-gray-200 focus-visible:text-gray-100'
    const activeCls = 'text-white'
    return `${base} ${isActive ? activeCls : idle}`
  }

  return (
    <div className="mb-3 md:mb-4">
      <div
        className="flex items-end gap-6 border-b border-gray-800/80"
        role="tablist"
        aria-label="Pogled novic"
      >
        {TABS.map((tab) => {
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`news-panel-${tab.id}`}
              className={makeClasses(isActive)}
              onClick={() => onChange(tab.id)}
            >
              <span>{tab.label}</span>
              <span
                aria-hidden="true"
                className={[
                  'pointer-events-none absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full bg-orange-400',
                  'transform-gpu transition duration-200 origin-center',
                  isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-75',
                ].join(' ')}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
