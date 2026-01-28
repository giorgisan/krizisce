/* components/TrendingBar.tsx */
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

  const marqueeWords = hasWords 
    ? (words.length < 10 ? [...words, ...words, ...words, ...words] : [...words, ...words]) 
    : [];

  return (
    <div className="flex items-center w-full overflow-hidden py-2 border-b border-gray-100 dark:border-gray-800/50 lg:border-none">
      
      {/* POPRAVEK 1: Zmanjšan padding iz pr-4 na pr-2.
         To bo zmanjšalo tisto praznino med "Odmevno" in začetkom tagov.
      */}
      <div className="relative z-20 flex items-center gap-1.5 shrink-0 pr-2 bg-gray-50 dark:bg-gray-900 select-none cursor-default">
        {/* POPRAVEK 2: Nova animacija 'animate-fire' */}
        <span className="text-sm animate-fire cursor-help" title="Najbolj pogoste teme zadnje ure">🔥</span>
        
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wide uppercase">
          Odmevno
        </span>
      </div>

      <div className="flex-1 overflow-hidden relative mask-gradient-right">
        {!hasWords ? (
           <span className="text-xs text-gray-400 italic pl-2">Trenutno ni izstopajočih tem.</span>
        ) : (
          <>
            {/* MOBILE LIST */}
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
                          {cleanWord}
                        </button>
                    )
                })}
            </div>

            {/* DESKTOP MARQUEE */}
            <div className="hidden md:flex w-max items-center marquee-container">
                <div className="animate-marquee hover-pause flex items-center">
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
                          {cleanWord}
                        </button>
                      )
                    })}
                </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        /* POPRAVEK: Optimizirana animacija */
        .animate-fire {
            display: inline-block;
            transform-origin: bottom center; /* Ogenj raste od spodaj navzgor */
            animation: fireBreath 2.5s ease-in-out infinite;
            will-change: transform, filter; /* Pove brskalniku, naj optimizira */
        }
        
        @keyframes fireBreath {
            0%, 100% { 
                transform: scale(1); 
                filter: brightness(100%);
            }
            50% { 
                transform: scale(1.15); 
                filter: brightness(115%); /* Namesto drop-shadow uporabimo brightness - veliko bolj gladko */
            }
        }

        .marquee-container {
            will-change: transform;
        }
        .animate-marquee {
          display: flex;
          animation: marquee 60s linear infinite;
        }
        .marquee-container:hover .animate-marquee {
          animation-play-state: paused;
        }
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
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
