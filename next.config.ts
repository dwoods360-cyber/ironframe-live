import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverExternalPackages: ['@prisma/client', '@prisma/client-dmz'],
  },
};

export default nextConfig;
