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
      className="w-full mt-2 mb-2"
    >
      <div className="block p-2 bg-white dark:bg-gray-800/80 border-l-4 border-l-brand border-y border-r border-gray-100 dark:border-gray-700/50 rounded-r-lg shadow-sm">
        
        {/* Ikona */}
        <div className="float-left mr-3 mt-0.5">
           <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand/10 text-sm shadow-sm border border-brand/5">
             🤖
           </span>
        </div>

        {/* Naslovna vrstica */}
        <div className="mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand dark:text-brand/80 mr-2">
              AI BRIEF
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              Analiza zadnjih objav
            </span>
        </div>
          
        {/* Vsebina */}
        <p className="text-sm leading-snug text-justify text-gray-700 dark:text-gray-200">
            {summary}
        </p>

      </div>
    </motion.div>
  )
}
