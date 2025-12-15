// pages/404.tsx

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function Custom404() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      
      {/* Glava */}
      <Header />

      {/* Main: flex-grow poskrbi za sredinsko poravnavo in potisk noge na dno */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 text-center relative overflow-hidden">
        
        {/* Dekorativni 404 v ozadju (ogromen in bolj blag) */}
        <h1 className="text-[10rem] md:text-[12rem] font-black text-gray-100 dark:text-gray-800 select-none leading-none opacity-80">
          404
        </h1>
        
        {/* Vsebina čez številko */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 mt-16 md:mt-24">
              Stran ni bila najdena
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md px-4">
              Žal iskane strani ni mogoče najti. Morda je bila odstranjena,
              preimenovana ali pa nikoli ni obstajala.
            </p>

            {/* Gumb */}
            <Link 
              href="/"
              className="px-8 py-3 bg-brand text-white font-medium rounded-full hover:bg-opacity-90 hover:scale-105 transition-all shadow-lg shadow-brand/20"
            >
              Nazaj na glavno stran
            </Link>
        </div>
      </main>

      {/* Podnožje */}
      <Footer />
    </div>
  )
}
