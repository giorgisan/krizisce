// /lib/ga.ts

export const GA_MEASUREMENT_ID = 'G-PCEMG0NP3J'

// ⬇️ Dodamo TypeScript deklaracijo za gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    })
  }
}
