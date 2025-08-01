// pages/about.tsx

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function About() {
  return (
    <>
      {/* Glava z logotipom in navigacijo */}
      <Header />

      <main className="min-h-screen bg-gray-900 text-white px-4 md:px-8 lg:px-16 py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">O projektu Križišče</h1>

        <p className="text-gray-300 mb-4">
          <strong>Križišče</strong> je neodvisen agregator najnovejših novic
          iz slovenskih medijev. Spletna stran uporablja vire različnih
          portalov in jih združuje na enem mestu. Cilj projekta je izboljšati
          pregled nad domačo medijsko krajino in omogočiti hiter dostop do
          najpomembnejših informacij na enem mestu.
        </p>

        <p className="text-gray-300 mb-4">
          Novice se ne shranjujejo, temveč zgolj povzemajo in povezujejo na
          originalne vire. Vse vsebine pripadajo posameznim medijem.
        </p>

        <p className="text-gray-300 mb-4">
          Hvala, ker uporabljate Križišče. Veseli bomo vašega mnenja in
          predlogov.
        </p>

        {/* Povezava nazaj na glavno stran */}
        <div className="mt-8">
          <Link href="/">
            <a className="text-purple-400 hover:text-purple-300 underline">
              ← Nazaj na glavno stran
            </a>
          </Link>
        </div>
      </main>

      {/* Podnožje */}
      <Footer />
    </>
  )
}
