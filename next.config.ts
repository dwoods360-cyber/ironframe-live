import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', '@prisma/client-dmz'],
  experimental: {
    // Keep any other actual experimental flags here
  },
};

export default nextConfig;
