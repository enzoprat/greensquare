/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  experimental: {
    // Admin logo/photo uploads go through Server Actions; the default 1 MB body
    // limit rejects normal photos. Raise it well above the 10 Mo image cap.
    serverActions: { bodySizeLimit: '12mb' },
  },
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
