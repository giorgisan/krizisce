import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import Head from 'next/head'
import { useEffect } from 'react'

// 1. UVOZ FONTOV
import { Inter, Playfair_Display } from 'next/font/google'

// Konfiguracija za Inter (glavni tekst)
const inter = Inter({
  subsets: ['latin', 'latin-ext'], // KLJUČNO: 'latin-ext' popravi Š, Č, Ž
  variable: '--font-inter',
  display: 'swap',
})

// Konfiguracija za Playfair (naslovi/logo)
const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-playfair',
  display: 'swap',
})

function App({ Component, pageProps }: AppProps) {
  
  // POPRAVEK: Prepreči utripanje scroll pozicije pri navigaciji
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
  }, [])

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Globalni stili za glajenje pisave in scrollbar */}
      <style jsx global>{`
        html {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: auto;
        }
        
        /* SCROLLBAR FIX */
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>

      {/* UMAMI ANALYTICS */}
      <Script 
        src="https://cloud.umami.is/script.js" 
        data-website-id="bebf6633-ff51-4051-9772-5eb199dfced9"
        strategy="afterInteractive"
      />

      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        storageKey="theme"
        disableTransitionOnChange
      >
        {/* TUKAJ se injicirajo font spremenljivke v celotno aplikacijo */}
        <main className={`${inter.variable} ${playfair.variable} font-sans antialiased min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300`}>
          <Component {...pageProps} />
        </main>
      </ThemeProvider>

      <Analytics />
    </>
  )
}

export default App
