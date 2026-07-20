#!/usr/bin/env npx tsx
/**
 * Build payload, replace Master Manuscript, then verify live title text.
 */
import fs from "fs";
import path from "path";

import { authorizeGoogle } from "./google-auth";
import { buildDocsPayload, writeParsedDocument } from "./docs-formatting";
import { parseGovernanceMarkdown } from "./markdown-parser";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const MANUSCRIPT = path.join(
  REPO_ROOT,
  "docs/governance-frame/research-papers/GF-2026-001-evolution-of-grc/manuscript.md",
);
const STATE_FILE = path.join(__dirname, ".state/GF-2026-001.json");
const EXPECTED =
  "The Evolution of Governance, Risk, and Compliance (GRC)";

function extractPlainText(doc: {
  body?: { content?: Array<{ paragraph?: { elements?: Array<{ textRun?: { content?: string | null } | null }> | null } | null }> | null } | null;
}): string {
  const parts: string[] = [];
  for (const el of doc.body?.content ?? []) {
    for (const pe of el.paragraph?.elements ?? []) {
      if (pe.textRun?.content) parts.push(pe.textRun.content);
    }
  }
  return parts.join("");
}

async function main(): Promise<void> {
  const md = fs.readFileSync(MANUSCRIPT, "utf8");
  const parsed = parseGovernanceMarkdown(md, "manuscript.md", {
    treatFirstH1AsTitle: true,
    treatFirstH2AsSubtitle: true,
  });
  const payload = buildDocsPayload(parsed, {
    includeCoverFromFrontmatter: true,
    forcePageBreaksForManuscript: true,
  });
  const payloadTitle = payload.text.split("\n")[0] ?? "";
  console.log("payload.title:", JSON.stringify(payloadTitle));
  if (payloadTitle !== EXPECTED) {
    throw new Error(`Payload title mismatch: ${JSON.stringify(payloadTitle)}`);
  }
  if (/vbcx\s*aZ/i.test(payload.text)) {
    throw new Error("Corruption present in generated payload.");
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as {
    documents: Record<string, { id: string }>;
  };
  const documentId = state.documents["01 — Master Manuscript"]?.id;
  if (!documentId) throw new Error("Master Manuscript id missing from state.");

  const { docs } = await authorizeGoogle();
  await writeParsedDocument(docs, documentId, md, "manuscript.md", {
    includeCoverFromFrontmatter: true,
    forcePageBreaksForManuscript: true,
  });

  const live = await docs.documents.get({ documentId });
  const plain = extractPlainText(live.data);
  const firstPara = plain.split("\n").find((l) => l.trim())?.trim() ?? "";
  console.log("live.firstParagraph:", JSON.stringify(firstPara));
  console.log("containsCorruption:", /vbcx\s*aZ/i.test(plain));
  if (/vbcx\s*aZ/i.test(plain)) {
    // Show a window around the corruption for debugging.
    const idx = plain.search(/vbcx\s*aZ/i);
    console.log("context:", JSON.stringify(plain.slice(Math.max(0, idx - 40), idx + 40)));
    throw new Error("Live document still contains title corruption.");
  }
  if (!plain.startsWith(EXPECTED)) {
    throw new Error(
      `Live title does not start with expected string. Got: ${JSON.stringify(plain.slice(0, 120))}`,
    );
  }
  console.log("OK: title verified clean after replace.");
  console.log(`Open: https://docs.google.com/document/d/${documentId}/edit`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
