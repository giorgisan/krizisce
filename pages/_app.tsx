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
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* 3. Globalna ovojnica s pisavami
          To omogoči, da so spremenljivke (--font-inter) na voljo povsod.
          Dodamo 'font-sans', da je Inter privzet font.
      */}
      <style jsx global>{`
        :root {
          --font-inter: ${inter.style.fontFamily};
          --font-playfair: ${playfair.style.fontFamily};
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
        {/* Dodamo razred za pisave na glavni wrapper, če je potrebno, 
            ampak z zgornjim <style jsx global> smo že pokrili spremenljivke. 
            Vseeno je dobro imeti glavni container. */}
        <main className={`${inter.variable} ${playfair.variable} font-sans`}>
          <Component {...pageProps} />
        </main>
      </ThemeProvider>

      <Analytics />
      <SpeedInsights />
    </>
  )
}

export default App
