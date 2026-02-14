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
    
    if (isNaN(updated.getTime())) {
        return timeStr;
    }

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
    <div className="w-full mt-3 mb-1"> {/* Zmanjšan margin za kompaktnost */}
      
      {/* SPREMEMBE:
          - py-1.5: Manjši vertikalni odmik (bolj kompaktno)
          - pr-3: Desni odmik, da tekst ne gre do roba!
      */}
      <div className="relative pl-4 pr-3 py-1.5 border-l-2 border-brand/50 bg-gray-50/50 dark:bg-gray-800/30 rounded-r-sm">
        
        {/* Naslovna vrstica - zmanjšan mb (margin bottom) */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1">
            
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-brand/80 dark:text-brand/90">
              NA KRATKO
            </span>
            
            <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>

            <span className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              Analiza zadnjih objav
            </span>
            
            {time && (
              <>
                <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                  {getRelativeTime(time)}
                </span>
              </>
            )}
        </div>
          
        {/* VSEBINA: 
            - text-sm -> text-[13px] (malo manjše za mobile, če želiš res kompaktnost)
            - leading-snug: Manjši razmik med vrsticami (boljša berljivost na majhnem zaslonu)
        */}
        <p className="text-[13px] sm:text-sm leading-snug text-gray-700 dark:text-gray-300 font-medium text-auto">
            {summary}
        </p>

      </div>
    </div>
  )
}
