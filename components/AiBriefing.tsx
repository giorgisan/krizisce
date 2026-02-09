import React from 'react'
import { motion } from 'framer-motion'

interface Props {
  summary: string | null;
}

export default function AiBriefing({ summary }: Props) {
  if (!summary) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-2">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-blue-100 dark:border-blue-900/30 bg-gradient-to-r from-blue-50/50 via-white/50 to-blue-50/50 dark:from-blue-950/20 dark:via-gray-900/40 dark:to-blue-950/20 backdrop-blur-sm p-4 sm:p-5 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
          
          {/* Ikona / Robotek */}
          <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-xl shadow-inner">
            🤖
          </div>

          {/* Vsebina */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                AI Povzetek
              </span>
              <span className="text-[10px] text-gray-400">
                Generirano pravkar
              </span>
            </div>
            
            <p className="text-sm sm:text-[15px] leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
              {summary}
            </p>
          </div>

        </div>
      </motion.div>
    </div>
  )
}
