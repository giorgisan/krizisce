// components/Footer.tsx

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 border-t border-gray-700 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        {/* Logo in opis */}
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="Križišče logo"
              className="w-6 h-6 grayscale hover:grayscale-0 transition duration-300"
            />
            <span className="text-white font-semibold">Križišče</span>
          </div>
          <p className="text-gray-500 leading-snug">
            Agregator najnovejših novic iz slovenskih medijev. <br />
            Članki so last izvornih portalov.
          </p>
        </div>

        {/* Povezave */}
        <div>
          <p className="text-white font-semibold mb-2">Povezave</p>
          <ul className="space-y-1">
            <li>
              <Link href="/about" className="hover:text-purple-400 transition">
                O projektu
              </Link>
            </li>
            <li>
              <Link href="/pogoji" className="hover:text-purple-400 transition">
                Pogoji uporabe
              </Link>
            </li>
          </ul>
        </div>

        {/* Kontakt */}
        <div>
          <p className="text-white font-semibold mb-2">Kontakt</p>
          <a
            href="mailto:gjkcme@gmail.com"
            className="hover:text-purple-400 transition"
          >
            Pošljite nam sporočilo
          </a>
        </div>

        {/* Rezerviran prostor ali CTA */}
        <div className="flex items-start justify-start">
          {/* Lahko dodaš npr. donacijo, socialne ikone, dark mode */}
          {/* <div className="text-white">Coming soon...</div> */}
        </div>
      </div>

      <div className="text-center text-xs text-gray-600 py-4 border-t border-gray-800">
        © {new Date().getFullYear()} Križišče – Vse pravice pridržane.
      </div>
    </footer>
  )
}
