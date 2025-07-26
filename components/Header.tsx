import Image from 'next/image'
import Link from 'next/link'

const Header = () => {
  return (
    <header className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-6">
      {/* Logo + Naslov */}
      <Link href="/" className="flex items-center space-x-3 mb-4 sm:mb-0">
        <Image
          src="/compass.png"
          alt="Križišče logo"
          width={36}
          height={36}
          className="rounded-md"
        />
        <div>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-yellow-400 via-pink-500 to-pink-600 bg-clip-text text-transparent tracking-tight">
            Križišče
          </h1>
          <p className="text-sm text-gray-400 leading-none">Slovenski informacijski kompas</p>
        </div>
      </Link>

      {/* Navigacija */}
      <nav className="flex flex-wrap justify-center sm:justify-end gap-3">
        {['Vse', 'RTVSLO', '24ur', 'Siol.net', 'Slovenske novice', 'Delo', 'Zurnal24', 'N1', 'Svet24'].map(source => (
          <button
            key={source}
            className="px-3 py-1 rounded-full text-sm font-medium text-gray-300 hover:bg-gray-700 transition-all"
          >
            {source}
          </button>
        ))}
      </nav>
    </header>
  )
}

export default Header
