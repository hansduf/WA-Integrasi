/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove experimental.appDir - it's default in Next.js 14
  // Allow ngrok domains for development
  allowedDevOrigins: [
    'https://02d900e8f817.ngrok-free.app',
    'https://ea0f4c8470aa.ngrok-free.app'
  ],
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
    ];
  },
};

module.exports = nextConfig;
