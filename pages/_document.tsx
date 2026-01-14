// pages/_document.tsx

import Document, { Html, Head, Main, NextScript } from 'next/document'

/**
 * Prepreči "flash" napačne teme pred hydratacijo (FOUC).
 * Trenutno nastavljeno, da preferira 'dark' (|| true), če uporabnik nima nastavitve.
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
    // Supabase host za optimizacijo povezave
    const supabaseHost =
      process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : ''

    return (
      <Html lang="sl" className="scroll-smooth" suppressHydrationWarning>
        <Head>
          {/* --- Favicons / Ikone --- */}
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" href="/logos/logo.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/logos/apple-touch-icon.png" />

          {/* --- Meta & PWA --- */}
          <meta name="referrer" content="strict-origin-when-cross-origin" />
          <meta name="color-scheme" content="dark light" />
          <meta name="theme-color" content="#0d0d0d" media="(prefers-color-scheme: dark)" />
          <meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)" />

          {/* --- Performance: DNS Prefetch & Preconnect --- */}
          <meta httpEquiv="x-dns-prefetch-control" content="on" />

          {/* 1. Weserv (Slike) - KLJUČNO za hitrost slik */}
          <link rel="dns-prefetch" href="//images.weserv.nl" />
          <link rel="preconnect" href="https://images.weserv.nl" crossOrigin="" />

          {/* 2. Supabase (Baza) */}
          {supabaseHost && (
            <>
              <link rel="dns-prefetch" href={`//${supabaseHost}`} />
              <link rel="preconnect" href={`https://${supabaseHost}`} crossOrigin="anonymous" />
            </>
          )}

          {/* 3. Najpogostejši slovenski mediji (DNS warmup za hitrejše klike na povezave) */}
          <link rel="dns-prefetch" href="//www.rtvslo.si" />
          <link rel="dns-prefetch" href="//www.24ur.com" />
          <link rel="dns-prefetch" href="//www.delo.si" />
          <link rel="dns-prefetch" href="//www.siol.net" />
          <link rel="dns-prefetch" href="//www.zurnal24.si" />
          <link rel="dns-prefetch" href="//www.slovenskenovice.si" />
          <link rel="dns-prefetch" href="//n1info.si" />

          {/* --- Opomba: Google Analytics in Fonts so odstranjeni za boljšo zasebnost --- */}

          {/* Skripta za temo (mora biti v Head, da se izvede pred renderjem bodyja) */}
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
