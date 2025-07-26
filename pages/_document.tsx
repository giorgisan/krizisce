// pages/_document.tsx

import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="sl">
        <Head>
          {/* Favicon */}
          <link rel="icon" type="image/png" href="/favikn.png" />

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
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
