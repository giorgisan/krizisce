// pages/projekt.tsx

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function Projekt() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      
      <Header />

      <main className="flex-grow w-full max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 py-12 text-gray-900 dark:text-white">
        
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">O projektu Križišče</h1>

            <div className="space-y-6 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
                <p>
                <strong>Križišče</strong> je neodvisen agregator najnovejših novic slovenskih medijev.
                Spletna stran uporablja vire različnih portalov in jih združuje na enem mestu. Cilj projekta je izboljšati
                pregled nad domačo medijsko krajino in omogočiti hiter dostop do najpomembnejših informacij na enem mestu.
                </p>

                <p>
                Novice se ne shranjujejo, temveč zgolj povzemajo in povezujejo na
                originalne vire. Vse vsebine pripadajo posameznim medijem.
                </p>

                <p>
                Hvala, ker uporabljate Križišče. Veseli bomo vašega mnenja in
                predlogov.
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
