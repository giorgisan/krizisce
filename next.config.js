/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true }, // zagotovi, da ne uporabljamo Next/Vercel image optimizacije

  async headers() {
    return [
      // ✅ statične slike v /public (pravilni pattern – brez (?:...))
      {
        source: '/:all*\\.(png|jpg|jpeg|gif|webp|avif|svg|ico)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // ✅ fonts (če jih dodaš)
      {
        source: '/fonts/:all*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // ✅ Next build output
      {
        source: '/_next/static/:all*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}

module.exports = nextConfig
