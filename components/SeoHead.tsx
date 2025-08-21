// components/SeoHead.tsx
import Head from 'next/head'

type Props = {
  /** Page title. Če je različen od "Križišče", bo renderirano "Naslov · Križišče". */
  title?: string
  /** Opis strani (meta description + OG/Twitter). */
  description?: string
  /** Absolutni URL strani (za <link rel="canonical"> in og:url). */
  url?: string
  /** OG slika; lahko relativna (/logos/default-news.jpg) ali absolutna. */
  image?: string
  /** Po želji lahko prepišeš JSON‑LD. Če ga ne podaš, nastavimo WebSite. */
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

      {/* Description */}
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

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON‑LD (po potrebi prepišeš prek props.jsonLd) */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd ?? fallbackJsonLd),
        }}
      />
    </Head>
  )
}
