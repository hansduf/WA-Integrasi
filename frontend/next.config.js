/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production output mode
  output: 'standalone',
  // Allow ngrok domains for development
  // Note: allowedDevOrigins is not a valid Next.js config option, removed
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/pi/:path*',
        destination: `${backendUrl}/pi/:path*`,
      },
      {
        source: '/whatsapp/:path*',
        destination: `${backendUrl}/whatsapp/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
