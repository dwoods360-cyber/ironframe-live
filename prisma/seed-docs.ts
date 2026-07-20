import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { inferReadingLevelFromSlug, inferTitleFromMarkdown } from "../lib/appDocumentSlug";
import { loadOperatorQuickstartMarkdown } from "../lib/onboarding/loadOperatorQuickstartFromRepo";
import { assertOperatorPostAuthMarkdown } from "../lib/onboarding/onboardingContentPolicy";
import { sanitizeAppDocumentContent } from "../lib/appDocumentSanitizer";

const prisma = new PrismaClient();

const masterDocuments = [
  {
    slug: "readme",
    title: "Ironframe GRC Platform — Master Documentation Center",
    readingLevel: "LEVEL_1",
    content: `# 🏛️ Ironframe GRC Platform — Master Documentation Center

Welcome to the central documentation depository for the Ironframe Governance, Risk, and Compliance platform (v0.1.0-ga-epic17).

## Active Workspace Topography
- Design partner packet: Navigate via /docs/user-manuals/design-partner-operator-packet
- Level 1 User Manuals: Navigate via /docs/user-manuals/quickstart
- Partner training (curated): Navigate via /docs/training/LEVEL1-PARTNER-INDEX
- Level 2 Technical Specs: Navigate via /docs/technical/architecture-and-api
- Security & Compliance: Navigate via /docs/technical/security-and-compliance
- Classroom training (instructors): Navigate via /docs/training/LEVEL1-STUDENT-INDEX

## System Operational Posture
- Platform Version: v0.1.0-ga-epic17 (June 2026)
- Public Registrations: Disabled (Sales-Assisted Mode Active)
- Encryption Standards: AES-256-GCM + Epic 11 Supervisor Verification Layer`,
  },
  {
    slug: "user-manuals/quickstart",
    title: "Command Post Orientation",
    readingLevel: "LEVEL_1",
    content: loadOperatorQuickstartMarkdown(),
  },
  {
    slug: "technical/architecture-and-api",
    title: "System Architecture & API Specification Matrix",
    readingLevel: "LEVEL_2",
    content: `# 🏛️ System Architecture & API Specification (Level 2)

Detailed technical overview of the decoupled multi-port topology and multi-agent coordination pipelines.

## 🧩 1. Ingress Boundary Limits
- Core Application Host: Next.js 15.1.6 Engine running on Port 3000
- Agent Coordination Host: LangGraph.js Engine running on Port 8082
- Financial Constraints: Floating-point tracking is strictly forbidden. Currency calculations are stored exclusively as BigInt whole cents.

## 📡 2. Real-Time Telemetry Interface
- Route: POST /api/sustainability/ironbloom
- Gating: Session Context Token + Bearer Token Validation Ingress
- Input Type: Enforces physical constraints (e.g., "5000 kWh", "450 L"). Monetary-only values are automatically rejected.`,
  },
] as const;

/** Filesystem-backed canonical rows — guaranteed before full corpus walk. */
const fileMasterDocumentSources = [
  "user-manuals/design-partner-operator-packet.md",
  "user-manuals/get-started-workspace-setup.md",
  "user-manuals/audit-exports.md",
  "user-manuals/pilot-vs-preview.md",
  "training/LEVEL1-PARTNER-INDEX.md",
  "technical/security-and-compliance.md",
] as const;

function loadFileMasterDocument(relativePath: string) {
  const absolute = path.join(process.cwd(), "docs", relativePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Missing canonical master document source: docs/${relativePath}`);
  }

  const raw = fs.readFileSync(absolute, "utf8");
  const slug = relativePath.replace(/\\/g, "/").replace(/\.md$/i, "").toLowerCase();

  return {
    slug,
    title: inferTitleFromMarkdown(raw, slug),
    content: sanitizeAppDocumentContent(raw),
    readingLevel: inferReadingLevelFromSlug(slug),
  };
}

async function seedMasterDocuments(): Promise<void> {
  console.log("🚀 Initializing canonical master handbook seeding pass...");

  const operatorQuickstart = loadOperatorQuickstartMarkdown();
  assertOperatorPostAuthMarkdown(operatorQuickstart, "docs/user-manuals/quickstart.md");

  const fileMasters = fileMasterDocumentSources.map((relativePath) =>
    loadFileMasterDocument(relativePath),
  );
  for (const master of fileMasters) {
    if (master.slug.startsWith("user-manuals/") || master.slug.startsWith("training/")) {
      assertOperatorPostAuthMarkdown(master.content, `docs/${master.slug}.md`);
    }
  }
  const allMasters = [
    ...masterDocuments.map((doc) =>
      doc.slug === "user-manuals/quickstart" ? { ...doc, content: operatorQuickstart } : doc,
    ),
    ...fileMasters,
  ];

  for (const doc of allMasters) {
    const record = await prisma.appDocument.upsert({
      where: { slug: doc.slug },
      update: {
        title: doc.title,
        content: doc.content,
        readingLevel: doc.readingLevel,
        updatedAt: new Date(),
      },
      create: {
        slug: doc.slug,
        title: doc.title,
        content: doc.content,
        readingLevel: doc.readingLevel,
      },
    });
    console.log(`📡 Successfully seeded target documentation slug row: [${record.slug}]`);
  }
}

async function seedFullCorpusFromFilesystem(): Promise<void> {
  console.log("📚 Running full APP_DOCS corpus seed from docs/ ...");
  execSync("npx tsx scripts/seed-app-documents.ts", {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });
}

async function main() {
  await seedMasterDocuments();
  await seedFullCorpusFromFilesystem();
  console.log("🏁 Database document seeding completed successfully.");
}

main()
  .catch((error) => {
    console.error("❌ Critical exception flagged during database seeding:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
