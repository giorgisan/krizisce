import Link from 'next/link'
import { useEffect, useState } from 'react'
import SponsorBanner from './SponsorBanner'

export default function Header() {
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] transition">
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white transition">
          <Link href="/">📰 Križišče </Link>
        </h1>
        <SponsorBanner />
      </div>

      <button
        onClick={() => setDarkMode(!darkMode)}
        className="text-xl p-2 text-gray-600 dark:text-gray-300 hover:scale-110 transition mt-4 sm:mt-0"
        title="Preklop svetlo/temno"
      >
        {darkMode ? '🌙' : '☀️'}
      </button>
    </header>
  )
}
