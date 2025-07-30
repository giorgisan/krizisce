// pages/_document.tsx

import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html lang="sl">
        <Head>
          {/* Prikaz faviconov za vse brskalnike */}
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" href="/logo.png" />
          {/* Apple Touch Icon za iOS (180×180 px) */}
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

          <meta name="theme-color" content="#0f172a" />
          <meta name="msapplication-TileColor" content="#0f172a" />

          {/* Google Analytics – enoten ID */}
          <script async src="https://www.googletagmanager.com/gtag/js?id=G-5VVENQ6E2G"></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-5VVENQ6E2G');
              `,
            }}
          />
        </Head>
        <body className="bg-gray-900 text-white">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
