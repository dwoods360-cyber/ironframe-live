import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  eslint: {
    // Re-enable strict verification loops during remote Vercel compilation.
    ignoreDuringBuilds: false,
  },
  experimental: {
    // Keep other experimental settings here if needed
  },
  webpack(config, { dev }) {
    // Windows dev: avoid PackFileCacheStrategy ENOENT when .next is cleared while `next dev` runs.
    if (dev && process.platform === "win32") {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
