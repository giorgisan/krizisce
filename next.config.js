/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // velja za static iz /public (npr. /logos/*, /logo.png ...)
        source: '/:all*\\.(png|jpg|jpeg|gif|webp|avif|svg)$',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
