import React, { useRef, useEffect } from 'react'
import { CATEGORIES, CategoryId } from '../lib/categories'

type Props = {
  selected: CategoryId | 'vse'
  onChange: (id: CategoryId | 'vse') => void
}

export default function CategoryFilter({ selected, onChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll do izbranega elementa (ohranimo to logiko, ker je uporabna)
  useEffect(() => {
    if (selected === 'vse') return
    const el = document.getElementById(`cat-${selected}`)
    if (el && scrollRef.current) {
      const container = scrollRef.current
      const offset = el.offsetLeft - container.offsetLeft - 20
      container.scrollTo({ left: offset, behavior: 'smooth' })
    }
  }, [selected])

  return (
    <div 
      className="w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-16 z-30" // Sticky opcijsko, če želiš da se drži vrha pod headerjem
    >
      <div 
        className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 overflow-x-auto no-scrollbar"
        ref={scrollRef}
      >
        <div className="flex items-center gap-6 md:gap-8 h-12"> {/* Fiksna višina za poravnavo */}
          
          {/* GUMB: VSE NOVICE */}
          <button
            onClick={() => onChange('vse')}
            className={`
              relative h-full flex items-center
              text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-colors select-none
              ${selected === 'vse' 
                ? 'text-orange-500' // Oranžna barva za 'Vse', kot na sliki
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}
            `}
          >
            Vse novice
            {/* Črta spodaj samo, če je izbrano */}
            {selected === 'vse' && (
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-orange-500 rounded-t-sm" />
            )}
          </button>

          {/* OSTALE KATEGORIJE */}
          {CATEGORIES.map((cat) => {
            const isSelected = selected === cat.id
            
            // Določimo barvo glede na kategorijo (če imaš barve v objektu CATEGORIES, sicer uporabi privzeto)
            // Predpostavljam, da ima cat.color, če ne, lahko to poenostaviš
            const activeColor = cat.color || '#3b82f6' 
            
            return (
              <button
                key={cat.id}
                id={`cat-${cat.id}`}
                onClick={() => onChange(cat.id)}
                className={`
                  relative h-full flex items-center
                  text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-colors select-none
                  ${isSelected
                    ? 'text-gray-900 dark:text-white' // Aktivni tekst črn/bel
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}
                `}
              >
                {cat.label}
                
                {/* Črta spodaj */}
                {isSelected && (
                  <span 
                    className="absolute bottom-0 left-0 w-full h-[3px] rounded-t-sm"
                    style={{ backgroundColor: activeColor }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
