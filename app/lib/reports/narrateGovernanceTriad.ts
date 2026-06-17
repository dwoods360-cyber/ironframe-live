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
- Never output raw BigInt cent integers — cite financials.display formatted strings verbatim.
- Never output CVE identifiers or raw database asset UUIDs.
- Preserve physical sustainability formatted strings exactly (kWh, L).

[LAYER 4: MANDATORY GOVERNANCE FRAME TRIAD]
Structure the narrative using the fixed headings in financials.display.governanceTriadScaffold:
## I. Exposure Vector
## II. Calculated Quantitative Impact
## III. Machine-Rule Technical Translation

[LAYER 5: EXECUTIVE PERSONA RATIOS]
Anchor financial assertions in macro-sanitized USD. Validate DORA alignment.
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

Output markdown only.`;

  const { text } = await generateText({
    model: google(NARRATE_MODEL),
    prompt,
    maxOutputTokens: 4096,
  });

  return sanitizeExportProse(text.trim());
}

export type NarrateGovernanceTriadResult = {
  tenantId: string;
  operationalDate: string;
  snapshotId: string;
  artifactId: string;
  narrativeChars: number;
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

  return {
    tenantId,
    operationalDate: operationalDate.toISOString().slice(0, 10),
    snapshotId: snapshot.id,
    artifactId: artifact.id,
    narrativeChars: narrativeMarkdown.length,
  };
}
