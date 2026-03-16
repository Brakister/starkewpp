/** @type {import('next').NextConfig} */
const nextConfig = {
  // Habilita o instrumentation.ts (necessário para Socket.io + Baileys)
  experimental: {
    instrumentationHook: true,
  },
  images: {
    domains: ['graph.facebook.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
