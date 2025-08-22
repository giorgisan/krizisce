// components/SeoHead.tsx
import Head from 'next/head'

type Props = {
  /** Če ni "Križišče", bo izpisano "Naslov · Križišče" */
  title?: string
  description?: string
  url?: string
  /** Relativna ali absolutna pot do OG slike */
  image?: string
  jsonLd?: object
}

export default function SeoHead({
  title = 'Križišče',
  description = 'Agregator najnovejših novic iz slovenskih medijev. Članki so last izvornih portalov.',
  url = 'https://krizisce.si/',
  image = '/logos/default-news.jpg',
  jsonLd,
}: Props) {
  const fullTitle = title === 'Križišče' ? 'Križišče' : `${title} · Križišče`
  const ogImage = image.startsWith('http') ? image : new URL(image, url).toString()

  // preconnect na Supabase, če obstaja env
  const supabaseHost = (() => {
    try {
      const u = process.env.NEXT_PUBLIC_SUPABASE_URL
      return u ? new URL(u).hostname : ''
    } catch {
      return ''
    }
  })()

  const fallbackJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Križišče',
    alternateName: 'krizisce.si',
    url,
    description,
    publisher: {
      '@type': 'Organization',
      name: 'Križišče',
      url,
      logo: new URL('/logos/logo.png', url).toString(),
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <Head>
      {/* Title + canonical */}
      <title>{fullTitle}</title>
      <link rel="canonical" href={url} />

      {/* Meta description */}
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Križišče" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="sl_SI" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd ?? fallbackJsonLd) }}
      />

      {/* ---- Performance add-ons (varno) ---- */}
      {/* DNS prefetch omogoči */}
      <meta httpEquiv="x-dns-prefetch-control" content="on" />

      {/* Supabase (če ga uporabljaš za /api/click ipd.) */}
      {supabaseHost && (
        <>
          <link rel="dns-prefetch" href={`//${supabaseHost}`} />
          <link rel="preconnect" href={`https://${supabaseHost}`} crossOrigin="anonymous" />
        </>
      )}

      {/* Google Tag Manager / Analytics (imaš GTM snippet) */}
      <link rel="dns-prefetch" href="//www.googletagmanager.com" />
      <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="//www.google-analytics.com" />
      <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />

      {/* Google Fonts (če jih uporabljaš; harmless, če ne) */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/* Preload logotipa, ki je v headerju */}
      <link rel="preload" href="/logo.png" as="image" />

      {/* Barva naslovne vrstice na mobilnih napravah */}
      <meta name="theme-color" content="#0d0d0d" />
      <meta name="color-scheme" content="light dark" />
    </Head>
  )
}
