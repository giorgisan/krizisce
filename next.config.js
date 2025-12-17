/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // --- GLAVNO STIKALO ZA IZKLOP VERCEL OPTIMIZACIJE ---
    // S tem preprečimo, da Vercel procesira slike in ti nabija limite.
    // Slike bo serviral direktno Weserv (proxy), kar je hitro in zastonj.
    unoptimized: true, 
    
    // Ker smo izklopili optimizacijo, 'domains' in 'remotePatterns' 
    // niso več strogo nujni, a jih pustimo, če bi kdaj preklopil nazaj.
    domains: ['images.weserv.nl'],  
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
  // Cache headerji za statične datoteke (ostanejo enako)
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
