import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CORRECT: Move this outside the experimental block
  serverExternalPackages: ['@prisma/client', '@prisma/client-dmz'],
  experimental: {
    // Keep other experimental settings here if needed
  },
};

export default nextConfig;
