/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 🔴 Izklopi Next/Vercel Image Optimization za celoten projekt
  images: {
    unoptimized: true,
  },

  // ✅ Močan cache za statične slike iz /public
  async headers() {
    return [
      {
        source: '/:all*\\.(?:png|jpg|jpeg|gif|webp|avif|svg)$',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
