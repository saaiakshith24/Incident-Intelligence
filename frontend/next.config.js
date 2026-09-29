/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker standalone deployment (copies server.js + minimal deps)
  output: 'standalone',

  // Image optimization — unoptimized avoids needing a CDN for static exports
  images: {
    unoptimized: true,
  },

  // Suppress X-Powered-By header
  poweredByHeader: false,
};

module.exports = nextConfig;
