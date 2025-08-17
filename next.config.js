// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // dovolimo vse domene (ali pa nastaviš točno določene npr. 'www.24ur.com')
      },
    ],
  },
}
