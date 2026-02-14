/* components/AiBriefing.tsx */
import React from 'react'

interface Props {
  summary: string | null;
  time?: string | null;
}

export default function AiBriefing({ summary, time }: Props) {
  if (!summary) return null;

  return (
    // SPREMEMBA: 'my-4' sem zamenjal z 'mt-4 mb-2' (ali celo mb-1)
    <div className="w-full mt-4 mb-2"> 
      
      <div className="relative pl-4 py-2 border-l-4 border-brand bg-gray-50/50 dark:bg-gray-800/30 rounded-r-sm">
        
        {/* Naslovna vrstica */}
        <div className="flex items-center flex-wrap gap-2 mb-1.5">
            
            <span className="text-[11px] font-black uppercase tracking-widest text-brand dark:text-brand/90">
              NA KRATKO
            </span>
            
            <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>

            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              Analiza zadnjih objav
            </span>
            
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
