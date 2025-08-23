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
    // Supabase host (če obstaja)
    const supabaseHost =
      process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : ''

    return (
      <Html lang="sl" suppressHydrationWarning>
        <Head>
          {/* Favicons / ikone */}
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" href="/logos/logo.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/logos/apple-touch-icon.png" />

          {/* Viewport + referrer policy */}
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <meta name="referrer" content="strict-origin-when-cross-origin" />

          {/* UI: dark & light; theme-color za oba načina (brez dodatnega v SeoHead) */}
          <meta name="color-scheme" content="dark light" />
          <meta name="theme-color" content="#0d0d0d" media="(prefers-color-scheme: dark)" />
          <meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)" />

          {/* DNS prefetch omogoči globalno */}
          <meta httpEquiv="x-dns-prefetch-control" content="on" />

          {/* --- Performance warmup --- */}
          {/* Image proxy (za srcset proxy) */}
          <link rel="dns-prefetch" href="//images.weserv.nl" />
          <link rel="preconnect" href="https://images.weserv.nl" crossOrigin="" />

          {/* Najpogostejši viri (hitrejši DNS/TLS) – po potrebi dodaj/odstrani */}
          <link rel="dns-prefetch" href="//www.rtvslo.si" />
          <link rel="dns-prefetch" href="//www.24ur.com" />
          <link rel="dns-prefetch" href="//www.delo.si" />
          <link rel="dns-prefetch" href="//www.siol.net" />
          <link rel="dns-prefetch" href="//www.zurnal24.si" />

          {/* Supabase (če ga uporabljaš) */}
          {supabaseHost && (
            <>
              <link rel="dns-prefetch" href={`//${supabaseHost}`} />
              <link rel="preconnect" href={`https://${supabaseHost}`} crossOrigin="anonymous" />
            </>
          )}

          {/* Google Tag Manager / Analytics (če uporabljaš) */}
          <link rel="dns-prefetch" href="//www.googletagmanager.com" />
          <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="//www.google-analytics.com" />
          <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />

          {/* Google Fonts (če jih kdaj dodaš) */}
          <link rel="dns-prefetch" href="//fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="dns-prefetch" href="//fonts.gstatic.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

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
