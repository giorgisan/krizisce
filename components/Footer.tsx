// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 border-t border-gray-700 mt-10">
      <div className="max-w-7xl mx-auto px-4 py-8 grid gap-4 md:grid-cols-3 text-sm">
        <div>
          <p className="font-semibold text-white">Križišče</p>
          <p className="mt-1">
            Agregator najnovejših novic iz slovenskih medijev. <br></br>Članki so last
            izvornih portalov.
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Povezave</p>
          <ul className="mt-1 space-y-1">
            <li>
              <a href="#" className="hover:text-purple-400">
                O projektu
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-purple-400">
                RSS viri
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-purple-400">
                Pogoji uporabe
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Kontakt</p>
          <p className="mt-1">
            <a
              href="mailto:gjkcme@gmail.com"
              className="hover:text-purple-400"
            >
              Pošljite nam sporočilo
            </a>
          </p>
       
        </div>
      </div>
      <div className="text-center text-xs text-gray-600 py-4 border-t border-gray-700">
        © {new Date().getFullYear()} Križišče – Vse pravice pridržane.
      </div>
    </footer>
  )
}
