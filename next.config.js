/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // enable image optimization; remote patterns for news sources and images.weserv
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.weserv.nl', pathname: '/**' },
      { protocol: 'https', hostname: 'img.rtvslo.si', pathname: '/**' },
      { protocol: 'https', hostname: 'www.24ur.com', pathname: '/**' },
      { protocol: 'https', hostname: 'siol.net', pathname: '/**' },
      { protocol: 'https', hostname: 'www.zurnal24.si', pathname: '/**' },
      { protocol: 'https', hostname: 'www.slovenskenovice.si', pathname: '/**' },
      { protocol: 'https', hostname: 'www.delo.si', pathname: '/**' },
      { protocol: 'https', hostname: 'n1info.si', pathname: '/**' },
      { protocol: 'https', hostname: 'novice.svet24.si', pathname: '/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:all*\\.(png|jpg|jpeg|gif|webp|avif|svg|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:all*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:all*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
