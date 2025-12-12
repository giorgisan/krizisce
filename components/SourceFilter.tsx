import React, { useEffect, useState } from 'react'
import Image from 'next/image'

const LOGO_MAP: Record<string, string> = {
  'RTVSLO': 'rtvslo.png',
  '24ur': '24ur.png',
  'Siol.net': 'siol.png',
  'Slovenske novice': 'slovenskenovice.png',
  'Delo': 'delo.png',
  'Dnevnik': 'dnevnik.png',
  'Zurnal24': 'zurnal24.png',
  'N1': 'n1.png',
  'Svet24': 'svet24.png',
}

type Props = {
  value: string[] // Sprejme array nizov
  onChange: (sources: string[]) => void
  open: boolean 
  onClose: () => void
}

export default function SourceFilter({ value, onChange, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!mounted || !open) return null

  const toggleSource = (source: string) => {
    if (source === 'Vse') {
      onChange([]) // Prazen array pomeni "Vse"
      return
    }
    
    // Če je bil izbran "Vse" (prazen array), začnemo z novim izborom
    let newSelection = [...value]
    if (newSelection.includes(source)) {
      newSelection = newSelection.filter(s => s !== source)
    } else {
      newSelection.push(source)
    }
    onChange(newSelection)
  }

  const isAll = value.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-10 fade-in duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Izberi vire
          </h3>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            
            {/* Gumb VSE */}
            <button
              onClick={() => toggleSource('Vse')}
              className={`
                flex items-center justify-center h-16 rounded-xl border-2 transition-all
                ${isAll 
                  ? 'border-brand bg-brand/5 dark:bg-brand/10 ring-1 ring-brand' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800'}
              `}
            >
              <span className={`font-bold ${isAll ? 'text-brand' : 'text-gray-600 dark:text-gray-300'}`}>
                Vsi viri
              </span>
            </button>

            {Object.keys(LOGO_MAP).map((source) => {
              const filename = LOGO_MAP[source]
              const isSelected = value.includes(source)
              
              return (
                <button
                  key={source}
                  onClick={() => toggleSource(source)}
                  className={`
                    relative flex items-center justify-center h-16 rounded-xl border-2 transition-all group overflow-hidden
                    ${isSelected 
                      ? 'border-brand ring-1 ring-brand bg-white dark:bg-gray-800' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-brand/50 bg-white dark:bg-gray-800'}
                  `}
                >
                  <div className="relative w-3/4 h-3/4 flex items-center justify-center">
                    <Image 
                      src={`/logos/${filename}`} 
                      alt={source}
                      fill
                      className={`object-contain p-2 transition-all ${isSelected ? '' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}
                    />
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Footer z gumbom za potrditev (ker je multi-select) */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-brand text-white font-medium rounded-full hover:bg-brand-hover transition shadow-sm"
            >
                Prikaži novice
            </button>
        </div>

      </div>
    </div>
  )
}
