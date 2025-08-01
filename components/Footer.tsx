// components/Footer.tsx

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-6 mt-8 border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-8">
        {/* Leva kolona: logotip in opis */}
        <div>
          <div className="flex items-center mb-3">
            <img src="/logo.png" alt="Križišče" className="w-8 h-8 rounded-full mr-2" />
            <h3 className="text-xl font-bold text-white">Križišče</h3>
          </div>
          <p className="text-sm font-normal mb-2">
            Agregator najnovejših novic iz slovenskih medijev. Članki so last izvornih portalov.
          </p>
        </div>

        {/* Srednja kolona: navigacijske povezave */}
        <div>
          <h4 className="text-white font-semibold mb-3">Povezave</h4>
          <ul className="space-y-1 text-sm font-normal">
            <li>
              <Link href="/projekt">
                <a className="hover:text-white transition">O projektu</a>
              </Link>
            </li>
            <li>
              <Link href="/pogoji">
                <a className="hover:text-white transition">Pogoji uporabe</a>
              </Link>
            </li>
          </ul>
        </div>

        {/* Desna kolona: kontakt */}
        <div>
          <h4 className="text-white font-semibold mb-3">Kontakt</h4>
          <p className="text-sm font-normal">
            <a href="mailto:gjkcme@gmail.com" className="hover:text-white transition">
              Pošljite nam sporočilo
            </a>
          </p>
        </div>
      </div>

      {/* Spodnji trak z citatom in avtorsko vrstico */}
      <div className="border-t border-gray-800 mt-12 pt-4 text-center text-sm font-normal text-gray-500">
        <p className="italic mb-2">
          “Informacija ni znanje. Edino razumevanje šteje.” – Albert Einstein
        </p>
        <p>© {new Date().getFullYear()} Križišče – Vse pravice pridržane.</p>
      </div>
    </footer>
  )
}
