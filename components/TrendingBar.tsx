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
  
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const currentTranslate = useRef(0);

  const marqueeWords = hasWords 
    ? (words.length < 15 ? [...words, ...words, ...words] : [...words, ...words]) 
    : [];

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
    const walk = (x - startX) * 1.5; 
    setStartX(x); 
    
    currentTranslate.current += walk;
    if (currentTranslate.current > 0) currentTranslate.current = 0;
    
    contentRef.current.style.transform = `translate3d(${currentTranslate.current}px, 0, 0)`;
  };

  // --- Aesthetic Megaphone Icon ---
  const MegaphoneIcon = () => (
    <svg className="w-3.5 h-3.5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6V4.5a1.5 1.5 0 0 0-3 0V6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2v2.5a1.5 1.5 0 0 0 3 0V13a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Z" />
      <path d="M20 10.5a3 3 0 0 1-3 3" />
      <path d="M17 7.5a3 3 0 0 1 3 3" />
    </svg>
  );

  return (
    <div className="flex items-center w-full overflow-hidden py-1 border-b border-gray-100 dark:border-gray-800/50 lg:border-none">
      
      {/* DESKTOP FIXED LABEL */}
      <div className="hidden md:flex items-center gap-2 shrink-0 pr-2 mr-1 select-none border-r border-gray-100 dark:border-gray-800/50">
          <div className="p-1 bg-brand/10 rounded-full animate-pulse">
            <svg className="w-3.5 h-3.5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </div>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase">Odmevno</span>
      </div>

      <div className="flex-1 overflow-hidden relative mask-gradient-right h-[30px] flex items-center">
        {!hasWords ? (
           <span className="text-xs text-gray-400 italic pl-2">Trenutno ni izstopajočih tem.</span>
        ) : (
          <>
            {/* --- MOBILE VIEW --- */}
            <div className="flex md:hidden items-center gap-2 w-full h-full px-2 overflow-x-auto no-scrollbar">
                
                {/* MOBILE LABEL */}
                <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-gray-100 dark:border-gray-800/50 select-none">
                     {/* Ikona megafona */}
                    <svg className="w-3.5 h-3.5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase">Odmevno</span>
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

            {/* --- DESKTOP VIEW --- */}
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
                <SmoothScroller 
                    isPaused={isPaused} 
                    contentRef={contentRef} 
                    containerRef={containerRef} 
                    speed={0.5} 
                />

                <div ref={contentRef} className="flex items-center gap-4 will-change-transform">
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
    const position = useRef(0);

    useEffect(() => {
        if (contentRef.current) {
            const match = contentRef.current.style.transform.match(/translate3d\(([-\d.]+)px/);
            if (match) {
                position.current = parseFloat(match[1]);
            }
        }

        if (isPaused) return;

        let animationFrameId: number;
        let lastTime = performance.now();

        const animate = (time: number) => {
            const deltaTime = (time - lastTime) / 16;
            lastTime = time;

            if (contentRef.current && containerRef.current) {
                position.current -= speed * deltaTime;

                const contentWidth = contentRef.current.scrollWidth;
                const containerWidth = containerRef.current.clientWidth;
                
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
