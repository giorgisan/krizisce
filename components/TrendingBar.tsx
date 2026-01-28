/* components/TrendingBar.tsx */
import React, { useRef, useState, useEffect } from 'react'

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
  
  // Ref samo za desktop kontejner (kjer deluje avtomatika)
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // State za Drag-to-Scroll (samo desktop)
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Za desktop podvojimo seznam za zanko, za mobile pustimo original
  const marqueeWords = hasWords 
    ? (words.length < 15 ? [...words, ...words, ...words] : [...words, ...words]) 
    : [];

  // --- DRAG LOGIKA (Samo za Desktop) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!desktopContainerRef.current) return;
    setIsDragging(true);
    setIsPaused(true); // Ustavimo avtomatiko ko primemo
    setStartX(e.pageX - desktopContainerRef.current.offsetLeft);
    setScrollLeft(desktopContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setIsPaused(false); // Ponovno zaženemo ko gremo ven
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Tu ne od-pavziramo takoj, ampak onMouseLeave ali onMouseEnter logika spodaj
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !desktopContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - desktopContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; 
    desktopContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    // SPREMEMBA: Padding nastavljen na py-0.5 (zelo ozko)
    <div className="flex items-center w-full overflow-hidden py-0.5 border-b border-gray-100 dark:border-gray-800/50 lg:border-none">
      
      {/* LABELA */}
      <div 
        className="relative z-20 flex items-center gap-1.5 shrink-0 pr-2 bg-gray-50 dark:bg-gray-900 select-none cursor-default group/label"
        title="Najbolj odmevne teme"
      >
        <span className="text-sm animate-fire group-hover/label:scale-110 transition-transform duration-300">🔥</span>
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wide">
          Odmevno
        </span>
      </div>

      <div className="flex-1 overflow-hidden relative mask-gradient-right h-[30px] flex items-center">
        {!hasWords ? (
           <span className="text-xs text-gray-400 italic pl-2">Trenutno ni izstopajočih tem.</span>
        ) : (
          <>
            {/* --- MOBILE VIEW (Native Scroll, Brez Autoscrolla) --- */}
            <div className="flex md:hidden items-center gap-3 w-full h-full px-2 overflow-x-auto no-scrollbar">
                {words.map((item) => {
                    const cleanWord = item.word.replace(/^#/, '');
                    const isSelected = selectedWord?.toLowerCase().replace(/^#/, '') === cleanWord.toLowerCase();
                    return (
                        <button
                          key={item.word}
                          onClick={() => onSelectWord(cleanWord)}
                          className={`
                            whitespace-nowrap text-[13px] font-medium transition-colors duration-200 flex items-center shrink-0
                            ${isSelected 
                              ? 'text-brand font-bold' 
                              : 'text-gray-600 dark:text-gray-400'
                            }
                          `}
                        >
                          <span className={`mr-0.5 text-xs opacity-40 ${isSelected ? 'text-brand opacity-100' : 'text-brand'}`}>#</span>
                          {cleanWord}
                        </button>
                    )
                })}
            </div>

            {/* --- DESKTOP VIEW (AutoScroller + Drag) --- */}
            <div 
                ref={desktopContainerRef}
                className={`
                    hidden md:flex items-center gap-4 w-full h-full px-2
                    overflow-x-auto no-scrollbar
                    ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                `}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsPaused(true)}
            >
                {/* SPREMEMBA: pixelsPerSecond=30 za zelo počasno drsenje */}
                <AutoScroller isPaused={isPaused} containerRef={desktopContainerRef} pixelsPerSecond={30} />

                {marqueeWords.map((item, index) => {
                    const cleanWord = item.word.replace(/^#/, '');
                    const isSelected = selectedWord?.toLowerCase().replace(/^#/, '') === cleanWord.toLowerCase();
                    const key = `${item.word}-${index}`; 

                    return (
                        <button
                            key={key}
                            onClick={(e) => {
                                if (isDragging) e.preventDefault();
                                else onSelectWord(cleanWord);
                            }}
                            className={`
                            whitespace-nowrap text-[13px] font-medium transition-colors duration-200 flex items-center shrink-0 group/btn
                            ${isSelected 
                                ? 'text-brand font-bold' 
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }
                            `}
                        >
                            <span className={`
                                mr-0.5 text-xs opacity-40 transition-all
                                group-hover/btn:text-brand group-hover/btn:opacity-100
                                ${isSelected ? 'text-brand opacity-100' : ''}
                            `}>#</span>
                            {cleanWord}
                        </button>
                    )
                })}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .animate-fire {
            display: inline-block;
            transform-origin: bottom center;
            animation: fireBreath 2.5s ease-in-out infinite;
            will-change: transform, filter;
        }
        @keyframes fireBreath {
            0%, 100% { transform: scale(1); filter: brightness(100%); }
            50% { transform: scale(1.15); filter: brightness(115%); }
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

// --- IZBOLJŠAN SCROLLER (Time-Based) ---
function AutoScroller({ isPaused, containerRef, pixelsPerSecond }: { isPaused: boolean, containerRef: React.RefObject<HTMLDivElement>, pixelsPerSecond: number }) {
    // Ref za hranjenje decimalne pozicije
    const accumulatedPos = useRef(0);

    useEffect(() => {
        // Sinhronizacija ob startu
        if (containerRef.current) {
            accumulatedPos.current = containerRef.current.scrollLeft;
        }

        if (isPaused) return;

        let animationFrameId: number;
        let lastTimestamp: number | null = null;

        const scroll = (timestamp: number) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const deltaTime = (timestamp - lastTimestamp) / 1000; // sekunde
            lastTimestamp = timestamp;

            if (containerRef.current) {
                const move = pixelsPerSecond * deltaTime;
                accumulatedPos.current += move;
                containerRef.current.scrollLeft = accumulatedPos.current;

                // Reset
                if (containerRef.current.scrollLeft >= (containerRef.current.scrollWidth - containerRef.current.clientWidth - 1)) {
                     containerRef.current.scrollLeft = 0;
                     accumulatedPos.current = 0;
                }
            }
            animationFrameId = requestAnimationFrame(scroll);
        };

        animationFrameId = requestAnimationFrame(scroll);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPaused, pixelsPerSecond, containerRef]);

    return null;
}
