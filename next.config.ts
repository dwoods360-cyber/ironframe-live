import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    // Keep other experimental settings here if needed
  },
};

export default nextConfig;
