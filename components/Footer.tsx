// components/Footer.tsx

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-6 mt-8 border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-8">
        {/* Leva kolona: logotip in opis */}
        <div className="flex-1">
          <div className="flex items-center mb-4">
            <img src="/logo.png" alt="Križišče" className="w-8 h-8 rounded-full mr-2" />
            <h4 className="text-white font-semibold text-lg">Križišče</h4>
          </div>
          <p className="text-sm font-normal leading-relaxed">
            Agregator najnovejših novic iz slovenskih medijev. <br />
            Članki so last izvornih portalov.
          </p>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-gray-800"></div>

        {/* Srednja kolona: navigacijske povezave */}
        <div className="flex-1">
          <h4 className="text-white font-semibold mb-4">Povezave</h4>
          <ul className="space-y-2 text-sm font-normal">
            <li>
              <Link href="/projekt" className="hover:text-white transition">
                O projektu
              </Link>
            </li>
            <li>
              <Link href="/pogoji" className="hover:text-white transition">
                Pogoji uporabe
              </Link>
            </li>
          </ul>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-gray-800"></div>

        {/* Desna kolona: kontakt */}
        <div className="flex-1">
          <h4 className="text-white font-semibold mb-4">Kontakt</h4>
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
