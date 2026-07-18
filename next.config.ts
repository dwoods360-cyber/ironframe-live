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
    "/docs/[[...slug]]": ["./docs/**/*"],
    "/api/docs/download-protocol": ["./docs/**/*"],
    "/api/docs/download-matrix": ["./docs/**/*"],
    "/api/docs/hub-asset/[[...path]]": ["./docs/**/*.html"],
    /** Governance Frame research publication reads docs/governance-frame via fs. */
    "/gf-research": ["./docs/governance-frame/**/*", "./docs/published-briefings/**/*"],
    "/gf-research/research-papers": ["./docs/governance-frame/**/*"],
    "/gf-research/research-papers/[slug]": ["./docs/governance-frame/**/*"],
    "/gf-research/briefings": ["./docs/published-briefings/**/*"],
    "/gf-research/briefings/[slug]": ["./docs/published-briefings/**/*"],
    "/gf-research/newsletters": [
      "./docs/governance-frame/**/*",
      "./docs/published-briefings/**/*",
    ],
    "/gf-research/series": ["./docs/governance-frame/**/*"],
    "/gf-research/series/[seriesId]": ["./docs/governance-frame/**/*"],
    "/gf-research/methodology": ["./docs/governance-frame/**/*"],
    "/gf-research/editorial-standards": ["./docs/governance-frame/**/*"],
    "/gf-research/operating-outline": ["./docs/governance-frame/**/*"],
    "/gf-research/sources-and-corrections": ["./docs/governance-frame/**/*"],
    "/gf-research/about": ["./docs/governance-frame/**/*"],
    /**
     * Ops Hub Briefings/Newsletters read quarantine + published mirrors via fs.
     * Dynamic path.join(docsRoot, …) is not auto-traced on Vercel.
     */
    "/api/admin/operations-hub": [
      "./docs/**/*",
      "./public/rss.xml",
    ],
    "/api/admin/operations-hub/briefings/desk-run": [
      "./docs/TAS.md",
      "./docs/briefing-queue/**/*",
      "./docs/governance-frame/**/*",
    ],
    "/api/admin/operations-hub/briefings/promote": [
      "./docs/TAS.md",
      "./docs/briefing-queue/**/*",
      "./docs/published-briefings/**/*",
      "./docs/newsletters/**/*",
      "./public/rss.xml",
    ],
    "/api/admin/operations-hub/briefings/stage": [
      "./docs/TAS.md",
      "./docs/briefing-queue/**/*",
    ],
    "/api/admin/operations-hub/briefings/deny": [
      "./docs/TAS.md",
      "./docs/briefing-queue/**/*",
    ],
    "/api/admin/operations-hub/briefings/request": [
      "./docs/TAS.md",
      "./docs/briefing-queue/**/*",
    ],
    "/api/admin/operations-hub/newsletters/syndicate": [
      "./docs/TAS.md",
      "./docs/published-briefings/**/*",
      "./docs/newsletters/**/*",
      "./public/rss.xml",
    ],
    "/api/admin/operations-hub/newsletters/request": [
      "./docs/TAS.md",
      "./docs/briefing-queue/**/*",
    ],
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
      /** Legacy hub HTML only — markdown slugs under /docs/* stay on the reader route. */
      {
        source: "/docs/product/:file.html",
        destination: "/api/docs/hub-asset/product/:file.html",
      },
      {
        source: "/docs/support/:file.html",
        destination: "/api/docs/hub-asset/support/:file.html",
      },
      {
        source: "/docs/technical/:file.html",
        destination: "/api/docs/hub-asset/technical/:file.html",
      },
      {
        source: "/docs/training/:track/:file.html",
        destination: "/api/docs/hub-asset/training/:track/:file.html",
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
