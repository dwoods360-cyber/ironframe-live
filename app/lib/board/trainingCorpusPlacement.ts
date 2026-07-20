import "server-only";

import fs from "node:fs";
import path from "node:path";

const MANIFEST_PATH = path.join(process.cwd(), "config", "training-corpus-manifest.json");

export type TrainingCorpusManifestSlice = {
  trainerPlacementTargets: string[];
  writerPlacementTargets: string[];
  chapterSlugs: string[];
};

let cached: TrainingCorpusManifestSlice | null = null;

/** Load training chapter slugs from config/training-corpus-manifest.json for documentation brief placement. */
export function loadTrainingCorpusPlacementTargets(): TrainingCorpusManifestSlice {
  if (cached) return cached;

  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  const manifest = JSON.parse(raw) as {
    chapters: Array<{ slug: string; authorAgent: string }>;
  };

  const chapterSlugs = manifest.chapters.map((c) => `${c.slug}.md`);
  const trainerPlacementTargets = [
    "user-manuals/design-partner-operator-packet.md",
    "user-manuals/quickstart.md",
    "user-manuals/get-started-workspace-setup.md",
    "user-manuals/audit-exports.md",
    "user-manuals/pilot-vs-preview.md",
    "user-manuals/dashboard-guide.md",
    "user-manuals/glossary.md",
    "training/LEVEL1-PARTNER-INDEX.md",
    "training/LEVEL1-STUDENT-INDEX.md",
    "training/LEVEL2-PRACTITIONER-INDEX.md",
    ...manifest.chapters
      .filter((c) => c.authorAgent === "board-trainer")
      .map((c) => `${c.slug}.md`),
  ];
  const writerPlacementTargets = [
    "technical/architecture-and-api.md",
    "technical/deployment-and-ops.md",
    "technical/security-and-compliance.md",
    ...manifest.chapters
      .filter((c) => c.authorAgent === "board-writer")
      .map((c) => `${c.slug}.md`),
  ];

  cached = {
    trainerPlacementTargets: [...new Set(trainerPlacementTargets)],
    writerPlacementTargets: [...new Set(writerPlacementTargets)],
    chapterSlugs,
  };
  return cached;
}
