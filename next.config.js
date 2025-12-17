/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // --- GLAVNO STIKALO: IZKLOP VERCEL OPTIMIZACIJE ---
    // Slike se ne bodo procesirale na Vercelu. Limitov ne boš več tikeal.
    unoptimized: true, 
    
    // Seznam domen (za varnost), čeprav pri unoptimized ni strogo nujen
    remotePatterns: [
      { protocol: 'https', hostname: 'images.weserv.nl' },
      { protocol: 'https', hostname: '**.rtvslo.si' },
      { protocol: 'https', hostname: '**.rtvcdn.si' },
      { protocol: 'https', hostname: '**.24ur.com' },
      { protocol: 'https', hostname: '**.siol.net' },
      { protocol: 'https', hostname: '**.zurnal24.si' },
      { protocol: 'https', hostname: '**.slovenskenovice.si' },
      { protocol: 'https', hostname: '**.delo.si' },
      { protocol: 'https', hostname: '**.n1info.si' },
      { protocol: 'https', hostname: '**.svet24.si' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:all*\\.(png|jpg|jpeg|gif|webp|avif|svg|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/fonts/:all*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/:all*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
