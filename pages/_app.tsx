// pages/_app.tsx

import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// 1. UVOZ FONTOV
import { Inter, Playfair_Display } from 'next/font/google'

// 2. KONFIGURACIJA FONTOV
// Uporabimo subsets: ['latin-ext'] za šumnike!
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  // Brez variable: '...', ker bomo uporabili className direktno
})

const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700', '900'], // Samo teže, ki jih rabiš za naslove
})

function App({ Component, pageProps }: AppProps) {
  return (
    <>
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
        {/* TU JE SPREMEMBA: 
           Uporabimo inter.className direktno. 
           To zagotovi, da Next.js pravilno naloži in aplicira font.
           Dodamo 'antialiased', da prisilimo ostrino.
        */}
        <main className={`${inter.className} antialiased min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}>
          {/* Playfair font injiciramo globalno preko stila, ker ga uporabljamo redkeje */}
          <style jsx global>{`
            :root {
              --font-playfair: ${playfair.style.fontFamily};
            }
            /* Dodatna varovalka za Chrome na Windows */
            body {
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
          `}</style>
          
          <Component {...pageProps} />
        </main>
      </ThemeProvider>

      <Analytics />
      <SpeedInsights />
    </>
  )
}

export default App
