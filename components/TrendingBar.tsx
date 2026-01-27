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

  // Podvojimo seznam za neskončno zanko (samo za desktop marquee)
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
        <span className="text-sm opacity-80">🔥</span>
        <span className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
          Trendi
        </span>
      </div>

      {/* CONTAINER */}
      <div className="flex-1 overflow-hidden relative mask-gradient-right">
        {!hasWords ? (
           <span className="text-xs text-gray-400 italic pl-2">Trenutno ni vročih tem.</span>
        ) : (
          <>
            {/* --- MOBILE: SCROLLABLE LIST (Drag to scroll) --- */}
            {/* POPRAVEK: Odstranjena ozadja (pills) in podčrtaji, samo tekst */}
            <div className="flex md:hidden overflow-x-auto no-scrollbar items-center gap-3 pl-2 pr-8 w-full">
                {words.map((item) => {
                    const cleanWord = item.word.replace(/^#/, '');
                    const isSelected = selectedWord?.toLowerCase().replace(/^#/, '') === cleanWord.toLowerCase();
                    return (
                        <button
                          key={item.word}
                          onClick={() => onSelectWord(cleanWord)}
                          className={`
                            whitespace-nowrap text-[13px] font-medium transition-colors duration-200 flex items-center
                            ${isSelected 
                              ? 'text-brand font-bold' 
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }
                          `}
                        >
                          <span className={`mr-0.5 text-xs opacity-40 ${isSelected ? 'text-brand opacity-100' : ''}`}>#</span>
                          {/* Odstranjen span z underline, samo tekst */}
                          {cleanWord}
                        </button>
                    )
                })}
            </div>

            {/* --- DESKTOP: MARQUEE (Moving text) --- */}
            <div className="hidden md:flex w-max animate-marquee hover:pause items-center">
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
          </>
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
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
