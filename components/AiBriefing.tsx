/* components/AiBriefing.tsx */
import React from 'react'

interface Props {
  summary: string | null;
  time?: string | null;
}

export default function AiBriefing({ summary, time }: Props) {
  if (!summary) return null;

  const getRelativeTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    const updated = new Date(timeStr);
    if (isNaN(updated.getTime())) return timeStr;
    const now = new Date();
    const diffInMs = now.getTime() - updated.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));

    if (diffInMins < 1) return "pravkar";
    if (diffInMins === 1) return "pred 1 min";
    if (diffInMins === 2) return "pred 2 min";
    if (diffInMins < 60) return `pred ${diffInMins} min`;
    return updated.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full h-full">
      {/* Vrnjen levi rob z novim, bolj subtilnim premium gradientom namesto polne barve */}
      <div className="relative pl-3.5 pr-3 py-2.5 border-l-[3px] border-brand/60 bg-gradient-to-r from-brand/5 to-transparent dark:from-brand/10 dark:to-transparent rounded-r-md h-full flex flex-col justify-center">
        
        <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mb-1.5">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-brand opacity-90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-brand dark:text-brand/90">
              NA KRATKO
            </span>
            <span className="text-gray-300 dark:text-gray-600 text-[10px] ml-0.5">•</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium ml-0.5 tracking-wide">
              O čem poročajo mediji
            </span>
            {time && (
              <>
                <span className="text-gray-300 dark:text-gray-600 text-[10px] ml-0.5">•</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium ml-0.5">
                  osveženo {getRelativeTime(time)}
                </span>
              </>
            )}
        </div>
        
        {/* Nov font-serif za tekst povzetka */}
        <p className="font-serif text-[14px] sm:text-[15px] leading-snug text-gray-800 dark:text-gray-200 font-medium">
            {summary}
        </p>
      </div>
    </div>
  )
}
