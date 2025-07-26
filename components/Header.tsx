// components/Header.tsx

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'

const Header = () => {
  const router = useRouter()
  const currentFilter = router.query.source || 'Vse'

  const sources = [
    'Vse',
    'RTVSLO',
    '24ur',
    'Siol.net',
    'Slovenske novice',
    'Delo',
    'Zurnal24',
    'N1',
    'Svet24'
  ]

  return (
    <header className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-6">
      {/* Logo + Naslov */}
      <Link href="/" className="flex items-center space-x-3 mb-4 sm:mb-0 group">
        <Image
          src="/logo.png" // ali zamenjaj z npr. /logos/venn-logo.png
          alt="Križišče logo"
          width={40}
          height={40}
          className="rounded-md shadow-md transition-transform group-hover:rotate-6"
        />
        <div>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-yellow-400 via-pink-500 to-pink-600 bg-clip-text text-transparent tracking-tight">
            Križišče
          </h1>
          <p className="text-sm text-gray-400 leading-none">
            Najnovejše novice slovenskih medijev
          </p>
        </div>
      </Link>

      {/* Navigacija */}
      <nav className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-3 mt-2 sm:mt-0">
        {sources.map(source => {
          const isActive = currentFilter === source || (source === 'Vse' && !router.query.source)
          return (
            <Link
              key={source}
              href={source === 'Vse' ? '/' : `/?source=${encodeURIComponent(source)}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${isActive
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
              `}
            >
              {source}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}

export default Header
