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
      {/* Ločilna črta (samo na desktopu) */}
      <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-4 shrink-0 hidden md:block" />

      {/* Scrollable container */}
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar mask-gradient w-full py-1 pr-4">
        
        {/* --- LABELA "ŽARIŠČE" --- */}
        {/* Uporabimo native 'title' atribut za tooltip, ki ga brskalnik prikaže vedno pravilno */}
        <div 
          className="group flex items-center gap-1.5 shrink-0 select-none cursor-default hover:opacity-80 transition-opacity"
          title="O čem trenutno pišejo mediji" 
        >
          <span className="text-sm animate-pulse">🔥</span>
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Žarišče:
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
                  whitespace-nowrap text-[13px] font-medium transition-colors duration-200 flex items-center rounded px-1.5 py-0.5
                  ${isSelected 
                    ? 'text-brand font-bold bg-brand/10' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <span className={`mr-0.5 text-xs ${isSelected ? 'opacity-60' : 'opacity-40'}`}>#</span>
                {cleanWord}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
