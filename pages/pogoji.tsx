// pages/pogoji.tsx

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function Pogoji() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      
      <Header />

      <main className="flex-grow w-full max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 py-12 text-gray-900 dark:text-white">
        
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Pogoji uporabe in izključitev odgovornosti</h1>

            <div className="text-lg leading-relaxed text-gray-600 dark:text-gray-300">
                
                <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">1. O storitvi</h2>
                <p className="mb-4">
                  Spletno mesto <strong>Križišče</strong> deluje kot avtomatiziran agregator novic (iskalnik novic), ki na enem mestu zbirke javno dostopne vire različnih slovenskih medijskih portalov. Storitev je za končne uporabnike brezplačna.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">2. Avtorske pravice in vsebina</h2>
                <p className="mb-4">
                  Vsebine, prikazane na portalu (naslovi, kratki povzetki, pomanjšane slike), so izključna last izvornih avtorjev oziroma medijskih hiš. Križišče ne posega v vsebino.
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li>Prikazujemo zgolj kratke informativne izvlečke (t.i. <em>snippets</em>), ki služijo kot napotilo k viru.</li>
                  <li>Za branje celotne novice je potreben klik na povezavo, ki uporabnika preusmeri na originalno spletno stran medija.</li>
                  <li>Prepovedano je avtomatizirano strganje (<em>scraping</em>) ali komercialna raba zbranih podatkov brez našega soglasja ali soglasja izvornih medijev.</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">3. Omejitev odgovornosti</h2>
                <p className="mb-4">
                  Ker se novice zajemajo samodejno, upravitelj portala Križišče ne odgovarja za:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li>točnost, verodostojnost ali ažurnost informacij, ki jih objavljajo izvorni mediji;</li>
                  <li>nedelovanje povezav do izvornih strani;</li>
                  <li>morebitno škodo, nastalo zaradi uporabe informacij, pridobljenih preko našega portala.</li>
                </ul>
                <p>
                  Uporaba portala je na lastno odgovornost. Pridržujemo si pravico do spremembe pogojev brez predhodnega obvestila.
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
