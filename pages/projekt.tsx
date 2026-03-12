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
                  V poplavi informacij je včasih težko ostati na tekočem. <strong>Križišče</strong> je nastalo z enim preprostim ciljem: izboljšati pregled nad slovensko medijsko krajino in bralcem prihraniti čas. Namesto da pregledujete deset različnih portalov, lahko najpomembnejše naslove in poglobljene analize preletite na enem mestu.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">Napredno in avtomatizirano</h2>
                <p className="mb-4">
                  Križišče je sodoben, neodvisen in pameten agregator. Naš sistem samodejno spremlja javne vire največjih slovenskih portalov in jih v realnem času razvršča v pregleden časovni trak. Da bi zmanjšali informacijski šum, uporabljamo napredne rešitve:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li><strong>Umetna inteligenca (UI):</strong> Skrbi za natančno kategorizacijo vsebin in samodejno združevanje iste zgodbe iz več različnih virov, kar prinaša izjemno čist in pregleden vmesnik.</li>
                  <li><strong>Dnevni novičnik:</strong> Sistem vsako jutro zbere in povzame ključne dogodke preteklega dne, ki jih po želji dostavi naravnost v vaš nabiralnik.</li>
                  <li><strong>Nevtralnost in podpora medijem:</strong> Ne ustvarjamo lastnih novic in ne gostimo vsebin. Sistem deluje kot smerokaz, ki bralce preusmerja k izviru informacij. Za poglobljeno branje pa je seveda potreben obisk (in podpora) posameznega medija.</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">Stopite v stik</h2>
                <p>
                  Projekt nenehno razvijamo in izboljšujemo. Če imate predlog za novo funkcijo ali ste opazili napako, bomo veseli vašega sporočila.
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
