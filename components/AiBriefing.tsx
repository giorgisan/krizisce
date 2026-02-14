/* components/AiBriefing.tsx */
import React from 'react'

interface Props {
  summary: string | null;
  time?: string | null;
}

export default function AiBriefing({ summary, time }: Props) {
  if (!summary) return null;

  return (
    <div className="w-full my-4">
      {/* Uporabil sem 'pl-4' (padding-left) za odmik od črte 
         in odstranil desni/zgornji rob, da izgleda bolj čisto.
         Ozadje je zelo nežno (bg-gray-50), da se loči od beline člankov.
      */}
      <div className="relative pl-4 py-2 border-l-4 border-brand bg-gray-50/50 dark:bg-gray-800/30 rounded-r-sm">
        
        {/* Naslovna vrstica */}
        <div className="flex items-center flex-wrap gap-2 mb-1.5">
            
            <span className="text-[11px] font-black uppercase tracking-widest text-brand dark:text-brand/90">
              NA KRATKO
            </span>
            
            {/* Črtica ločilo */}
            <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>

            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              Analiza zadnjih objav
            </span>
            
            {/* Ura - diskretno na koncu */}
            {time && (
              <>
                <span className="text-gray-300 dark:text-gray-600 text-[10px] hidden sm:inline">•</span>
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 ml-auto sm:ml-0">
                  {time}
                </span>
              </>
            )}
        </div>
          
        {/* Vsebina */}
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
            {summary}
        </p>

      </div>
    </div>
  )
}
