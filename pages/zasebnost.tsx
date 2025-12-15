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

                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm mt-8">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-2xl">🛡️</span> Brez piškotkov, brez skrbi
                  </h2>
                  <p className="mb-6 text-sm opacity-90">
                    Za razliko od večine spletnih mest, Križišče <strong>ne uporablja piškotkov za sledenje</strong>. Ko zapustite našo stran, ne vemo več, kdo ste in kje ste bili.
                  </p>
                  
                  <ul className="space-y-4">
                    <li className="flex gap-3 items-start">
                      <div className="min-w-[24px] h-[24px] flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold text-sm">✓</div>
                      <div>
                        <strong>Prijazna statistika:</strong> uporabljamo orodje <em>Umami Analytics</em>, ki je zasnovano za zasebnost. Beležimo le splošne številke (npr. "danes smo imeli 15.000 bralcev"), ne pa kdo ti bralci so.
                      </div>
                    </li>
                    <li className="flex gap-3 items-start">
                      <div className="min-w-[24px] h-[24px] flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold text-sm">✓</div>
                      <div>
                        <strong>Samo nujno:</strong> v vašem brskalniku si zapomnimo le vašo izbiro teme (svetlo ali temno ozadje), da vam je ni treba nastavljati ob vsakem obisku. To ostane na vaši napravi.
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 p-4 border-l-4 border-brand/50 bg-brand/5 text-sm">
                  <strong>Dobro je vedeti:</strong> Križišče je agregator. Ko kliknete na naslov novice, vas preusmerimo na spletno stran izvornega medija (npr. RTV, 24ur, Delo). Na njihovih straneh veljajo njihova pravila zasebnosti.
                </div>
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
