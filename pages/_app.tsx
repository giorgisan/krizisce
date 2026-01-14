import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import Head from 'next/head'
import { useEffect } from 'react'

// 1. UVOZ FONTOV iz next/font (lokalno, brez Googla)
import { Inter, Playfair_Display } from 'next/font/google'

// Konfiguracija za Inter (glavni tekst)
const inter = Inter({
  subsets: ['latin', 'latin-ext'], // Nujno za Š, Č, Ž
  display: 'swap',
  // Ne uporabimo 'variable' tukaj, ampak spodaj ročno, da prime tudi v Portalu/Preview
})

// Konfiguracija za Playfair (naslovi)
const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

function App({ Component, pageProps }: AppProps) {
  
  // Prepreči skakanje strani pri navigaciji
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

      {/* GLOBALNA DEFINICIJA FONTOV 
         To zagotovi, da pisava deluje povsod, tudi v ArticlePreview (ki je izven glavnega <main>) 
      */}
      <style jsx global>{`
        :root {
          --font-inter: ${inter.style.fontFamily};
          --font-playfair: ${playfair.style.fontFamily};
        }

        html {
          font-family: var(--font-inter), system-ui, sans-serif;
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
        {/* font-sans razred tukaj uporabi zgoraj definirano --font-inter */}
        <main className="font-sans antialiased min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
          <Component {...pageProps} />
        </main>
      </ThemeProvider>

      <Analytics />
    </>
  )
}

export default App
