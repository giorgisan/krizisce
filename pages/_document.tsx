// pages/_document.tsx
import Document, { Html, Head, Main, NextScript } from 'next/document'

/**
 * Minimal inline skripta, ki:
 * - prebere lokalno shranjeno temo (localStorage.theme: 'dark' | 'light')
 * - če ni shranjena, upošteva prefers-color-scheme
 * - privzeto nastavi 'dark'
 * - doda/odstrani razred 'dark' na <html> pred hydratacijo (brez FOUC)
 */
const noFlashThemeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var useDark = stored ? (stored === 'dark') : prefersDark || true; // privzeto dark
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
          {/* Favicone */}
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" href="/logo.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

          {/* Osnovni meta podatki */}
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <meta name="referrer" content="strict-origin-when-cross-origin" />

          {/* Označi, da UI podpira obe temi – pomaga sistemskim UI elementom */}
          <meta name="color-scheme" content="dark light" />

          {/* Theme-color za PWA/Android – dinamično prek CSS var; svetla in temna */}
          <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
          <meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)" />

          {/* Prepreči "flash" napačne teme */}
          <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
        </Head>

        {/* Tema-odzivne barve ozadja in teksta; brez prisilnega dark */}
        <body className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white antialiased selection:bg-brand/20">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
