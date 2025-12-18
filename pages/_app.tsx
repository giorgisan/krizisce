// pages/_app.tsx

import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// 1. UVOZ FONTOV
// Vračamo "statične" debeline, da bo pisava izgledala točno tako kot prej.
import { Inter, Playfair_Display } from 'next/font/google'

// 2. KONFIGURACIJA FONTOV (Z DOLOČENIMI DEBELINAMI)
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  // Tole je ključno za povrnitev starega videza:
  weight: ['300', '400', '500', '600', '700', '800', '900'], 
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* 3. Globalna definicija spremenljivk */}
      <style jsx global>{`
        :root {
          --font-inter: ${inter.style.fontFamily};
          --font-playfair: ${playfair.style.fontFamily};
        }
        /* Prisilimo uporabo Inter fonta na celem HTML */
        html {
          font-family: var(--font-inter);
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
        {/* Dodamo razrede spremenljivk tudi sem za vsak slučaj 
            in 'font-sans', da Tailwind ve, kaj je default.
        */}
        <main className={`${inter.variable} ${playfair.variable} font-sans min-h-screen`}>
          <Component {...pageProps} />
        </main>
      </ThemeProvider>

      <Analytics />
      <SpeedInsights />
    </>
  )
}

export default App
