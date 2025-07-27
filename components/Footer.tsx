/ components/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 border-t border-gray-800 mt-10">
      <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-3 text-sm">
        {/* Križišče opis z logotipom */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <img
              src="/logo.png"
              alt="Križišče"
              className="w-6 h-6 grayscale hover:grayscale-0 transition duration-300"
            />
            <span className="text-white font-semibold">Križišče</span>
          </div>
          <p>Agregator najnovejših novic iz slovenskih medijev.</p>
          <p>Članki so last izvornih portalov.</p>
        </div>

        {/* Povezave */}
        <div className="flex flex-col space-y-2">
          <p className="text-white font-semibold">Povezave</p>
          <a href="/about" className="hover:text-purple-400 transition">O projektu</a>
          <a href="/pogoji" className="hover:text-purple-400 transition">Pogoji uporabe</a>
        </div>

        {/* Kontakt */}
        <div className="flex flex-col space-y-2">
          <p className="text-white font-semibold">Kontakt</p>
          <a href="mailto:gjkcme@gmail.com" className="hover:text-purple-400 transition">
            Pošljite nam sporočilo
          </a>
        </div>
      </div>

      {/* Spodnja vrstica */}
      <div className="text-center text-xs text-gray-600 py-4 border-t border-gray-800">
        © {new Date().getFullYear()} Križišče – Vse pravice pridržane.
      </div>
    </footer>
  )
}
