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
      {/* Odstranjen border-l in spremenjeno ozadje za bolj integriran in manj 'alert' videz */}
      <div className="relative px-3 py-2.5 bg-brand/5 dark:bg-brand/10 rounded-md h-full flex flex-col justify-center ring-1 ring-inset ring-brand/10 dark:ring-brand/20">
        
        <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mb-1">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-brand opacity-80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-brand dark:text-brand/90">
              Uredništvo AI
            </span>
            {time && (
              <>
                <span className="text-gray-300 dark:text-gray-600 text-[10px] ml-1">•</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium ml-1">
                  osveženo {getRelativeTime(time)}
                </span>
              </>
            )}
        </div>
        
        {/* Besedilo briefa */}
        <p className="text-[13px] leading-snug text-gray-800 dark:text-gray-200 font-medium">
            {summary}
        </p>
      </div>
    </div>
  )
}
