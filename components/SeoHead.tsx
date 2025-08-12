// components/SeoHead.tsx
import Head from 'next/head'

type Props = {
  title?: string
  description?: string
  url?: string
  image?: string
  jsonLd?: object
}

export default function SeoHead({
  title = 'Križišče – Najnovejše novice slovenskih medijev',
  description = 'Agregator najnovejših novic iz slovenskih medijev. Članki so last izvornih portalov.',
  url = 'https://krizisce.si/',
  image = 'https://krizisce.si/og-image.png',
  jsonLd,
}: Props) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={description} />
      <meta name="theme-color" content="#0d0d0d" />

      {/* Open Graph / Twitter */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </Head>
  )
}
