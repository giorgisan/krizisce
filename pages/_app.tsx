// pages/_app.tsx
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { ThemeProvider } from 'next-themes'
import Script from 'next/script'

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

// GA4 ID
const GA_MEASUREMENT_ID = 'G-5VVENQ6E2G'

// Pomagalna funkcija za SPA page_view
const pageview = (url: string) => {
  if (typeof window.gtag === 'function') {
    window.gtag('config', GA_MEASUREMENT_ID, { page_path: url })
  }
}

function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = (url: string) => pageview(url)
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router.events])

  return (
    <>
      {/* GA4 – neblokirajoče nalaganje */}
      <Script
        id="ga4-lib"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
          `,
        }}
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

      {/* Vercel metrika */}
      <Analytics />
      <SpeedInsights />
    </>
  )
}

export default App
