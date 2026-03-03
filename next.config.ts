import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['xlsx', '@prisma/client', 'prisma'],
};

export default nextConfig;
