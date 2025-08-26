/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // enable image optimization; remote patterns for news sources and images.weserv
  images: {
    // Allow images from all subdomains of media sources. Without these patterns Next.js
    // blocks remote images from unknown subdomains which causes many missing images.
    remotePatterns: [
      { protocol: 'https', hostname: '**.rtvslo.si' },
      { protocol: 'https', hostname: '**.24ur.com' },
      { protocol: 'https', hostname: '**.siol.net' },
      { protocol: 'https', hostname: '**.zurnal24.si' },
      { protocol: 'https', hostname: '**.slovenskenovice.si' },
      { protocol: 'https', hostname: '**.delo.si' },
      { protocol: 'https', hostname: '**.n1info.si' },
      { protocol: 'https', hostname: '**.svet24.si' },
      // keep weserv proxy for thumbnails/preloads if needed
      { protocol: 'https', hostname: 'images.weserv.nl' },
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
