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
      {/* Rahlo zmanjšan padding (pl-3.5 in py-1.5 namesto pl-4 in py-2) za bolj kompaktno ohišje */}
      <div className="relative pl-3.5 pr-3 py-1.5 border-l-2 border-brand/50 bg-gray-50/50 dark:bg-gray-800/30 rounded-r-md h-full flex flex-col justify-center">
        
        {/* Zmanjšan spodnji margin (mb-1 namesto mb-1.5) */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-brand/80 dark:text-brand/90">
              NA KRATKO
            </span>
            <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>
            <span className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              O čem poročajo mediji
            </span>
            {time && (
              <>
                <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>
                <span className="flex items-center text-[10px] font-mono text-gray-400 dark:text-gray-500" title="Čas zadnje osvežitve">
                  {/* Ikona za OSVEŽENO (Refresh / Sync) */}
                  <svg className="w-3 h-3 mr-1 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {getRelativeTime(time)}
                </span>
              </>
            )}
        </div>
        
        {/* Font pomanjšan na 12px (mobile) in 13px (desktop), zmanjšan line-height na leading-tight */}
        <p className="text-[12px] sm:text-[13px] leading-tight text-gray-700 dark:text-gray-300/90 font-normal">
            {summary}
        </p>
      </div>
    </div>
  )
}
