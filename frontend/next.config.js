/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production output mode
  output: 'standalone',
  // Allow ngrok domains for development
  // Note: allowedDevOrigins is not a valid Next.js config option, removed
  async rewrites() {
    // Get backend URL from build argument (set via Docker ARG)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('NEXT_PUBLIC_BACKEND_URL is required (set via Docker build args)');
    }
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
