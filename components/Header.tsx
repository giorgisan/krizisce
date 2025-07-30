/* components/Header.tsx */
import Link from 'next/link'

type HeaderProps = {
  onToggleTheme: () => void
  theme: 'light' | 'dark'
}

export default function Header({ onToggleTheme, theme }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
      <div>
        <h1 className="text-2xl font-bold">
          <Link href="/">Križišče</Link>
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Najnovejše novice slovenskih medijev
        </p>
      </div>
      <nav className="mt-4 sm:mt-0 flex items-center gap-4">
        <Link href="/about" className="hover:underline">
          O projektu
        </Link>
        <Link href="/pogoji" className="hover:underline">
          Pogoji uporabe
        </Link>
        <button
          onClick={onToggleTheme}
          aria-label="Preklopi temo"
          className="ml-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {theme === 'dark' ? '🌞' : '🌙'}
        </button>
      </nav>
    </header>
  )
}
