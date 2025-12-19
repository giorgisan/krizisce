// pages/_document.tsx

import Document, { Html, Head, Main, NextScript } from 'next/document'

/**
 * Prepreči "flash" napačne teme pred hydratacijo
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
    // Supabase host (če obstaja)
    const supabaseHost =
      process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : ''

    return (
      // Dodan 'scroll-smooth' za lepše premikanje po strani
      <Html lang="sl" className="scroll-smooth" suppressHydrationWarning>
        <Head>
          {/* Favicons / ikone */}
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" href="/logos/logo.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/logos/apple-touch-icon.png" />

          {/* Referrer policy */}
          <meta name="referrer" content="strict-origin-when-cross-origin" />

          {/* UI colors */}
          <meta name="color-scheme" content="dark light" />
          <meta name="theme-color" content="#0d0d0d" media="(prefers-color-scheme: dark)" />
          <meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)" />

          {/* DNS prefetch */}
          <meta httpEquiv="x-dns-prefetch-control" content="on" />

          {/* --- Performance warmup --- */}
          <link rel="dns-prefetch" href="//images.weserv.nl" />
          <link rel="preconnect" href="https://images.weserv.nl" crossOrigin="" />

          {/* Najpogostejši viri */}
          <link rel="dns-prefetch" href="//www.rtvslo.si" />
          <link rel="dns-prefetch" href="//www.24ur.com" />
          <link rel="dns-prefetch" href="//www.delo.si" />
          <link rel="dns-prefetch" href="//www.siol.net" />
          <link rel="dns-prefetch" href="//www.zurnal24.si" />

          {/* Supabase */}
          {supabaseHost && (
            <>
              <link rel="dns-prefetch" href={`//${supabaseHost}`} />
              <link rel="preconnect" href={`https://${supabaseHost}`} crossOrigin="anonymous" />
            </>
          )}

          {/* Google Analytics / Tag Manager */}
          <link rel="dns-prefetch" href="//www.googletagmanager.com" />
          <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="//www.google-analytics.com" />
          <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />

          {/* Fonts preconnect */}
          <link rel="dns-prefetch" href="//fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="dns-prefetch" href="//fonts.gstatic.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

          {/* Prepreči FOUC teme */}
          <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
        </Head>
        
        {/* Classes usklajeni z _app.tsx */}
        <body className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white antialiased selection:bg-brand/20">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
