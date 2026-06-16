import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    /** LangChain optional tracing peer — externalize to avoid corrupt vendor-chunks on Windows dev. */
    "@opentelemetry/api",
    "@langchain/core",
    "@langchain/langgraph",
    "@langchain/langgraph-checkpoint-postgres",
    "@langchain/google-genai",
    /** PDF/canvas peers pulled in via shared layout graph — prevent missing vendor-chunks in dev workers. */
    "html2canvas",
    "jspdf",
    "jspdf-autotable",
  ],
  /** Ensure markdown hub + docx protocol ship inside docs route lambdas on Vercel. */
  outputFileTracingIncludes: {
    "/governance-frame": ["./docs/published-briefings/**/*"],
    "/governance-frame/[slug]": ["./docs/published-briefings/**/*"],
    "/docs/[[...slug]]": ["./docs/**/*"],
    "/api/docs/download-protocol": ["./docs/**/*"],
    "/api/docs/download-matrix": ["./docs/**/*"],
    "/api/docs/hub-asset/[[...path]]": ["./docs/**/*.html"],
    /** GRC constitutional sentinel — dynamic fs reads are not auto-traced on Vercel. */
    "/api/grc/tas-fingerprint": ["./docs/TAS.md"],
    "/api/grc/tas-integrity": ["./docs/TAS.md"],
    "/api/grc/constitutional-restoration": [
      "./docs/TAS.md",
      "./storage/constitutional/TAS.md.gold",
    ],
  },
  async rewrites() {
    return [
      {
        source: "/docs/product/:file",
        destination: "/api/docs/hub-asset/product/:file",
      },
      {
        source: "/docs/support/:file",
        destination: "/api/docs/hub-asset/support/:file",
      },
      {
        source: "/docs/technical/:file",
        destination: "/api/docs/hub-asset/technical/:file",
      },
      {
        source: "/docs/training/:track/:file",
        destination: "/api/docs/hub-asset/training/:track/:file",
      },
    ];
  },
  eslint: {
    // Re-enable strict verification loops during remote Vercel compilation.
    ignoreDuringBuilds: false,
  },
  experimental: {
    // Keep other experimental settings here if needed
  },
  webpack(config, { dev }) {
    // Windows dev: avoid PackFileCacheStrategy ENOENT when .next is cleared while `next dev` runs.
    // Do NOT override server chunkFilename — Next webpack-runtime requires ./vendor-chunks/next.js.
    if (dev && process.platform === "win32") {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
