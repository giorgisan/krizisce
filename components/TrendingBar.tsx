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
  // Če ni besed, ne prikažemo ničesar (da ne zasedamo prostora)
  if (!words || words.length === 0) return null

  return (
    <div className="flex items-center h-full">
      {/* Ločilna črta, vidna le na večjih zaslonih, da loči od tabov */}
      <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 mx-3 shrink-0 hidden md:block" />

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient max-w-full">
        {/* Ikonca namesto teksta, da prihranimo prostor */}
        <span className="text-base shrink-0 animate-pulse cursor-default" title="V žarišču">
          🔥
        </span>

        {words.map((item) => {
          const isActive = selectedWord?.toLowerCase() === item.word
          return (
            <button
              key={item.word}
              onClick={() => onSelectWord(isActive ? '' : item.word)}
              className={`
                whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] uppercase font-bold tracking-wide transition-all duration-200 border
                ${isActive 
                  ? 'bg-brand text-white border-brand shadow-sm' 
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:text-brand dark:hover:text-brand hover:border-brand/30'
                }
              `}
            >
              {item.word}
            </button>
          )
        })}
      </div>
    </div>
  )
}
