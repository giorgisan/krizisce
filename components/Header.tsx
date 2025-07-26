// components/Header.tsx

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'

const sources = [
  'Vse',
  'RTVSLO',
  '24ur',
  'Siol.net',
  'Slovenske novice',
  'Delo',
  'Zurnal24',
  'N1',
  'Svet24',
]

const Header = () => {
  const router = useRouter()
  const current = (router.query.source as string) || 'Vse'

  return (
    <header className="bg-gray-900 py-6 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between">
      {/* LOGO + NASLOV */}
      <Link href="/" className="flex items-center space-x-3 mb-4 sm:mb-0 group">
        <Image
          src="/logo.png"
          alt="Križišče logotip"
          width={40}
          height={40}
          className="transition-transform group-hover:rotate-6"
          priority
        />
        <div>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-yellow-400 via-pink-500 to-pink-600 bg-clip-text text-transparent">
            Križišče
          </h1>
          <p className="text-sm text-gray-400 leading-tight">
            Slovenski informacijski kompas
          </p>
        </div>
      </Link>

      {/* NAVIGACIJA */}
      <nav className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-3">
        {sources.map(src => {
          const isActive = src === current
          return (
            <Link
              key={src}
              href={src === 'Vse' ? '/' : `/?source=${encodeURIComponent(src)}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {src}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}

export default Header
