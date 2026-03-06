/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  basePath: '/agents/lit-matrix',
  experimental: {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
