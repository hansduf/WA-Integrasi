/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Allow ngrok domains for development
  allowedDevOrigins: [
    'https://02d900e8f817.ngrok-free.app',
    'https://ea0f4c8470aa.ngrok-free.app'
  ],
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001';
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
