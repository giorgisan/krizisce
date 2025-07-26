// pages/_document.tsx

import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="sl">
        <Head>
          {/* Favicon */}
          <link rel="icon" type="image/png" href="/favikn-v2.png" />
          <link rel="apple-touch-icon" href="/favikn-v2.png" />
          <meta name="theme-color" content="#0f172a" />

          {/* Google Analytics */}
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
    );
  }
}

export default MyDocument;
