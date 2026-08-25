import { config } from "dotenv";
import fs from "node:fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import {
  extractIndependentLinkedInCitationUrls,
  extractGovernanceFrameCitationUrls,
  linkedInDeskAppDocSlug,
  linkedInDeskIdFromSourceRef,
} from "../../app/lib/linkedinDeskIds.ts";

config({ path: resolve(process.cwd(), ".env.local"), override: true });
const p = new PrismaClient();

const RESEARCH_HEADING =
  "## Research & verification (operator only — do not paste to LinkedIn)";

function stripFrontMatter(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  let result = normalized.replace(
    /^(?:\*\*[^*\n]+?:\*\*[^\n]*\n+)+\n---\n+/m,
    "",
  );
  if (result === normalized) {
    result = normalized
      .replace(/^(?:\*\*[^*\n]+?:\*\*[^\n]*\n+)+/m, "")
      .replace(/^---\n+/, "")
      .trim();
  } else {
    result = result.trim();
  }
  result = result
    .replace(
      /^### Board voice \(founder cadence\)\n\n(?:- [^\n]+\n)+\n---\n+/m,
      "",
    )
    .trim();
  return result;
}

function parsePack(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const title = normalized.match(/^#\s+(.+)$/m)?.[1]?.trim() || "LinkedIn draft";
  let rest = stripFrontMatter(normalized.replace(/^#\s+.+\n+/, "").trim());
  const researchSplit = rest.split(/\n---\n+\s*## Research & verification[^\n]*\n+/i);
  let bodyPart = researchSplit[0]?.trim() ?? rest;
  let research =
    researchSplit.length >= 2 ? researchSplit.slice(1).join("\n---\n").trim() : "";
  const firstCommentSplit = bodyPart.split(/\n---\n+\s*## First comment[^\n]*\n+/i);
  if (firstCommentSplit.length >= 2) {
    bodyPart = firstCommentSplit[0].trim();
    const firstComment = firstCommentSplit.slice(1).join("\n").trim();
    research = [
      "### First comment (post immediately after publish — do not put in main body)\n\n" +
        firstComment,
      research,
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  return {
    title,
    body: stripFrontMatter(bodyPart),
    research: research.trim(),
  };
}

const packs = [
  {
    sourceRef: "marketing/linkedin-2026-08-11-ai-evidence",
    file: "docs/marketing-strategy/linkedin-drafts-next-ai-evidence-hitl.md",
  },
  {
    sourceRef: "marketing/linkedin-2026-08-14-residual",
    file: "docs/marketing-strategy/linkedin-drafts-next-residual-vs-spend.md",
  },
  {
    sourceRef: "marketing/linkedin-2026-08-17-ccm",
    file: "docs/marketing-strategy/linkedin-drafts-2026-08-17-ccm.md",
  },
  {
    sourceRef: "marketing/linkedin-2026-08-19-board-delta",
    file: "docs/marketing-strategy/linkedin-drafts-2026-08-19-board-delta.md",
  },
  {
    sourceRef: "marketing/linkedin-2026-08-21-tprm",
    file: "docs/marketing-strategy/linkedin-drafts-2026-08-21-tprm.md",
  },
  {
    sourceRef: "marketing/linkedin-2026-08-24-shared-stack",
    file: "docs/marketing-strategy/linkedin-drafts-2026-08-24-shared-stack-evidence.md",
  },
  {
    sourceRef: "marketing/linkedin-2026-08-26-board-export",
    file: "docs/marketing-strategy/linkedin-drafts-2026-08-26-board-export-isolation.md",
  },
  {
    sourceRef: "marketing/linkedin-2026-09-08-heatmap-callback",
    file: "docs/marketing-strategy/linkedin-drafts-2026-09-08-heatmap-callback.md",
  },
  {
    sourceRef: "marketing/linkedin-2026-09-12-enclaves-callback",
    file: "docs/marketing-strategy/linkedin-drafts-2026-09-12-enclaves-callback.md",
  },
];

for (const pack of packs) {
  const id = linkedInDeskIdFromSourceRef(pack.sourceRef);
  const slug = linkedInDeskAppDocSlug(id);
  const raw = fs.readFileSync(resolve(process.cwd(), pack.file), "utf8");
  const parsed = parsePack(raw);
  if (/Slot intent|Ops calendar/i.test(parsed.body)) {
    throw new Error(`Front matter still in body for ${id}`);
  }
  const independent = extractIndependentLinkedInCitationUrls(parsed.research);
  if (independent.length < 1) {
    throw new Error(`No independent citations in research for ${id}`);
  }
  const markdown = `# ${parsed.title}\n\n${parsed.body}\n\n---\n\n${RESEARCH_HEADING}\n\n${parsed.research}\n`;
  await p.appDocument.upsert({
    where: { slug },
    update: {
      title: parsed.title,
      content: markdown,
      readingLevel: "LEVEL_2",
      updatedAt: new Date(),
    },
    create: {
      slug,
      title: parsed.title,
      content: markdown,
      readingLevel: "LEVEL_2",
    },
  });
  console.log(
    "seeded",
    id,
    "independent:",
    independent.length,
    "gf:",
    extractGovernanceFrameCitationUrls(parsed.research).length,
  );
}

await p.$disconnect();
