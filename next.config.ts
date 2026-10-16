import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['192.168.1.169', '192.168.5.156'],
};

export default nextConfig;
