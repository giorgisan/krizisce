// pages/pogoji.tsx

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function Pogoji() {
  return (
    // Wrapper div: flex container, ki zasede vsaj celotno višino ekrana
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      
      <Header />

      {/* Main: flex-grow poskrbi, da se raztegne in potisne nogo na dno */}
      <main className="flex-grow w-full max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 py-12 text-gray-900 dark:text-white">
        
        {/* Omejitev širine vsebine za lažje branje (typography best practice) */}
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Pogoji uporabe</h1>

            <div className="space-y-6 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
                <p>
                <strong>Križišče</strong> je informativni agregator novic, ki povezuje na objave različnih slovenskih medijev. Vsebine, ki jih
                povzemamo (naslovi, povzetki, slike), so last izvornih avtorjev, zato ne
                jamčimo za njihovo točnost ali ažurnost.
                </p>

                <p>
                Spletna stran ponuja zgolj kratke izvlečke; za celotno besedilo kliknite na
                povezavo do originalnega medija. Uporabljate jo na lastno odgovornost.
                </p>

                <p>
                Prepovedano je nadaljnje razmnoževanje ali komercialno izkoriščanje povzete
                vsebine brez dovoljenja izvornih medijev.
                </p>
            </div>

            <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
                <Link href="/" className="text-brand font-medium hover:underline inline-flex items-center gap-2">
                    <span>←</span> Nazaj na glavno stran
                </Link>
            </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
