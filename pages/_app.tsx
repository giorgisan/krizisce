// pages/_app.tsx

import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { ThemeProvider } from 'next-themes'

// Uvoz Vercel Analytics in Speed Insights
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// TypeScript naj pozna, da lahko na window obstaja metoda gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

// Google Analytics identifikator (naj bo enoten skozi projekt)
const GA_MEASUREMENT_ID = 'G-5VVENQ6E2G'

function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Preverimo, ali je gtag definiran, preden ga kličemo
      if (typeof window.gtag === 'function') {
        window.gtag('config', GA_MEASUREMENT_ID, {
          page_path: url,
        })
      }
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  return (
    <>
      {/* Google Analytics skripte */}
      <Head>
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `,
          }}
        />
      </Head>

      {/* Prikaz izbrane strani */}
      <ThemeProvider attribute="class">
        <Component {...pageProps} />
      </ThemeProvider>

      {/* Vercel Analytics in Speed Insights */}
      <Analytics />
      <SpeedInsights />
    </>
  )
}

export default App
