// components/Footer.tsx

import { useState } from 'react'
import Link from 'next/link'

export default function Footer() {
  const [showSources, setShowSources] = useState(false)

  const sources = [
    { name: 'RTVSLO', url: 'https://www.rtvslo.si/' },
    { name: '24ur', url: 'https://www.24ur.com/' },
    { name: 'Siol.net', url: 'https://siol.net/' },
    { name: 'Slovenske novice', url: 'https://www.slovenskenovice.si/' },
    { name: 'Delo', url: 'https://www.delo.si/' },
    { name: 'Žurnal24', url: 'https://www.zurnal24.si/' },
    { name: 'N1', url: 'https://n1info.si/' },
    { name: 'Svet24', url: 'https://novice.svet24.si/' }
  ]

  return (
    <footer className="relative bg-gray-900 text-gray-300 pt-12 pb-6 mt-8 border-t border-gray-800">
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

        {/* Desna kolona: kontakt + gumb */}
        <div className="flex-1 flex flex-col items-start sm:items-end">
          <h4 className="text-white font-semibold mb-4">Kontakt</h4>
          <p className="text-sm font-normal mb-4">
            <a href="mailto:gjkcme@gmail.com" className="hover:text-white transition">
              Pošljite nam sporočilo
            </a>
          </p>
          <button
            onClick={() => setShowSources(!showSources)}
            className="bg-gray-800 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-gray-700 transition"
          >
            <span className="text-lg">⋮</span> Viri
          </button>
        </div>
      </div>

      {/* Panel z viri */}
      {showSources && (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 bottom-20 bg-gray-800 bg-opacity-90 p-6 rounded-lg shadow-lg w-full max-w-2xl animate-fadeIn z-50"
          style={{ marginBottom: '2rem' }} // prostor pod panelom
        >
          <h4 className="text-white font-semibold mb-4">Viri novic</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sources.map((src) => (
              <a
                key={src.name}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition flex items-center gap-2"
              >
                <span className="bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {src.name.charAt(0)}
                </span>
                {src.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Spodnji trak z citatom in avtorsko vrstico */}
      <div className="border-t border-gray-800 mt-12 pt-4 text-center text-sm font-normal text-gray-500">
        <p className="italic mb-2">
          “Informacija ni znanje. Edino razumevanje šteje.” – Albert Einstein
        </p>
        <p>© {new Date().getFullYear()} Križišče – Vse pravice pridržane.</p>
      </div>

      {/* Animacija */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </footer>
  )
}
