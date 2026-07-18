import "server-only";

import fs from "fs";
import path from "path";

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { resolveGeminiFlashModel } from "@/app/config/geminiModels";
import { validateBriefingQueueDraft } from "@/app/lib/governanceFrame/briefingDraftValidation";
import {
  BRIEFING_QUEUE_DIR,
  resolveDocsRoot,
} from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import { scanForbiddenPublicSalesClaims } from "@/app/lib/governanceFrame/publicBriefingSolutionVoice";
import { stageBriefingQueueDraftCore } from "@/app/lib/server/stageBriefingQueueDraftCore";
import {
  GF_PUBLICATION_DESK_AGENTS,
  GF_PUBLICATION_DESK_HUMAN_PUBLISHER,
  computeReadyForHumanOperator,
  ensureDeskReview,
  scanCitationPresence,
  scanEditorStructure,
  scanProductBoundaryFlags,
  scanRegulatoryPrecisionFlags,
  writeDeskReview,
  type DeskAgentFinding,
  type DeskReviewChecklist,
} from "@/lib/governanceFrame/publicationDesk";

/**
 * Governance Frame publication desk — quarantine-only orchestration.
 * Intentionally does NOT import promoteBriefingDraftCore / deny / syndicate.
 */

const DESK_MODEL = resolveGeminiFlashModel(
  process.env.GEMINI_NARRATE_MODEL,
  process.env.GEMINI_IRONSIGHT_MODEL,
);

export type DeskRunMode = "author" | "review";

export type RunGovernanceFramePublicationDeskInput = {
  mode: DeskRunMode;
  /** Existing queue draft to review (required for mode=review). */
  filename?: string;
  /** Author mode: operator research brief (min 40 chars). */
  requestPrompt?: string;
  /** Author mode: short title. */
  title?: string;
  tenantId: string;
  tenantSlug: string;
  overwrite?: boolean;
};

export type RunGovernanceFramePublicationDeskResult = {
  ok: boolean;
  mode: DeskRunMode;
  filename: string | null;
  staged: boolean;
  review: DeskReviewChecklist | null;
  readyForHumanOperator: boolean;
  humanPublisherRequired: string;
  error?: string;
  pipelineLog: string[];
};

function extractMarkdownDocument(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:markdown|md)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildAuthorFilename(title: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(title) || "governance-briefing";
  return `${date}-draft-gf-desk-${slug}.md`;
}

function researcherSystemPrompt(): string {
  return `
You are gf-researcher — Governance Frame Executive Intelligence Unit (GF-OPS-001 / GF-STANDARDS-001).

You draft PUBLIC institutional briefings for quarantine in docs/briefing-queue/ only.

EDITORIAL HARD RULES:
- Editorially independent of Ironframe marketing. Ironframe should almost never be the subject.
- Vendor-neutral. Do not write conclusions backward from any product architecture.
- Evidence before opinion. Do not invent citations, quotations, statutes, dates, statistics, or customers.
- Separate documented fact, analytical interpretation, illustrative example, architectural recommendation, product relevance, and unresolved questions.
- Regulatory precision: do not describe guidance as law, proposals as final rules, or voluntary frameworks as binding.
- Never imply a regulator requires Ironframe or any vendor.
- If mentioning a product, use an applied-product note that is visibly separate and labeled as one possible implementation.
- Calm, analytical, institutional voice. No hype, fear marketing, or SEO Top-10 formats.

OUTPUT:
- ONE markdown document only.
- YAML frontmatter: title, date (ISO), status QUARANTINED_DRAFT, classification Institutional Governance, category institutional-research, tenantId and tenantSlug exactly as provided, publishState QUARANTINED_AWAITING_OPERATOR, author "Executive Intelligence Unit", requiresImmediatePromotion false.
- Executive Summary, then clearly labeled sections, then Sources & Citations with primary URLs and retrieval dates where possible.
- Do not promote, syndicate, or claim the draft is verified.
`.trim();
}

async function generateResearchDraft(input: {
  title: string;
  requestPrompt: string;
  tenantId: string;
  tenantSlug: string;
  filename: string;
}): Promise<{ ok: true; markdown: string } | { ok: false; error: string }> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "GOOGLE_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY missing — cannot author desk draft.",
    };
  }

  const google = createGoogleGenerativeAI({ apiKey });
  try {
    const { text } = await generateText({
      model: google(DESK_MODEL),
      temperature: 0,
      system: researcherSystemPrompt(),
      prompt: `
TITLE: ${input.title}
OUTPUT FILENAME: ${input.filename}
FRONTMATTER tenantId: ${input.tenantId}
FRONTMATTER tenantSlug: ${input.tenantSlug}

RESEARCH BRIEF:
${input.requestPrompt}

Write the complete quarantine-ready markdown now.
`.trim(),
    });
    return { ok: true, markdown: extractMarkdownDocument(text) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Researcher generation failed.",
    };
  }
}

function runVerifierPass(markdown: string): DeskAgentFinding {
  const citation = scanCitationPresence(markdown);
  const notes = [...citation.notes];
  const status =
    citation.hasSourcesSection && citation.urlCount >= 2
      ? "advisory"
      : citation.hasSourcesSection
        ? "warn"
        : "fail";
  notes.push(
    "Automated pass cannot open URLs — human Source Verification Reviewer must still inspect material sources.",
  );
  return {
    agentId: "gf-verifier",
    status,
    summary:
      status === "fail"
        ? "Citation map incomplete for desk handoff."
        : "Citation structure present; exact-support verification remains human-gated.",
    notes,
  };
}

function runEditorPass(markdown: string): DeskAgentFinding {
  const structure = scanEditorStructure(markdown);
  return {
    agentId: "gf-editor",
    status: structure.ok ? "pass" : "warn",
    summary: structure.ok
      ? "Structure and tone checks clear for briefing classification."
      : "Editorial structure/tone notes require attention before Approve.",
    notes: structure.notes.length ? structure.notes : ["Title/scope and classification still operator-confirmed."],
  };
}

function runRegulatoryPass(markdown: string): DeskAgentFinding {
  const flags = scanRegulatoryPrecisionFlags(markdown);
  return {
    agentId: "gf-regulatory-reviewer",
    status: flags.length === 0 ? "pass" : "warn",
    summary:
      flags.length === 0
        ? "No automated regulatory-precision flags."
        : "Regulatory-precision flags require human legal-scope review.",
    notes: flags.length
      ? flags
      : ["Confirm effective dates and covered-entity roles before publication."],
  };
}

function runProductBoundaryPass(markdown: string): DeskAgentFinding {
  const heuristic = scanProductBoundaryFlags(markdown);
  const sales = scanForbiddenPublicSalesClaims(markdown).map((issue) => issue.message);
  const issues = [...heuristic, ...sales];
  const hardFail = issues.some((m) => /requires Ironframe|FORBIDDEN_SALES|guaranteed compliance|certified/i.test(m));
  return {
    agentId: "gf-product-boundary",
    status: issues.length === 0 ? "pass" : hardFail ? "fail" : "warn",
    summary:
      issues.length === 0
        ? "No product-boundary violations detected."
        : "Product / sales boundary issues found — separate or remove before Approve.",
    notes: issues.length ? issues : ["No commercial product language detected in body."],
  };
}

function runOperatorPass(review: DeskReviewChecklist): DeskAgentFinding {
  const ready = computeReadyForHumanOperator(review);
  return {
    agentId: "gf-operator",
    status: ready ? "advisory" : "warn",
    summary: ready
      ? "Desk checklist green/advisory — human Publisher may Approve, Hold, or Deny in Ops Hub."
      : "Desk checklist incomplete — do not treat as publication-ready.",
    notes: [
      `Human publisher: ${GF_PUBLICATION_DESK_HUMAN_PUBLISHER.role}`,
      GF_PUBLICATION_DESK_HUMAN_PUBLISHER.mandate,
      "Automated validation ≠ editorial approval (GF-STANDARDS-001 §18).",
    ],
  };
}

function upsertFinding(review: DeskReviewChecklist, finding: DeskAgentFinding): void {
  const idx = review.findings.findIndex((f) => f.agentId === finding.agentId);
  if (idx >= 0) review.findings[idx] = finding;
  else review.findings.push(finding);
}

function readQueueMarkdown(docsRoot: string, filename: string): string | null {
  const absolute = path.join(docsRoot, BRIEFING_QUEUE_DIR, filename);
  if (!fs.existsSync(absolute)) return null;
  return fs.readFileSync(absolute, "utf-8");
}

/**
 * Run the GF publication desk. Stages drafts and writes desk-review sidecars only.
 */
export async function runGovernanceFramePublicationDesk(
  input: RunGovernanceFramePublicationDeskInput,
): Promise<RunGovernanceFramePublicationDeskResult> {
  const pipelineLog: string[] = [];
  const docsRoot = resolveDocsRoot();
  pipelineLog.push(
    `Desk agents online: ${GF_PUBLICATION_DESK_AGENTS.map((a) => a.id).join(", ")}`,
  );
  pipelineLog.push("Promote/deny APIs are out of scope for this desk — human Ops Hub only.");

  let filename = String(input.filename ?? "").trim();
  let markdown = "";
  let staged = false;

  if (input.mode === "author") {
    const requestPrompt = String(input.requestPrompt ?? "").trim();
    const title = String(input.title ?? "").trim() || "Governance Frame institutional briefing";
    if (requestPrompt.length < 40) {
      return {
        ok: false,
        mode: "author",
        filename: null,
        staged: false,
        review: null,
        readyForHumanOperator: false,
        humanPublisherRequired: GF_PUBLICATION_DESK_HUMAN_PUBLISHER.role,
        error: "requestPrompt must be at least 40 characters.",
        pipelineLog,
      };
    }
    filename = filename || buildAuthorFilename(title);
    pipelineLog.push(`gf-researcher authoring → ${filename}`);
    const generated = await generateResearchDraft({
      title,
      requestPrompt,
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      filename,
    });
    if (!generated.ok) {
      return {
        ok: false,
        mode: "author",
        filename,
        staged: false,
        review: null,
        readyForHumanOperator: false,
        humanPublisherRequired: GF_PUBLICATION_DESK_HUMAN_PUBLISHER.role,
        error: generated.error,
        pipelineLog,
      };
    }
    markdown = generated.markdown;
    const stage = stageBriefingQueueDraftCore({
      filename,
      markdown,
      overwrite: input.overwrite === true,
    });
    if (!stage.ok) {
      return {
        ok: false,
        mode: "author",
        filename,
        staged: false,
        review: null,
        readyForHumanOperator: false,
        humanPublisherRequired: GF_PUBLICATION_DESK_HUMAN_PUBLISHER.role,
        error: stage.error,
        pipelineLog: [...pipelineLog, `stage failed: ${stage.error}`],
      };
    }
    staged = true;
    pipelineLog.push("Staged to docs/briefing-queue/ (QUARANTINED_AWAITING_OPERATOR).");
    markdown = readQueueMarkdown(docsRoot, filename) ?? markdown;
  } else {
    if (!filename) {
      return {
        ok: false,
        mode: "review",
        filename: null,
        staged: false,
        review: null,
        readyForHumanOperator: false,
        humanPublisherRequired: GF_PUBLICATION_DESK_HUMAN_PUBLISHER.role,
        error: "filename is required for mode=review.",
        pipelineLog,
      };
    }
    const existing = readQueueMarkdown(docsRoot, filename);
    if (!existing) {
      return {
        ok: false,
        mode: "review",
        filename,
        staged: false,
        review: null,
        readyForHumanOperator: false,
        humanPublisherRequired: GF_PUBLICATION_DESK_HUMAN_PUBLISHER.role,
        error: `Queue draft not found: ${filename}`,
        pipelineLog,
      };
    }
    markdown = existing;
    pipelineLog.push(`Reviewing existing quarantine draft ${filename}`);
  }

  const review = ensureDeskReview(docsRoot, filename);
  review.pipelineLog = [...review.pipelineLog, ...pipelineLog];

  if (input.mode === "author") {
    upsertFinding(review, {
      agentId: "gf-researcher",
      status: "advisory",
      summary: "Initial manuscript drafted into quarantine.",
      notes: [
        "AI-assisted draft — not verified evidence.",
        "Source Verification Reviewer must inspect every material citation.",
      ],
    });
  } else if (!review.findings.some((f) => f.agentId === "gf-researcher")) {
    upsertFinding(review, {
      agentId: "gf-researcher",
      status: "skipped",
      summary: "Researcher not re-run (review mode).",
      notes: ["Existing quarantine draft retained as manuscript source."],
    });
  }

  const validation = validateBriefingQueueDraft(filename, markdown, { promotion: false });
  upsertFinding(review, runEditorPass(markdown));
  const editor = review.findings.find((f) => f.agentId === "gf-editor")!;
  if (!validation.ok) {
    editor.status = "warn";
    editor.notes = [
      ...editor.notes,
      ...validation.issues.filter((i) => i.severity === "error").map((i) => i.message),
    ];
  }
  review.editorNotes = editor.notes;

  const verifier = runVerifierPass(markdown);
  upsertFinding(review, verifier);
  review.verificationNotes = verifier.notes;

  const regulatory = runRegulatoryPass(markdown);
  upsertFinding(review, regulatory);
  review.regulatoryFlags = regulatory.notes.filter((n) => !n.startsWith("Confirm effective"));

  const product = runProductBoundaryPass(markdown);
  upsertFinding(review, product);
  review.productBoundaryIssues = product.status === "pass" ? [] : product.notes;

  const operator = runOperatorPass(review);
  upsertFinding(review, operator);
  review.readyForHumanOperator = computeReadyForHumanOperator(review);
  review.pipelineLog.push(
    review.readyForHumanOperator
      ? "gf-operator: ready for human Approve/Hold/Deny"
      : "gf-operator: hold for further desk/human revision",
  );

  const written = writeDeskReview(docsRoot, review);
  if (!written.ok) {
    return {
      ok: false,
      mode: input.mode,
      filename,
      staged,
      review,
      readyForHumanOperator: review.readyForHumanOperator,
      humanPublisherRequired: GF_PUBLICATION_DESK_HUMAN_PUBLISHER.role,
      error: written.error,
      pipelineLog: review.pipelineLog,
    };
  }

  return {
    ok: true,
    mode: input.mode,
    filename,
    staged,
    review: ensureDeskReview(docsRoot, filename),
    readyForHumanOperator: review.readyForHumanOperator,
    humanPublisherRequired: GF_PUBLICATION_DESK_HUMAN_PUBLISHER.role,
    pipelineLog: review.pipelineLog,
  };
}
