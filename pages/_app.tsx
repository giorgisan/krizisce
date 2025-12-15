// pages/_app.tsx
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'

// Vercel Analytics & Speed Insights 
// (Privacy friendly - brez piškotkov, zato ne rabiš bannerja)
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

function App({ Component, pageProps }: AppProps) {
  return (
    <>
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
