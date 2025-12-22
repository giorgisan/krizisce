import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'

type TrendingWord = {
  word: text
  count: number
}

interface TrendingBarProps {
  onSelectWord: (word: string) => void
  selectedWord: string | null
}

export default function TrendingBar({ onSelectWord, selectedWord }: TrendingBarProps) {
  const [words, setWords] = useState<TrendingWord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrending = async () => {
      // Klic RPC funkcije, ki smo jo ustvarili v Supabase
      const { data, error } = await supabase.rpc('get_trending_words', {
        hours_lookback: 24, // Glej zadnjih 24 ur
        limit_count: 15     // Vrni top 15
      })

      if (!error && data) {
        setWords(data as TrendingWord[])
      }
      setLoading(false)
    }

    fetchTrending()
  }, [])

  if (loading || words.length === 0) return null

  return (
    <div className="w-full mb-6">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-[10px] uppercase tracking-widest font-bold text-brand/80 dark:text-brand/60">
          Vroče teme 🔥
        </span>
      </div>
      
      {/* Horizontal Scroll Container */}
      <div className="flex flex-wrap gap-2 items-center">
        {words.map((item) => {
          const isActive = selectedWord?.toLowerCase() === item.word
          return (
            <button
              key={item.word}
              onClick={() => onSelectWord(isActive ? '' : item.word)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border
                ${isActive 
                  ? 'bg-brand text-white border-brand shadow-md' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand/50 hover:text-brand dark:hover:text-brand'
                }
              `}
            >
              #{item.word}
            </button>
          )
        })}
      </div>
    </div>
  )
}
