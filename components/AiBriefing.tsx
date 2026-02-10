/* components/AiBriefing.tsx */
import React from 'react'

interface Props {
  summary: string | null;
  time?: string | null; // <--- NOV PROP
}

export default function AiBriefing({ summary, time }: Props) {
  if (!summary) return null;

  return (
    <div className="w-full mt-2 mb-2">
      <div className="block p-2 bg-white dark:bg-gray-800/80 border-l-4 border-l-brand border-y border-r border-gray-100 dark:border-gray-700/50 rounded-r-lg shadow-sm">
        
        {/* Ikona */}
        <div className="float-left mr-3 mt-0.5">
           <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand/10 text-sm shadow-sm border border-brand/5">
             🤖
           </span>
        </div>

        {/* Naslovna vrstica */}
        <div className="mb-1 flex items-baseline gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand dark:text-brand/80">
              AI BRIEF
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              Analiza zadnjih objav
            </span>
            
            {/* --- PRIKAZ URE --- */}
            {time && (
              <span className="ml-auto text-[9px] font-mono text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800 px-1 rounded border border-gray-100 dark:border-gray-700">
                {time}
              </span>
            )}
        </div>
          
        {/* Vsebina */}
        <p className="text-sm leading-snug text-justify text-gray-700 dark:text-gray-200">
            {summary}
        </p>

      </div>
    </div>
  )
}
