/* components/AiBriefing.tsx */
import React from 'react'
import { motion } from 'framer-motion'

interface Props {
  summary: string | null;
}

export default function AiBriefing({ summary }: Props) {
  if (!summary) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full mt-3 mb-2" // Zmanjšan margin
    >
      <div className="flex flex-row items-start gap-3 p-3 bg-white dark:bg-gray-800/80 border-l-4 border-l-brand border-y border-r border-gray-100 dark:border-gray-700/50 rounded-r-lg shadow-sm">
        
        {/* Ikona - Majhna in diskretna */}
        <div className="shrink-0 pt-0.5">
           <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand/10 text-sm">
             🤖
           </span>
        </div>

        {/* Vsebina - Kompaktna */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-brand dark:text-brand/80">
              V OSPREDJU
            </h3>
            <span className="text-[10px] text-gray-400 truncate">
              Analiza nedavno objavljenih novic
            </span>
          </div>
          
          <p className="text-sm leading-snug text-gray-700 dark:text-gray-200">
            {summary}
          </p>
        </div>

      </div>
    </motion.div>
  )
}
