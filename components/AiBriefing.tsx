import React from 'react'
import { motion } from 'framer-motion'

interface Props {
  summary: string | null;
}

export default function AiBriefing({ summary }: Props) {
  if (!summary) return null;

  return (
    // Odstranjen 'max-w' in 'mx-auto', da se širina prilagodi staršu (kot ostala vsebina)
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full mt-6 mb-4"
    >
      <div className="relative flex flex-col sm:flex-row gap-4 items-start p-5 sm:p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
        
        {/* Dekorativna črta na levi (namesto kričečega ozadja) */}
        <div className="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-brand to-brand/60 rounded-r-full" />

        {/* Ikona - Subtilna in integrirana */}
        <div className="shrink-0 ml-3 sm:ml-2 mt-0.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700/50 text-xl border border-gray-100 dark:border-gray-600">
            🤖
          </div>
        </div>

        {/* Vsebina */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              AI Povzetek trenutka
            </h3>
            <span className="text-[10px] text-gray-300 dark:text-gray-600 font-mono hidden sm:inline-block">
              GEN-AI-BRIEF
            </span>
          </div>
          
          <p className="text-base sm:text-lg leading-relaxed text-gray-800 dark:text-gray-100 font-medium">
            {summary}
          </p>
        </div>

      </div>
    </motion.div>
  )
}
