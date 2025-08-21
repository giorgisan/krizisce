// pages/_document.tsx
import Document, { Html, Head, Main, NextScript } from 'next/document'

/**
 * Prepreči "flash" napačne teme pred hydratacijo:
 * - prebere localStorage.theme ('dark' | 'light')
 * - če ni nastavljeno, upošteva prefers-color-scheme
 * - privzeto dark
 */
const noFlashThemeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var useDark = stored ? (stored === 'dark') : (prefersDark || true);
    var root = document.documentElement;
    if (useDark) root.classList.add('dark'); else root.classList.remove('dark');
  } catch (e) {}
})();
`

class MyDocument extends Document {
  render() {
    return (
      <Html lang="sl" suppressHydrationWarning>
        <Head>
          {/* Favicons / ikone – kažejo na datoteke, ki jih imaš v /public */}
          <link rel="icon" href="/favicon.ico" sizes="any" />
          {/* Če želiš še PNG favicon (npr. za nekatere Android brskalnike) */}
          <link rel="icon" type="image/png" href="/logos/logo.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/logos/apple-touch-icon.png" />

          {/* Osnovni meta podatki (viewport dajemo tukaj) */}
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <meta name="referrer" content="strict-origin-when-cross-origin" />

          {/* UI podpira dark & light; theme-color za oba načina */}
          <meta name="color-scheme" content="dark light" />
          <meta name="theme-color" content="#0d0d0d" media="(prefers-color-scheme: dark)" />
          <meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)" />

          {/* Prepreči FOUC teme */}
          <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
        </Head>
        <body className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white antialiased selection:bg-brand/20">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
