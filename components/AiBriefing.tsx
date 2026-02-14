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
            {/* Minimalistična ikona za AI (sparkles) */}
            <svg className="w-3.5 h-3.5 text-brand" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7a1 1 0 00-1-1h-2a1 1 0 00-1 1v3.5a1.5 1.5 0 01-3 0V5z" clipRule="evenodd" />
                <path d="M15.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 15a3 3 0 100-6 3 3 0 000 6zM6 14a2 2 0 100-4 2 2 0 000 4z" />
            </svg>

            <span className="text-[11px] font-black uppercase tracking-widest text-brand dark:text-brand/90">
              AI POVZETEK
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
