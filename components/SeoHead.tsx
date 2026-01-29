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
  // Uporabljamo tvojo naloženo datoteko og-default.JPG
  image = 'og-default.JPG',
  jsonLd,
}: Props) {
  const fullTitle = title === 'Križišče' ? 'Križišče' : `${title} · Križišče`
  
  // Sestavimo polno pot do slike za socialna omrežja
  const ogImage = image.startsWith('http') ? image : new URL(image, url).toString()

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
      logo: new URL('/logo.png', url).toString(),
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <Head>
      {/* Osnovni Meta podatki */}
      <title>{fullTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <link rel="canonical" href={url} />
      <meta name="description" content={description} />
      <meta name="theme-color" content="#ffffff" />

      {/* Favicons & Manifest (povezano s tvojimi datotekami v public/) */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Križišče" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Križišče – agregator novic" />
      <meta property="og:locale" content="sl_SI" />

      {/* Twitter kartica */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD za Google Search Console */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd ?? fallbackJsonLd) }}
      />

      {/* Performance optimizacije */}
      {/* Preload logotipa, ki se pojavi takoj v Headerju */}
      <link rel="preload" href="/logo.png" as="image" />

      {/* Hitrejša povezava do CDN-ja za slike */}
      <link rel="preconnect" href="https://images.weserv.nl" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://images.weserv.nl" />

      {/* Varnost in Referrer */}
      <meta name="referrer" content="strict-origin-when-cross-origin" />
    </Head>
  )
}
