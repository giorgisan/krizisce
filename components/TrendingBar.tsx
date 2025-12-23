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
        
        {/* --- LABELA Z HOVER TOOLTIPOM --- */}
        <div className="group relative flex items-center gap-1.5 shrink-0 select-none cursor-default transition-opacity hover:opacity-80">
          <span className="text-sm animate-pulse">🔥</span>
          {/* Odstranjen uppercase in tracking-wide za bolj clean look */}
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Žarišče:
          </span>

          {/* Tooltip (Prikaže se ob hoverju) */}
          <div className="pointer-events-none absolute top-full left-0 mt-2 hidden w-max -translate-x-0 rounded bg-gray-800 px-3 py-1.5 text-xs text-white shadow-xl opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-50">
            O čem trenutno pišejo vsi mediji
            {/* Puščica navzgor */}
            <div className="absolute left-6 -top-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-800"></div>
          </div>
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
                  whitespace-nowrap text-[13px] font-medium transition-all duration-200 group flex items-center rounded-md px-1.5 py-0.5
                  ${isSelected 
                    ? 'text-brand font-bold bg-brand/10' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand hover:bg-gray-100 dark:hover:bg-gray-800/50'
                  }
                `}
              >
                <span className={`mr-0.5 text-xs transition-opacity ${isSelected ? 'opacity-60' : 'opacity-30 group-hover:opacity-100'}`}>
                  #
                </span>
                {cleanWord}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
