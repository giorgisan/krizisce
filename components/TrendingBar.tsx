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
      {/* POPRAVEK 3: Odstranjena ločilna črta (div hidden md:block) */}
      
      {/* Scrollable container - brez levega paddinga/marginov */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar mask-gradient w-full py-1">
        
        {/* --- LABELA "TRENDI" (Prej Žarišče) --- */}
        <div 
          className="group flex items-center gap-1.5 shrink-0 select-none cursor-default hover:opacity-80 transition-opacity mr-2"
          title="Najbolj vroče teme zadnjih 100 objav" 
        >
          <span className="text-sm animate-pulse">🔥</span>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tight">
            Trendi
          </span>
        </div>

        {/* --- SEZNAM TAGOV --- */}
        {!hasWords ? (
           <span className="text-xs text-gray-400 italic whitespace-nowrap">
             Trenutno ni vročih tem.
           </span>
        ) : (
          words.map((item) => {
            const cleanWord = item.word.replace(/^#/, '');
            const isSelected = selectedWord?.toLowerCase().replace(/^#/, '') === cleanWord.toLowerCase();

            return (
              <button
                key={item.word}
                onClick={() => onSelectWord(cleanWord)}
                className={`
                  whitespace-nowrap text-[13px] font-medium transition-colors duration-200 flex items-center rounded-md px-2 py-1
                  ${isSelected 
                    ? 'text-white bg-brand shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-brand/50 hover:text-brand'
                  }
                `}
              >
                <span className={`mr-0.5 text-xs ${isSelected ? 'opacity-80' : 'opacity-40'}`}>#</span>
                {cleanWord}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
