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

function toAbsolute(input: string, base: string) {
  try {
    // Podpira relativne in absolutne poti
    return new URL(input, base).toString()
  } catch {
    return input
  }
}

export default function SeoHead({
  title = 'Križišče',
  description = 'Agregator najnovejših novic iz slovenskih medijev. Članki so last izvornih portalov.',
  url = 'https://krizisce.si/',
  image = 'logos/logo.png', // ohranimo tvoj privzet image
  jsonLd,
}: Props) {
  const fullTitle = title === 'Križišče' ? 'Križišče' : `${title} · Križišče`
  const canonical = toAbsolute(url, url)
  const ogImage = toAbsolute(image, url)

  const fallbackJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Križišče',
    alternateName: 'krizisce.si',
    url: canonical,
    description,
    publisher: {
      '@type': 'Organization',
      name: 'Križišče',
      url: canonical,
      logo: toAbsolute('/logos/logo.png', canonical),
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${canonical}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <Head>
      {/* Osnovno */}
      <title>{fullTitle}</title>
      <link rel="canonical" href={canonical} />

      {/* Varni “perf” namigi – globalno pomagajo nalaganju */}
      <meta httpEquiv="x-dns-prefetch-control" content="on" />
      <link rel="dns-prefetch" href="https://images.weserv.nl" />
      <link rel="preconnect" href="https://images.weserv.nl" crossOrigin="anonymous" />

      {/* Uporabno za mobilne UX barve in pravilno skaliranje */}
      <meta name="theme-color" content="#111827" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      {/* Meta opis */}
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Križišče" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
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

      {/* Preload logotipa v headerju (ohranjam tvoj asset) */}
      <link rel="preload" href="/logo.png" as="image" />
    </Head>
  )
}
