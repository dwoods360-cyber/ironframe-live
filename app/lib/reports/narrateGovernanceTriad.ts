import "server-only";

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import {
  getSharedBoardContextForTenant,
  serializeBoardContextPayload,
  type BoardContextPayload,
} from "@/app/lib/board/sharedBoardContext";
import {
  buildGovernanceTriadRows,
  sanitizeExportProse,
} from "@/app/lib/reports/governanceTriadSanitizer";
import { PUBLIC_BRIEFING_DECLASSIFICATION_MANDATE } from "@/app/lib/governanceFrame/publicBriefingDeclassification";
import {
  buildPublicBriefingAuthoringMandate,
} from "@/app/lib/governanceFrame/publicBriefingSolutionVoice";
import { appendPublicBriefingCitationsToMarkdown } from "@/app/lib/governanceFrame/telemetryCitationCatalog";
import { writeBriefingQueueDraftFromNarrate } from "@/app/lib/governanceFrame/briefingQueueDraftWriter";
import { dispatchInternalExposureAlert } from "@/app/lib/governanceFrame/dispatchInternalExposureAlert";
import prisma from "@/lib/prisma";

const NARRATE_MODEL =
  process.env.GEMINI_NARRATE_MODEL?.trim() ||
  process.env.GEMINI_IRONSIGHT_MODEL?.trim() ||
  "gemini-2.5-flash";

function utcCalendarDate(input = new Date()): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function buildNarrateSystemPrompt(telemetryJson: string): string {
  return `
You are the Ironframe Narrative Architect executing the nightly Governance Frame Triad hydration loop.

[LAYER 1: UNIDIRECTIONAL DIODE POSTURE]
- READ-ONLY advisory synthesis. No database writes, no code execution commands.

[LAYER 2: LIVE METRIC HYDRATION - ARCHITECTURE ENFORCED]
${telemetryJson}

[LAYER 3: DE-CLASSIFICATION MATRIX]
- Read telemetry from Layer 2 for factual grounding only — never echo internal JSON paths, API routes, UUIDs, agent names, or demo tenant slugs in output.
- Never output raw BigInt cent integers — use formatted USD strings only.
- Never output CVE identifiers or raw database asset UUIDs.
- Preserve physical sustainability formatted strings exactly (kWh, L).
- Describe industry segments generically (regulated healthcare, regional banking, critical infrastructure).

${buildPublicBriefingAuthoringMandate(PUBLIC_BRIEFING_DECLASSIFICATION_MANDATE)}

[LAYER 4: MANDATORY GOVERNANCE FRAME TRIAD]
## I. Exposure Vector
## II. Calculated Quantitative Impact
## III. Machine-Rule Technical Translation — include soft Ironframe solution bridge here when mapping is genuine (see SOFT SOLUTION INTERJECTION above)

[LAYER 5: EXECUTIVE PERSONA RATIOS]
- Anchor financial assertions in macro-sanitized USD. Validate DORA alignment.

[LAYER 6: PUBLIC SOURCES & CITATIONS]
Append "### V. Sources & Citations" with external regulator URLs and https://brief.ironframegrc.com only.
Format: - **[n] Label** — https://… · retrieved YYYY-MM-DD
`.trim();
}

async function synthesizeTriadNarrative(
  payload: BoardContextPayload,
): Promise<string> {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured for narrate cron.");
  }

  const telemetryJson = serializeBoardContextPayload(payload);
  const google = createGoogleGenerativeAI({ apiKey });
  const triadRows = buildGovernanceTriadRows(payload);

  const prompt = `${buildNarrateSystemPrompt(telemetryJson)}

Compile tonight's boardroom narrative using these deterministic triad anchors:
- Exposure: ${triadRows[0]?.summary ?? ""}
- Impact: ${triadRows[1]?.summary ?? ""}
- Remediation: ${triadRows[2]?.summary ?? ""}

Output markdown only. Include Section V citations for every financial and compliance claim. When Ironframe provides a relevant control path, add one soft solution bridge in Section III only.`;

  const { text } = await generateText({
    model: google(NARRATE_MODEL),
    prompt,
    maxOutputTokens: 4096,
  });

  const sanitized = sanitizeExportProse(text.trim());
  return appendPublicBriefingCitationsToMarkdown(sanitized);
}

export type NarrateGovernanceTriadResult = {
  tenantId: string;
  operationalDate: string;
  snapshotId: string;
  artifactId: string;
  narrativeChars: number;
  briefingQueueDraft?: {
    filename: string;
    requiresImmediatePromotion: boolean;
    currentExposureCents: string;
    thresholdCents: string;
  };
};

export async function runNightlyGovernanceNarrate(
  tenantId: string,
): Promise<NarrateGovernanceTriadResult> {
  const payload = await getSharedBoardContextForTenant(tenantId);
  const triadRows = buildGovernanceTriadRows(payload);
  const narrativeMarkdown = await synthesizeTriadNarrative(payload);
  const operationalDate = utcCalendarDate();

  const snapshot = await prisma.governanceFrameTriadSnapshot.upsert({
    where: {
      tenantId_operationalDate: {
        tenantId,
        operationalDate,
      },
    },
    create: {
      tenantId,
      operationalDate,
      exposureVector: triadRows[0]?.summary ?? "",
      impactSummary: triadRows[1]?.summary ?? "",
      remediation: triadRows[2]?.summary ?? "",
      narrativeMarkdown,
      sourceTelemetryJson: JSON.parse(serializeBoardContextPayload(payload)),
    },
    update: {
      exposureVector: triadRows[0]?.summary ?? "",
      impactSummary: triadRows[1]?.summary ?? "",
      remediation: triadRows[2]?.summary ?? "",
      narrativeMarkdown,
      sourceTelemetryJson: JSON.parse(serializeBoardContextPayload(payload)),
    },
    select: { id: true },
  });

  const artifact = await prisma.cronJobArtifact.create({
    data: {
      tenantId,
      agentName: "governance-frame-narrate",
      payloadJson: {
        snapshotId: snapshot.id,
        operationalDate: operationalDate.toISOString().slice(0, 10),
        systemStatus: payload.systemStatus,
        narrativeChars: narrativeMarkdown.length,
        source: "api-cron-narrate",
      },
    },
    select: { id: true },
  });

  const operationalDateLabel = operationalDate.toISOString().slice(0, 10);
  const queueDraft = writeBriefingQueueDraftFromNarrate(
    payload,
    narrativeMarkdown,
    operationalDateLabel,
  );

  if (queueDraft.requiresImmediatePromotion) {
    await dispatchInternalExposureAlert({
      tenantId,
      tenantSlug: payload.financials.display.activeTenant.slug || "tenant",
      companyName: payload.financials.display.activeTenant.companyName,
      currentExposureCents: queueDraft.currentExposureCents,
      thresholdCents: queueDraft.thresholdCents,
      draftFilename: queueDraft.filename,
      operationalDate: operationalDateLabel,
    });
  }

  return {
    tenantId,
    operationalDate: operationalDateLabel,
    snapshotId: snapshot.id,
    artifactId: artifact.id,
    narrativeChars: narrativeMarkdown.length,
    briefingQueueDraft: {
      filename: queueDraft.filename,
      requiresImmediatePromotion: queueDraft.requiresImmediatePromotion,
      currentExposureCents: queueDraft.currentExposureCents,
      thresholdCents: queueDraft.thresholdCents,
    },
  };
}
