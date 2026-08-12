/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Enable standalone output for Docker
  output: 'standalone',
  // ✅ App hosted under /spark subpath
  basePath: '/spark',
  skipTrailingSlashRedirect: true,

  // ✅ Enable experimental features for cookie handling
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // ✅ Configure headers for CORS and cookies
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-API-KEY' },
        ],
      },
    ];
  },

  // ✅ Proxy whisper requests (backend goes through API route for long timeout support)
  async rewrites() {
    return [
      {
        source: '/api/whisper/:path*',
        destination: 'http://192.168.112.6:30472/:path*',
      },
    ];
  },
};

export default nextConfig;
