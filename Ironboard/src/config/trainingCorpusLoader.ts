import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type TrainingChapterManifestEntry = {
  slug: string;
  title: string;
  track: "LEVEL_1" | "LEVEL_2";
  authorAgent: "board-trainer" | "board-writer";
  primaryRoute: string;
  captureRoute: string;
  screenshotFile: string;
  featureIds: string[];
  navigationPath: string[];
  sourceAnchors: string[];
};

export type TrainingCorpusManifest = {
  version: string;
  targetPageCount: number;
  wordsPerPage: number;
  minTotalWords: number;
  chapterTargetWords: number;
  screenshotBasePath: string;
  chapters: TrainingChapterManifestEntry[];
};

const MANIFEST_RELATIVE = path.join("config", "training-corpus-manifest.json");

function resolveManifestPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fromIronboardSrc = path.resolve(here, "..", "..", "..", MANIFEST_RELATIVE);
  if (fs.existsSync(fromIronboardSrc)) return fromIronboardSrc;
  return path.resolve(process.cwd(), MANIFEST_RELATIVE);
}

let cachedManifest: TrainingCorpusManifest | null = null;

export function loadTrainingCorpusManifest(): TrainingCorpusManifest {
  if (cachedManifest) return cachedManifest;
  const manifestPath = resolveManifestPath();
  const raw = fs.readFileSync(manifestPath, "utf8");
  cachedManifest = JSON.parse(raw) as TrainingCorpusManifest;
  return cachedManifest;
}

export function getTrainerChapterSlugs(manifest = loadTrainingCorpusManifest()): string[] {
  return manifest.chapters.filter((c) => c.authorAgent === "board-trainer").map((c) => c.slug);
}

export function getWriterChapterSlugs(manifest = loadTrainingCorpusManifest()): string[] {
  return manifest.chapters.filter((c) => c.authorAgent === "board-writer").map((c) => c.slug);
}

export function getChapterBySlug(
  slug: string,
  manifest = loadTrainingCorpusManifest(),
): TrainingChapterManifestEntry | undefined {
  const normalized = slug.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.md$/i, "").toLowerCase();
  return manifest.chapters.find((c) => c.slug.toLowerCase() === normalized);
}

export function screenshotPublicPath(
  chapter: TrainingChapterManifestEntry,
  manifest = loadTrainingCorpusManifest(),
): string {
  return `${manifest.screenshotBasePath}/${chapter.screenshotFile}`;
}
