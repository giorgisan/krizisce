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
  // DEBUGGING: Če ni besed, izpiši to, da vemo, da komponenta dela!
  if (!words || words.length === 0) {
      return (
        <div className="py-2 px-4 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-center">
           (Trenutno ni dovolj podatkov za trende ali pa se baza osvežuje)
        </div>
      )
  }

  return (
    <div className="w-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 mb-4">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-16 py-2">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar mask-gradient">
          
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider shrink-0 animate-pulse">
            V ŽARIŠČU:
          </span>

          <div className="flex items-center gap-2">
            {words.map((item) => {
              const isActive = selectedWord?.toLowerCase() === item.word
              return (
                <button
                  key={item.word}
                  onClick={() => onSelectWord(isActive ? '' : item.word)}
                  className={`
                    whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                    ${isActive 
                      ? 'bg-brand text-white border-brand shadow-sm' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand/30 hover:text-brand dark:hover:text-brand'
                    }
                  `}
                >
                  #{item.word}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
