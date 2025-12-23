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
  const hasWords = words && words.length > 0;

  return (
    <div className="flex items-center h-full min-h-[40px] w-full">
      {/* Ločilna črta - tanjša in bolj subtilna */}
      <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-4 shrink-0 hidden md:block" />

      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar mask-gradient w-full py-1">
        
        {/* Ikonca + Tekst "Trendi" (opcijsko, lahko pustiš samo ikono) */}
        <div className="flex items-center gap-1 shrink-0 text-gray-400 dark:text-gray-500 select-none">
           <span className="text-sm animate-pulse">🔥</span>
        </div>

        {!hasWords ? (
           <span className="text-xs text-gray-400 italic whitespace-nowrap">
             Trenutno ni vročih tem.
           </span>
        ) : (
          words.map((item) => {
            const isActive = selectedWord?.toLowerCase() === item.word
            return (
              <button
                key={item.word}
                onClick={() => onSelectWord(isActive ? '' : item.word)}
                className={`
                  whitespace-nowrap text-[13px] font-medium transition-colors duration-200 group
                  ${isActive 
                    ? 'text-brand font-bold' // Aktivno stanje
                    : 'text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand' // Neaktivno
                  }
                `}
              >
                <span className="opacity-40 mr-0.5 group-hover:opacity-100 transition-opacity">#</span>
                {item.word}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
