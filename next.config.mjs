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
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
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
        destination: 'http://arca-spark-whisper-stt.eastus.azurecontainer.io:5005/:path*',
      },
    ];
  },
};

export default nextConfig;
