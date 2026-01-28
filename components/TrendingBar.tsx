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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // State za Drag-to-Scroll logiko
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Podvojimo seznam za neskončno zanko
  const marqueeWords = hasWords 
    ? (words.length < 15 ? [...words, ...words, ...words] : [...words, ...words]) 
    : [];

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setIsPaused(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setIsPaused(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2; 
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    // PADDING: py-2 je ravno pravšnji (ne prevelik, ne premajhen)
    <div className="flex items-center w-full overflow-hidden py-2 border-b border-gray-100 dark:border-gray-800/50 lg:border-none">
      
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

      {/* MARQUEE CONTAINER */}
      <div className="flex-1 overflow-hidden relative mask-gradient-right h-[30px] flex items-center">
        {!hasWords ? (
           <span className="text-xs text-gray-400 italic pl-2">Trenutno ni izstopajočih tem.</span>
        ) : (
          <div 
            ref={containerRef}
            className={`
                flex items-center gap-4 w-full h-full px-2
                overflow-x-auto no-scrollbar
                ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
            `}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsPaused(true)}
          >
            {/* HITROST: pixelsPerSecond={30} 
                To pomeni 30 pikslov na sekundo, neodvisno od hitrosti osveževanja zaslona.
                To je zelo počasno in berljivo.
            */}
            <AutoScroller isPaused={isPaused} containerRef={containerRef} pixelsPerSecond={30} />

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

// --- POPRAVLJENA KOMPONENTA ZA SCROLLANJE ---
// Uporablja časovni zamik (deltaTime) za konstantno hitrost
function AutoScroller({ isPaused, containerRef, pixelsPerSecond }: { isPaused: boolean, containerRef: React.RefObject<HTMLDivElement>, pixelsPerSecond: number }) {
    useEffect(() => {
        if (isPaused) return;

        let animationFrameId: number;
        let lastTimestamp: number | null = null;
        
        // Hranimo natančno pozicijo v decimalni obliki, ker scrollLeft zaokrožuje
        let accumulatedPos = containerRef.current ? containerRef.current.scrollLeft : 0;

        const scroll = (timestamp: number) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            
            // Izračunamo, koliko časa je minilo od zadnjega frame-a (v sekundah)
            const deltaTime = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;

            if (containerRef.current) {
                // Premaknemo se za (hitrost * čas)
                const moveAmount = pixelsPerSecond * deltaTime;
                accumulatedPos += moveAmount;
                
                containerRef.current.scrollLeft = accumulatedPos;

                // Reset logika
                if (containerRef.current.scrollLeft >= (containerRef.current.scrollWidth - containerRef.current.clientWidth - 1)) {
                     containerRef.current.scrollLeft = 0;
                     accumulatedPos = 0;
                }
            }
            animationFrameId = requestAnimationFrame(scroll);
        };

        animationFrameId = requestAnimationFrame(scroll);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPaused, pixelsPerSecond, containerRef]);

    return null;
}
