// components/Header.tsx
import Link from 'next/link'
import { siteTitle, siteTagline } from '@/lib/siteConfig'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-gray-900/70 backdrop-blur-md backdrop-saturate-150 border-b border-gray-800 py-3 px-4 md:px-8 lg:px-16">
      <div className="flex items-center space-x-3">
        <Link href="/" passHref>
          <a className="flex items-center space-x-3">
            <img src="/logo.png" alt={`${siteTitle} logo`} className="w-8 h-8 rounded-full" />
            <div>
              <h1 className="text-lg font-bold text-white">{siteTitle}</h1>
              <p className="text-xs text-gray-400">{siteTagline}</p>
            </div>
          </a>
        </Link>
      </div>
    </header>
  )
}
