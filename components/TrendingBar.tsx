import React from 'react'

export type TrendingWord = {
  word: string
  count: number
}

interface TrendingBarProps {
  words: TrendingWord[]
  onSelectWord: (word: string) => void
  selectedWord: string | null
}

export default function TrendingBar({ words, onSelectWord, selectedWord }: TrendingBarProps) {
  if (!words || words.length === 0) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full py-1">
      {/* Divider črta za vizualno ločitev od tabov */}
      <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1 shrink-0 hidden sm:block" />
      
      <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider shrink-0 mr-1 animate-pulse">
        Vroče:
      </span>

      {words.map((item) => {
        const isActive = selectedWord?.toLowerCase() === item.word
        return (
          <button
            key={item.word}
            onClick={() => onSelectWord(isActive ? '' : item.word)}
            className={`
              shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200
              ${isActive 
                ? 'bg-brand text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
          >
            #{item.word}
          </button>
        )
      })}
    </div>
  )
}
