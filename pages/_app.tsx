// pages/_app.tsx

import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// 1. UVOZ FONTOV (Variabilni fonti - ne določamo 'weight')
import { Inter, Playfair_Display } from 'next/font/google'

// 2. KONFIGURACIJA (Brez 'weight' polja -> uporabi variable font)
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
      {/* 3. GLOBALNI STILI ZA SPREMENLJIVKE
        To zagotovi, da sta --font-inter in --font-playfair 
        dostopna povsod v aplikaciji (tudi v Headerju).
      */}
      <style jsx global>{`
        :root {
          --font-inter: ${inter.style.fontFamily};
          --font-playfair: ${playfair.style.fontFamily};
        }
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
        {/* Glavni wrapper z razredi za fonte */}
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
