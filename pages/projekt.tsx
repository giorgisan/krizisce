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

            <div className="text-lg leading-relaxed text-gray-600 dark:text-gray-300">
                
                <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">Zakaj Križišče?</h2>
                <p className="mb-4">
                  V poplavi informacij je včasih težko ostati na tekočem. <strong>Križišče</strong> je nastalo z enim preprostim ciljem: izboljšati pregled nad slovensko medijsko krajino in bralcem prihraniti čas. Namesto pregledovanja desetih različnih portalov, lahko najpomembnejše naslove preletite na enem mestu.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">Kako deluje?</h2>
                <p className="mb-4">
                  Križišče je neodvisen in nevtralen agregator. Naš sistem samodejno spremlja javne vire največjih slovenskih portalov in jih v realnem času razvršča v pregleden časovni trak.
                </p>
                <p className="mb-2">Pomembno je poudariti:</p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li><strong>Ne ustvarjamo novic:</strong> Smo le posrednik. Vsa mnenja in dejstva v člankih pripadajo njihovim avtorjem.</li>
                  <li><strong>Spoštujemo vire:</strong> na naših strežnikih ne gostujemo člankov. Vedno vas preusmerimo neposredno na originalni vir, s čimer podpiramo obiskanost slovenskih medijev.</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">Stopite v stik</h2>
                <p>
                  Projekt nenehno razvijamo. Če imate predlog za izboljšavo ali ste opazili napako, bomo veseli vašega sporočila.
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
