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
  // POPRAVEK: Ne vrnemo null, ampak pokažemo sporočilo, če ni besed.
  const hasWords = words && words.length > 0;

  return (
    <div className="flex items-center h-full min-h-[40px] w-full">
      {/* Ločilna črta (samo na desktopu) */}
      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-3 shrink-0 hidden md:block" />

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient w-full">
        {/* Ikonca */}
        <span className="text-lg shrink-0 animate-pulse cursor-default" title="V žarišču">
          🔥
        </span>

        {!hasWords ? (
           // Če ni podatkov, izpiši tole (da vemo, da komponenta dela)
           <span className="text-xs text-gray-400 italic whitespace-nowrap">
             Trenutno ni vročih tem.
           </span>
        ) : (
          // Če so podatki, izpiši gumbe
          words.map((item) => {
            const isActive = selectedWord?.toLowerCase() === item.word
            return (
              <button
                key={item.word}
                onClick={() => onSelectWord(isActive ? '' : item.word)}
                className={`
                  whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-200 border
                  ${isActive 
                    ? 'bg-brand text-white border-brand shadow-sm' 
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:text-brand dark:hover:text-brand hover:border-brand/30 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
              >
                {item.word}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
