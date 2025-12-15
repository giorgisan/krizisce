import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function Zasebnost() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      
      <Header />

      <main className="flex-grow w-full max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 py-12 text-gray-900 dark:text-white">
        
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Zasebnost na kratko</h1>

            <div className="text-lg leading-relaxed text-gray-600 dark:text-gray-300 space-y-6">
                
                <p>
                  Pri portalu <strong>Križišče</strong> verjamemo v preprostost. Ne zahtevamo registracije in od vas ne zbiramo nobenih osebnih podatkov (imen, emailov ali telefonskih številk).
                </p>

                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Kaj beležimo?</h2>
                  <ul className="space-y-2">
                    <li className="flex gap-3">
                      <span className="text-brand font-bold">✓</span>
                      <span><strong>Statistika:</strong> Uporabljamo Google Analytics za merjenje obiska, da vemo, koliko ljudi nas bere. Podatki so anonimizirani.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-brand font-bold">✓</span>
                      <span><strong>Popularnost:</strong> Štejemo klike na novice, da lahko sestavimo seznam "Vroče".</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-brand font-bold">✓</span>
                      <span><strong>Nastavitve:</strong> Zapomnimo si vašo izbiro teme (svetlo/temno), da je ni treba vsakič nastavljati.</span>
                    </li>
                  </ul>
                </div>

                <p>
                  Ko kliknete na povezavo do novice, vas preusmerimo na izvorni medij (npr. RTV, 24ur, Delo). Tam veljajo njihova pravila zasebnosti.
                </p>

                <p>
                  Za vsa vprašanja smo vam na voljo na našem e-naslovu.
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
