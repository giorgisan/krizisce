// pages/_app.tsx

import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
// ODSTRANI TOLE: import { SpeedInsights } from '@vercel/speed-insights/next'

// 1. UVOZ FONTOV
import { Inter, Playfair_Display } from 'next/font/google'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-playfair',
  display: 'swap',
})

function App({ Component, pageProps }: AppProps) {
  return (
    <>
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
        <main className="font-sans antialiased min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
          <Component {...pageProps} />
        </main>
      </ThemeProvider>

      <Analytics />
      {/* ODSTRANI TOLE: <SpeedInsights /> */}
    </>
  )
}

export default App
