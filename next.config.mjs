/** @type {import('next').NextConfig} */
const nextConfig = {
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
  
  // ✅ Proxy backend requests to avoid cross-origin cookie issues
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'https://emr-lite-core-gkfqhyd6crf4bne6.z03.azurefd.net/:path*',
      },
      {
        source: '/api/whisper/:path*',
        destination: 'https://whisper-stt-fjbfhxeyhwerhuab.z03.azurefd.net/:path*',
      },
    ];
  },
};

export default nextConfig;
