import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function Zasebnost() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      
      <Header />

      <main className="flex-grow w-full max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 py-12 text-gray-900 dark:text-white">
        
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Politika zasebnosti</h1>

            <div className="text-lg leading-relaxed text-gray-600 dark:text-gray-300">
                
                <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">1. Katere podatke zbiramo?</h2>
                <p className="mb-4">
                  Portal <strong>Križišče</strong> ne zahteva registracije in ne zbira osebnih podatkov, kot so imena, e-poštni naslovi ali telefonske številke. Za namen izboljšave uporabniške izkušnje in statistiko pa beležimo naslednje anonimizirane podatke:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li><strong>Analitika klikov:</strong> Ko kliknete na novico, sistem zabeleži povezavo in tip vaše naprave (User-Agent). Te podatke uporabljamo izključno za razvrščanje najbolj priljubljenih novic ("Vroče").</li>
                  <li><strong>Statistika obiska:</strong> Uporabljamo orodja Google Analytics 4 in Vercel Insights za merjenje obiskanosti in hitrosti strani. IP naslovi so v Google Analytics anonimizirani.</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">2. Piškotki in lokalna shramba</h2>
                <p className="mb-4">
                  Uporabljamo minimalen nabor piškotkov in lokalne shrambe (LocalStorage):
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li><strong>Nastavitve teme:</strong> V vašem brskalniku shranimo izbiro videza (svetlo/temno), da se ohrani ob naslednjem obisku.</li>
                  <li><strong>Google Analytics:</strong> Google lahko na vašo napravo shrani piškotke za razlikovanje unikatnih obiskovalcev (npr. `_ga`).</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">3. Povezave do tretjih oseb</h2>
                <p className="mb-4">
                  Križišče je agregator. Ko kliknete na naslov novice, boste preusmerjeni na spletno mesto izvornega medija (npr. RTV SLO, 24ur, Delo ...). Na teh spletnih mestih veljajo njihova lastna pravila zasebnosti, na katera mi nimamo vpliva.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">4. Kontakt</h2>
                <p>
                  Za vsa vprašanja glede delovanja strani ali zasebnosti nas lahko kontaktirate na naš e-poštni naslov, naveden v nogi spletne strani.
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
