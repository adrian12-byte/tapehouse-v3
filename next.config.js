/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '60mb',
    },
  },
};

module.exports = nextConfig;
