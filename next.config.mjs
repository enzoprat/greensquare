/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'mondialfood.fr' },
      { protocol: 'https', hostname: '**.mondialfood.fr' },
      { protocol: 'https', hostname: 'green-square.eu' },
    ],
  },
};

export default nextConfig;
