import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['graphql'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Workaround since we diverged from Keystone reltionship and document views
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // FitFront's catalog assets are checked into public/images. The Vercel
    // multi-service output does not expose Next's image optimizer route, so
    // serve these already-optimized assets directly instead of generating
    // broken /_next/image URLs.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.S3_ENDPOINT ? process.env.S3_ENDPOINT.replace(/^https?:\/\//, '').replace(/:\d+$/, '') : '/',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
