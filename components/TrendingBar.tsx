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
  
  // Ref za notranji kontejner, ki ga bomo premikali s transformacijo
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // State za Drag-to-Scroll logiko (deluje s transformacijo)
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  
  // Trenutna pozicija transformacije (shranjena v refu za performance)
  const currentTranslate = useRef(0);

  // Podvojimo seznam za zanko (marquee efekt)
  const marqueeWords = hasWords 
    ? (words.length < 15 ? [...words, ...words, ...words] : [...words, ...words]) 
    : [];

  // --- DRAG LOGIKA (Prilagojena za transform) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!contentRef.current) return;
    setIsDragging(true);
    setIsPaused(true);
    setStartX(e.pageX);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setIsPaused(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !contentRef.current) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (x - startX) * 1.5; // Faktor občutljivosti vlečenja
    setStartX(x); // Resetiramo startX za naslednji premik (delta)
    
    currentTranslate.current += walk;
    
    // Omejitev vlečenja (da ne potegnemo preveč v prazno na začetku)
    if (currentTranslate.current > 0) currentTranslate.current = 0;
    
    contentRef.current.style.transform = `translate3d(${currentTranslate.current}px, 0, 0)`;
  };

  return (
    // Padding py-1 (4px) - kompromis med preveč in premalo
    <div className="flex items-center w-full overflow-hidden py-1 border-b border-gray-100 dark:border-gray-800/50 lg:border-none">
      
      {/* DESKTOP FIXED LABEL (Nova pozicija: zunaj scrollerja, fiksna) */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0 pr-3 border-r border-gray-200 dark:border-gray-700 mr-2 select-none">
          <span className="text-sm animate-pulse opacity-70">🔥</span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Odmevno</span>
      </div>

      {/* MARQUEE CONTAINER */}
      <div className="flex-1 overflow-hidden relative mask-gradient-right h-[30px] flex items-center">
        {!hasWords ? (
           <span className="text-xs text-gray-400 italic pl-2">Trenutno ni izstopajočih tem.</span>
        ) : (
          <>
            {/* --- MOBILE VIEW (Native Scroll) --- */}
            <div className="flex md:hidden items-center gap-3 w-full h-full px-2 overflow-x-auto no-scrollbar">
                
                {/* MOBILE LABEL (Del scrolla - se premika z vsebino) */}
                <div className="flex items-center gap-1 shrink-0 pr-2 border-r border-gray-200 dark:border-gray-700 mr-1 select-none">
                    <span className="text-xs animate-pulse opacity-80">🔥</span>
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Odmevno</span>
                </div>

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
                              : 'text-gray-600 dark:text-gray-400'}
                          `}
                        >
                          <span className={`mr-0.5 text-xs opacity-40 ${isSelected ? 'text-brand opacity-100' : 'text-brand'}`}>#</span>
                          {cleanWord}
                        </button>
                    )
                })}
            </div>

            {/* --- DESKTOP VIEW (Smooth Transform Animation) --- */}
            <div 
                ref={containerRef}
                className={`
                    hidden md:flex items-center w-full h-full px-2 overflow-hidden
                    ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                `}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsPaused(true)}
            >
                {/* HITROST: 0.5 = 30px/s (počasno), 1.0 = 60px/s (hitro) */}
                <SmoothScroller 
                    isPaused={isPaused} 
                    contentRef={contentRef} 
                    containerRef={containerRef} 
                    speed={0.5} 
                />

                <div ref={contentRef} className="flex items-center gap-4 will-change-transform">
                    {/* LABELA JE TUKAJ ODSTRANJENA, KER JE ZDAJ FIKSNA ZGORAJ */}
                    
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
            </div>
          </>
        )}
      </div>

      <style jsx>{`
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

// --- SMOOTH TRANSFORM SCROLLER ---
// Uporablja sub-pixel transformacijo za maksimalno gladkost
function SmoothScroller({ 
    isPaused, 
    contentRef, 
    containerRef, 
    speed 
}: { 
    isPaused: boolean, 
    contentRef: React.RefObject<HTMLDivElement>, 
    containerRef: React.RefObject<HTMLDivElement>,
    speed: number 
}) {
    // Shranimo pozicijo, da se ne izgubi med renderji
    const position = useRef(0);

    useEffect(() => {
        // Sinhroniziramo interno pozicijo z dejansko transformacijo (če je uporabnik vlekel)
        if (contentRef.current) {
            // Parsamo trenutni translateX iz style stringa
            const match = contentRef.current.style.transform.match(/translate3d\(([-\d.]+)px/);
            if (match) {
                position.current = parseFloat(match[1]);
            }
        }

        if (isPaused) return;

        let animationFrameId: number;
        let lastTime = performance.now();

        const animate = (time: number) => {
            const deltaTime = (time - lastTime) / 16; // Normaliziramo na ~60fps
            lastTime = time;

            if (contentRef.current && containerRef.current) {
                // Premikamo v levo (negativno)
                position.current -= speed * deltaTime;

                const contentWidth = contentRef.current.scrollWidth;
                const containerWidth = containerRef.current.clientWidth;
                
                // Reset logika: ko pridemo do konca vsebine (minus viewport)
                if (-position.current >= (contentWidth - containerWidth)) {
                    position.current = 0;
                }

                contentRef.current.style.transform = `translate3d(${position.current}px, 0, 0)`;
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPaused, speed, contentRef, containerRef]);

    return null;
}
