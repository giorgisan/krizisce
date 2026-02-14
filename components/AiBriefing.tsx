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
    
    // Preverimo, če je datum sploh veljaven
    if (isNaN(updated.getTime())) {
        return timeStr; // Če še vedno ni OK, vrne originalni niz
    }

    const now = new Date();
    const diffInMs = now.getTime() - updated.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));

    // Logika za slovenske izpise
    if (diffInMins < 1) return "Pravkar posodobljeno";
    if (diffInMins === 1) return "Pred 1 minuto";
    if (diffInMins === 2) return "Pred 2 minutama";
    if (diffInMins < 60) return `Pred ${diffInMins} minutami`;
    
    // Če je več kot ena ura, vrneš uro v formatu HH:MM
    return updated.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full mt-4 mb-2">
      <div className="relative pl-4 py-2 border-l-2 border-brand/50 bg-gray-50/50 dark:bg-gray-800/30 rounded-r-sm">
        <div className="flex items-center flex-wrap gap-2 mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-brand/80 dark:text-brand/90">
              NA KRATKO
            </span>
            <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              Analiza zadnjih objav
            </span>
            
            {time && (
              <>
                <span className="text-gray-300 dark:text-gray-600 text-[10px] hidden sm:inline">•</span>
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 ml-auto sm:ml-0 italic">
                  {getRelativeTime(time)}
                </span>
              </>
            )}
        </div>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-medium text-justify">
            {summary}
        </p>
      </div>
    </div>
  )
}
