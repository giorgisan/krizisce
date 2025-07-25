// pages/about.tsx
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function About() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-900 text-white px-4 md:px-8 lg:px-16 py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">
          O projektu Križišče
        </h1>
        <p className="text-gray-300 mb-4">
          <strong>Križišče</strong> je agregator najnovejših novic iz
          slovenskih medijev. Spletna stran uporablja RSS vire različnih
          portalov in jih združuje na enem mestu. Cilj projekta je
          uporabnikom ponuditi hiter pregled nad dogajanjem v državi.
        </p>
        <p className="text-gray-300 mb-4">
          Projekt je odprtokoden in kodo lahko najdete na{' '}
          <a
            href="https://github.com/giorgisan/krizisce"
            className="text-purple-400 underline hover:text-purple-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHubu
          </a>
          . Dobrodošli so predlogi in prispevki k razvoju.
        </p>
        <p className="text-gray-300">
          Za povratne informacije ali vprašanja nam pišite na{' '}
          <a
            href="mailto:gjkcme@gmail.com"
            className="text-purple-400 underline hover:text-purple-300"
          >
            Elektronska pošta
          </a>
          .
        </p>
        {/* povezava nazaj na domačo stran */}
        <div className="mt-8">
          <Link href="/">
            <a className="text-purple-400 hover:text-purple-300 underline">
              ← Nazaj na glavno stran
            </a>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
