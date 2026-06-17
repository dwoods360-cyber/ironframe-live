#!/usr/bin/env npx tsx
/**
 * Human promotion gate: briefing-queue → published-briefings.
 * Usage:
 *   npx tsx scripts/promote-briefing-draft.ts --file 2026-06-17-draft-medshield.md --slug 2026-06-17-medshield-review
 *   npx tsx scripts/promote-briefing-draft.ts --file draft.md --slug my-briefing --operator "j.doe@corp.example"
 */
import fs from "fs";
import path from "path";

import { validateBriefingQueueDraft } from "../app/lib/governanceFrame/briefingDraftValidation";

const BRIEFING_QUEUE_DIR = "briefing-queue";
const PUBLISHED_BRIEFINGS_DIR = "published-briefings";

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

function resolveDocsRoot(): string {
  const candidates = [
    path.join(process.cwd(), "docs"),
    path.join(process.cwd(), "..", "docs"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "TAS.md"))) return dir;
  }
  return candidates[0];
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const file = args.file?.trim();
  const slug = args.slug?.trim().toLowerCase();
  const operator = args.operator?.trim() || process.env.USER || process.env.USERNAME || "unknown-operator";

  if (!file || !slug) {
    console.error("Usage: --file <queue-filename.md> --slug <published-slug> [--operator name]");
    process.exit(1);
  }

  if (slug.includes("..") || slug.includes("/") || !/^[a-z0-9-]+$/.test(slug)) {
    console.error("Invalid slug — use lowercase letters, digits, and hyphens only.");
    process.exit(1);
  }

  const docsRoot = resolveDocsRoot();
  const queuePath = path.join(docsRoot, BRIEFING_QUEUE_DIR, file);
  const publishedDir = path.join(docsRoot, PUBLISHED_BRIEFINGS_DIR);
  const targetPath = path.join(publishedDir, `${slug}.md`);

  if (!fs.existsSync(queuePath)) {
    console.error(`Queue draft not found: ${queuePath}`);
    process.exit(1);
  }

  const markdown = fs.readFileSync(queuePath, "utf-8");
  const validation = validateBriefingQueueDraft(file, markdown, { promotion: true });

  for (const issue of validation.issues) {
    const prefix = issue.severity === "error" ? "ERROR" : "WARN";
    console.log(`[${prefix}] ${issue.code}: ${issue.message}`);
  }

  if (!validation.ok) {
    console.error("Promotion blocked — fix errors and re-run.");
    process.exit(1);
  }

  fs.mkdirSync(publishedDir, { recursive: true });
  if (fs.existsSync(targetPath)) {
    console.error(`Published slug already exists: ${targetPath}`);
    process.exit(1);
  }

  fs.copyFileSync(queuePath, targetPath);

  const auditLine = JSON.stringify({
    event: "BRIEFING_PROMOTED",
    at: new Date().toISOString(),
    operator,
    sourceQueueFile: file,
    publishedSlug: slug,
    targetPath: path.relative(process.cwd(), targetPath),
  });
  console.log(`[AUDIT] ${auditLine}`);
  console.log(`Promoted → ${targetPath}`);
}

main();
