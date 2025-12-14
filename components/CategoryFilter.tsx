import React, { useRef, useEffect } from 'react'
import { CATEGORIES, CategoryId } from '../lib/categories'

type Props = {
  selected: CategoryId | 'vse'
  onChange: (id: CategoryId | 'vse') => void
}

export default function CategoryFilter({ selected, onChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll do izbranega elementa na mobilnih napravah
  useEffect(() => {
    if (selected === 'vse') return
    const el = document.getElementById(`cat-${selected}`)
    if (el && scrollRef.current) {
      const container = scrollRef.current
      const offset = el.offsetLeft - container.offsetLeft - 20 // 20px paddinga
      container.scrollTo({ left: offset, behavior: 'smooth' })
    }
  }, [selected])

  return (
    <div 
      className="w-full overflow-x-auto no-scrollbar py-2 mb-4 px-4 md:px-8 lg:px-16"
      ref={scrollRef}
    >
      <div className="flex space-x-2">
        <button
          onClick={() => onChange('vse')}
          className={`
            px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap
            ${selected === 'vse' 
              ? 'bg-gray-900 text-white dark:bg-white dark:text-black shadow-md' 
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'}
          `}
        >
          Vse novice
        </button>

        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            id={`cat-${cat.id}`}
            onClick={() => onChange(cat.id)}
            className={`
              px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap
              ${selected === cat.id
                ? 'bg-brand text-white shadow-md' // Uporabi svojo brand barvo ali specifično
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'}
            `}
            style={{
                // Opcijsko: Če želiš, da je gumb obarvan glede na kategorijo ko je izbran
                backgroundColor: selected === cat.id ? undefined : undefined 
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}
