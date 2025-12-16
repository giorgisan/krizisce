import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function Zasebnost() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      
      <Header />

      <main className="flex-grow w-full max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 py-12 text-gray-900 dark:text-white">
        
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Vaša zasebnost je zagotovljena</h1>

            <div className="text-lg leading-relaxed text-gray-600 dark:text-gray-300 space-y-6">
                
                <p>
                  Pri portalu <strong>Križišče</strong> verjamemo, da mora biti branje novic sproščeno in varno. Zato smo stran zgradili tako, da spoštuje vašo anonimnost. 
                </p>
                <p>
                  Ne zahtevamo registracije, ne zbiramo vaših osebnih podatkov in vas ne zasledujemo z oglasi.
                </p>

                {/* GLAVNO POLJE O ZASEBNOSTI */}
                <div className="bg-gray-50 dark:bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm mt-8">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-2xl">🛡️</span> Brez piškotkov, brez skrbi
                  </h2>
                  <p className="mb-6 text-sm opacity-90 leading-relaxed">
                    Za razliko od večine spletnih mest, Križišče <strong>ne uporablja piškotkov za sledenje</strong>. Ko zapustite našo stran, ne vemo več, kdo ste in kje ste bili.
                  </p>
                  
                  <ul className="space-y-4 mb-8">
                    <li className="flex gap-3 items-start">
                      <div className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold text-sm">✓</div>
                      <div className="text-base">
                        <strong>Prijazna statistika:</strong> uporabljamo orodje <em>Umami Analytics</em>, ki je zasnovano za zasebnost. Beležimo le splošne številke (npr. "danes smo imeli 15.000 bralcev"), ne pa, kdo ti bralci so.
                      </div>
                    </li>
                    <li className="flex gap-3 items-start">
                      <div className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold text-sm">✓</div>
                      <div className="text-base">
                        <strong>Samo nujno:</strong> v vašem brskalniku si zapomnimo le vašo izbiro teme (svetlo ali temno ozadje), da vam je ni treba nastavljati ob vsakem obisku. To ostane na vaši napravi.
                      </div>
                    </li>
                  </ul>

                  {/* INTEGRIRANA OPOMBA "DOBRO JE VEDETI" */}
                  <div className="flex gap-3 p-4 rounded-lg bg-gray-200/30 dark:bg-gray-700/30 items-start text-sm text-gray-700 dark:text-gray-300">
                     <div className="shrink-0 text-gray-500 dark:text-gray-400 pt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                     </div>
                     <div className="leading-relaxed opacity-90">
                        <strong>Dobro je vedeti:</strong> Križišče je agregator. Ko kliknete na naslov novice, vas preusmerimo na spletno stran izvornega medija (npr. RTV, 24ur, Delo ...). Na njihovih straneh veljajo njihova pravila zasebnosti.
                     </div>
                  </div>
                </div>
            </div>

            <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
                <Link href="/" className="group text-brand font-medium inline-flex items-center gap-2 transition-colors hover:text-brand-dark">
                    <span className="transition-transform group-hover:-translate-x-1">←</span> Nazaj na glavno stran
                </Link>
            </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
