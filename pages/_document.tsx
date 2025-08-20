// pages/_document.tsx
import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html lang="sl">
        <Head>
          {/* Favicone */}
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" href="/logo.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

          {/* Barve UI */}
          <meta name="theme-color" content="#0f172a" />
          <meta name="msapplication-TileColor" content="#0f172a" />
        </Head>
        {/* Osnovno dark ozadje; ThemeProvider bo dodal/odstranil .dark na <html> */}
        <body className="bg-gray-900 text-white antialiased">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
