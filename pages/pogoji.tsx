// pages/pogoji.tsx

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function Pogoji() {
  return (
    <>
      {/* Glava z navigacijo */}
      <Header />

      <main className="min-h-screen bg-gray-900 text-white px-4 md:px-8 lg:px-16 py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">Pogoji uporabe</h1>

        <p className="text-gray-300 mb-4">
          <strong>Križišče</strong> je informativni agregator novic, ki povezuje na objave različnih slovenskih medijev. Vsebine, ki jih
          povzemamo (naslovi, povzetki, slike), so last izvornih avtorjev, zato ne
          jamčimo za njihovo točnost ali ažurnost.
        </p>

        <p className="text-gray-300 mb-4">
          Spletna stran ponuja zgolj kratke izvlečke; za celotno besedilo kliknite na
          povezavo do originalnega medija. Uporabljate jo na lastno odgovornost.
        </p>

        <p className="text-gray-300 mb-4">
          Prepovedano je nadaljnje razmnoževanje ali komercialno izkoriščanje povzete
          vsebine brez dovoljenja izvornih medijev.
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
