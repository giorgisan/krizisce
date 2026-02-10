/* components/AiBriefing.tsx */
import React from 'react'

interface Props {
  summary: string | null;
  time?: string | null;
}

export default function AiBriefing({ summary, time }: Props) {
  if (!summary) return null;

  return (
    <div className="w-full mt-2 mb-2">
      <div className="block p-3 bg-white dark:bg-gray-800/80 border-l-4 border-l-brand border-y border-r border-gray-100 dark:border-gray-700/50 rounded-r-lg shadow-sm">
        
        {/* Ikona */}
        <div className="float-left mr-3 mt-0.5">
           <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand/10 text-lg shadow-sm border border-brand/5">
             🤖
           </span>
        </div>

        {/* Naslovna vrstica */}
        <div className="mb-1 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand dark:text-brand/80">
              AI BRIEF
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              Analiza zadnjih objav
            </span>
            
            {/* Prikaz ure - TAKOJ ZRAVEN */}
            {time && (
              <span className="text-[9px] font-mono text-gray-300 dark:text-gray-600">
                • {time}
              </span>
            )}
        </div>
          
        {/* Vsebina */}
        <p className="text-sm leading-snug text-justify text-gray-700 dark:text-gray-200 mt-1">
            {summary}
        </p>

      </div>
    </div>
  )
}
