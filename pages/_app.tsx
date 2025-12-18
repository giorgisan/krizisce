// pages/_app.tsx

import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// 1. UVOZ FONTOV - STROGO STATIČNI
// Uvažamo samo tiste teže, ki jih dejansko rabiš.
// To prepreči, da bi brskalnik "ugibal" vmesne debeline.
import { Inter, Playfair_Display } from 'next/font/google'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
  // Točno te debeline zagotavljajo ostrino
  weight: ['400', '500', '600', '700', '900'], 
})

const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['700', '900'],
})

function App({ Component, pageProps }: AppProps) {
  return (
    <>
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
        {/* Odstranimo vse nepotrebne razrede, ker smo jih definirali v <style jsx global> */}
        <main className="min-h-screen font-sans antialiased">
          <Component {...pageProps} />
        </main>
      </ThemeProvider>

      <Analytics />
      <SpeedInsights />
    </>
  )
}

export default App
