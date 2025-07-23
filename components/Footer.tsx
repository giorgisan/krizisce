export default function Footer() {
  return (
    <footer className="text-center text-sm text-gray-500 py-6 border-t border-gray-700 mt-10 dark:bg-gray-900">
      <p>© {new Date().getFullYear()} Agregator Danes</p>
      <p className="mt-1">O projektu • Kontakt • Pogoji uporabe</p>
    </footer>
  )
}
