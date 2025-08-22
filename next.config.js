/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Ugasne Vercel/Next image optimization globalno
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
