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
  // POPRAVEK: Tukaj smo zamenjali staro pot z novo datoteko, ki si jo naložil.
  // Pazimo na točen zapis končnice (.JPG), kot je na sliki.
  image = 'og-default.JPG',
  jsonLd,
}: Props) {
  const fullTitle = title === 'Križišče' ? 'Križišče' : `${title} · Križišče`
  
  // Logika: če je slika absolutni URL (http...), jo uporabi, 
  // sicer jo sestavi z osnovnim URL-jem (https://krizisce.si/og-default.JPG)
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
      // Preveri, če imaš logotip še vedno v mapi 'logos' ali v rootu public. 
      // Glede na tvoj screenshot imaš zdaj 'logo.png' direktno v public mapi,
      // zato sem tukaj popravil pot na '/logo.png'.
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
      <meta property="og:image:alt" content="Križišče – predogledna slika" />
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

      {/* Preload logotipa v headerju */}
      <link rel="preload" href="/logo.png" as="image" />

      {/* Preconnect na image CDN za hitrejši prvi handshake */}
      <link rel="preconnect" href="https://images.weserv.nl" crossOrigin="anonymous" />
      {/* Dodatno: DNS-prefetch */}
      <link rel="dns-prefetch" href="https://images.weserv.nl" />

      {/* Globalna politika pošiljanja Referrer-ja */}
      <meta name="referrer" content="strict-origin-when-cross-origin" />
    </Head>
  )
}
