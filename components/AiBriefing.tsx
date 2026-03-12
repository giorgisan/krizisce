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
      {/* Gradient in debel levi rob, nekoliko zmanjšan padding (py-2) za večjo kompaktnost */}
      <div className="relative pl-3.5 pr-3 py-2 border-l-[3px] border-brand/60 bg-gradient-to-r from-brand/5 to-transparent dark:from-brand/10 dark:to-transparent rounded-r-md h-full flex flex-col justify-center">
        
        {/* Zmanjšan margin-bottom (mb-1) */}
        <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mb-1">
            {/* Ikona je odstranjena */}
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand dark:text-brand/90">
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
        
        {/* Sans-serif font, stopnjo manjši (12px na mobilcih, 13px na namizju) in z manjšim razmikom vrstic (leading-tight) */}
        <p className="text-[12px] sm:text-[13px] leading-tight text-gray-800 dark:text-gray-300/90 font-medium">
            {summary}
        </p>
      </div>
    </div>
  )
}
