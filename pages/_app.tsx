// pages/_app.tsx

import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import Script from 'next/script' // <--- Uvozimo Script komponento

// Vercel Analytics & Speed Insights 
// (Privacy friendly - brez piškotkov, zato ne rabiš bannerja)
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* UMAMI ANALYTICS
         - strategy="afterInteractive" zagotavlja, da ne upočasni nalaganja strani
         - Brez piškotkov, skladno z GDPR brez bannerja
      */}
      <Script 
        src="https://cloud.umami.is/script.js" 
        data-website-id="bebf6633-ff51-4051-9772-5eb199dfced9"
        strategy="afterInteractive"
      />

      {/* Tema: privzeto DARK, brez system override; class način za Tailwind */}
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        storageKey="theme"
        disableTransitionOnChange
      >
        <Component {...pageProps} />
      </ThemeProvider>

      {/* Vercel metrika - anonimna statistika obiska */}
      <Analytics />
      
      {/* Vercel Speed Insights - merjenje hitrosti strani */}
      <SpeedInsights />
    </>
  )
}

export default App
