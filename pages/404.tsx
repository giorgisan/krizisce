// pages/404.tsx

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function Custom404() {
  return (
    <>
      {/* Enotna glava, kot na drugih straneh */}
      <Header />

      <main className="min-h-screen bg-gray-900 text-white px-4 md:px-8 lg:px-16 py-16 flex flex-col items-center justify-center">
        <h1 className="text-5xl font-bold mb-4">404</h1>
        <h2 className="text-2xl mb-6">Stran ni bila najdena</h2>
        <p className="text-gray-300 mb-8 text-center max-w-lg">
          Žal iskane strani ni mogoče najti. Morda je bila odstranjena,
          preimenovana ali nikoli ni obstajala.
        </p>
        {/* Gumb za vrnitev na glavno stran */}
        <Link href="/">
          <a className="px-6 py-3 bg-brand text-white rounded-full hover:bg-brand-hover transition">
            Nazaj na glavno stran
          </a>
        </Link>
      </main>

      {/* Enotno podnožje */}
      <Footer />
    </>
  )
}
