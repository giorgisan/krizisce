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

  // Podvojimo seznam za neskončno zanko
  const marqueeWords = hasWords 
    ? (words.length < 10 ? [...words, ...words, ...words, ...words] : [...words, ...words]) 
    : [];

  return (
    <div className="flex items-center w-full overflow-hidden py-2 border-b border-gray-100 dark:border-gray-800/50 lg:border-none">
      
      {/* LABELA: TRENDI */}
      <div 
        className="relative z-20 flex items-center gap-1.5 shrink-0 pr-4 bg-gray-50 dark:bg-gray-900 select-none cursor-default"
        style={{ boxShadow: '15px 0 20px -10px var(--bg-page)' }} 
      >
        {/* SPREMEMBA: Monokromatski SVG ogenjček namesto emojija */}
        <svg 
          className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" 
          fill="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
        
        <span className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
          Trendi
        </span>
      </div>

      {/* MARQUEE CONTAINER */}
      <div className="flex-1 overflow-hidden relative mask-gradient-right">
        {!hasWords ? (
           <span className="text-xs text-gray-400 italic pl-2">Trenutno ni vročih tem.</span>
        ) : (
          <div className="flex w-max animate-marquee hover:pause items-center">
            {marqueeWords.map((item, index) => {
              const cleanWord = item.word.replace(/^#/, '');
              const isSelected = selectedWord?.toLowerCase().replace(/^#/, '') === cleanWord.toLowerCase();
              const key = `${item.word}-${index}`;

              return (
                <button
                  key={key}
                  onClick={() => onSelectWord(cleanWord)}
                  className={`
                    mx-4 text-[13px] font-medium transition-colors duration-200 flex items-center group/btn
                    ${isSelected 
                      ? 'text-brand' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                >
                  <span className={`mr-0.5 text-xs opacity-40 group-hover/btn:text-brand group-hover/btn:opacity-100 transition-all ${isSelected ? 'text-brand opacity-100' : ''}`}>#</span>
                  <span className="group-hover/btn:underline decoration-brand/30 underline-offset-2 decoration-1">
                    {cleanWord}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
        .hover\:pause:hover {
          animation-play-state: paused;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .mask-gradient-right {
          mask-image: linear-gradient(to right, black 85%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
        }
      `}</style>
    </div>
  )
}
