/**
 * Seed V3 Boundary production pack into APP_DOCS for Publishing Desk Video links.
 * Optionally upserts the v3-build calendar card and points Phase 2 at the kickoff.
 * Run: node scripts/dev/_seed-v3-video-pack.mjs
 */
import { config } from "dotenv";
import fs from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });
const p = new PrismaClient();

const files = [
  {
    slug: "marketing-strategy/video-series/v3-kickoff-phase2-shotlist",
    path: "docs/marketing-strategy/video-series/v3-kickoff-phase2-shotlist.md",
  },
  {
    slug: "marketing-strategy/video-series/v3-production-script",
    path: "docs/marketing-strategy/video-series/v3-production-script.md",
  },
  {
    slug: "marketing-strategy/video-series/v3-the-boundary-production-form",
    path: "docs/marketing-strategy/video-series/v3-the-boundary-production-form.md",
  },
  {
    slug: "marketing-strategy/video-series/when-risk-enters-the-room",
    path: "docs/marketing-strategy/video-series/when-risk-enters-the-room.md",
  },
  {
    slug: "marketing-strategy/video-series/episode-scripts",
    path: "docs/marketing-strategy/video-series/episode-scripts.md",
  },
];

const KICKOFF_HREF =
  "/docs/marketing-strategy/video-series/v3-kickoff-phase2-shotlist";
const SYNOPSIS =
  "Generate Episode 3 (The Boundary / wrong client) refs + clips; pack at v3-kickoff-phase2-shotlist.";

for (const f of files) {
  const content = fs.readFileSync(resolve(process.cwd(), f.path), "utf8");
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || f.slug;
  await p.appDocument.upsert({
    where: { slug: f.slug },
    update: { title, content, readingLevel: "LEVEL_2", updatedAt: new Date() },
    create: { slug: f.slug, title, content, readingLevel: "LEVEL_2" },
  });
  console.log("upserted", f.slug, content.length);
}

const phase2 = await p.opsActivity.findFirst({
  where: { sourceRef: "video-series/when-risk-enters-the-room#phase-2" },
});
if (phase2) {
  await p.opsActivity.update({
    where: { id: phase2.id },
    data: {
      href: KICKOFF_HREF,
      notes: `${phase2.notes || ""}\n[2026-08-14] V3 Boundary production pack linked (kickoff + shots + form).`.trim(),
    },
  });
  console.log("phase2 href updated", phase2.id);
}

const v3Build = await p.opsActivity.findFirst({
  where: { sourceRef: "video-series/when-risk-enters-the-room#v3-build" },
});
if (!v3Build) {
  const created = await p.opsActivity.create({
    data: {
      title: "Video V3 — Build The Boundary",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: new Date("2026-08-22T18:00:00.000Z"),
      sourceRef: "video-series/when-risk-enters-the-room#v3-build",
      notes: SYNOPSIS,
      href: KICKOFF_HREF,
      nextActions: [
        "Open V3 kickoff — generate REF-ANALYST / AUDITOR / MSP-DESK / SHARED-UI / UI-BOUNDARY / ISOLATION-REPORT",
        "Generate shots 02–10 in order with locked refs",
        "Edit + captions + 9:16 cutdown before Sep 11 publish",
      ].join("\n"),
      priority: 18,
    },
  });
  console.log("created v3-build activity", created.id);
} else {
  await p.opsActivity.update({
    where: { id: v3Build.id },
    data: {
      href: KICKOFF_HREF,
      notes: SYNOPSIS,
    },
  });
  console.log("updated v3-build activity", v3Build.id);
}

await p.$disconnect();
