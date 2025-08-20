// pages/_app.tsx
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { ThemeProvider } from 'next-themes'

// Vercel Analytics & Speed Insights
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// TypeScript naj pozna window.gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer?: any[]
  }
}

// Enoten GA ID
const GA_MEASUREMENT_ID = 'G-5VVENQ6E2G'

function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (typeof window.gtag === 'function') {
        window.gtag('config', GA_MEASUREMENT_ID, { page_path: url })
      }
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router.events])

  return (
    <>
      {/* Google Analytics */}
      <Head>
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <script
          id="ga-init"
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

      {/* Privzeto DARK, brez system override; attribute="class" za Tailwind */}
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <Component {...pageProps} />
      </ThemeProvider>

      {/* Vercel metrika */}
      <Analytics />
      <SpeedInsights />
    </>
  )
}

export default App
