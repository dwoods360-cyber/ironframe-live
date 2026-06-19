import "server-only";

import { randomUUID } from "node:crypto";

import { GoogleGenAI } from "@google/genai";

import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import {
  PENDING_SALES_DRAFT_TAG,
} from "@/app/lib/server/approvalQueueCore";
import {
  GRC_SALES_PLAYBOOK,
  type GRCPlaybookTier,
} from "@/Ironboard/src/agents/sales/playbook";
import prisma from "@/lib/prisma";

const MAX_DRAFT_SUMMARY_CHARS = 12_000;

export type BaselineTarget = "Gridcore" | "Vaultbank" | "Medshield";

/** Display-scale protected units + stable baseline reference ids for sales prompts. */
export const ALE_BASELINES: Record<BaselineTarget, { units: number; baselineId: string }> = {
  Gridcore: { units: 4_700_000, baselineId: "BL_GRID_47" },
  Vaultbank: { units: 5_900_000, baselineId: "BL_VAULT_59" },
  Medshield: { units: 11_100_000, baselineId: "BL_MED_111" },
};

const BASELINE_CENTS: Record<BaselineTarget, bigint> = {
  Gridcore: 470_000_000n,
  Vaultbank: 590_000_000n,
  Medshield: 1_110_000_000n,
};

export type SalesAgentIntake = {
  name: string;
  email: string;
  company: string;
  baselineTarget: BaselineTarget;
  notes: string;
};

/** Air-gapped prospect pool — override via IRONFRAME_PROSPECT_POOL_TENANT_UUID. */
export function resolveProspectPoolTenantId(): string {
  const fromEnv = process.env.IRONFRAME_PROSPECT_POOL_TENANT_UUID?.trim();
  if (fromEnv && /^[0-9a-f-]{36}$/i.test(fromEnv)) {
    return fromEnv;
  }
  return TENANT_UUIDS.medshield;
}

function sanitizeField(raw: string, maxLen: number): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .trim()
    .slice(0, maxLen);
}

export function sanitizeSalesIntake(raw: {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  baselineTarget?: unknown;
  notes?: unknown;
}): SalesAgentIntake | { error: string } {
  const name = sanitizeField(String(raw.name ?? ""), 120);
  const email = sanitizeField(String(raw.email ?? ""), 320).toLowerCase();
  const company = sanitizeField(String(raw.company ?? ""), 200);
  const notes = sanitizeField(String(raw.notes ?? ""), 2_000);
  const baselineRaw = String(raw.baselineTarget ?? "Gridcore").trim();

  if (!name || !email || !company) {
    return { error: "Missing required qualification parameters." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Valid secure return email is required." };
  }

  const baselineTarget =
    baselineRaw === "Gridcore" || baselineRaw === "Vaultbank" || baselineRaw === "Medshield"
      ? baselineRaw
      : null;
  if (!baselineTarget) {
    return { error: "Invalid baselineTarget. Use Gridcore, Vaultbank, or Medshield." };
  }

  return { name, email, company, baselineTarget, notes };
}

export function resolveBaselineTarget(raw: unknown): BaselineTarget {
  const key = String(raw ?? "Gridcore").trim();
  return key in ALE_BASELINES ? (key as BaselineTarget) : "Gridcore";
}

export async function upsertProspectCrmContact(intake: SalesAgentIntake) {
  const tenantId = resolveProspectPoolTenantId();
  const metricData = ALE_BASELINES[intake.baselineTarget];

  const existing = await prisma.ironboardCrmContact.findFirst({
    where: { tenantId, email: intake.email },
  });

  if (existing) {
    return prisma.ironboardCrmContact.update({
      where: { id: existing.id },
      data: {
        fullName: intake.name,
        company: intake.company,
        title: `Baseline:${intake.baselineTarget} [${metricData.baselineId}]`,
        metadata: {
          initialBaselineAlignment: intake.baselineTarget,
          targetALE: GRC_SALES_PLAYBOOK[intake.baselineTarget].targetALE,
          ingressNotes: intake.notes,
        },
      },
    });
  }

  return prisma.ironboardCrmContact.create({
    data: {
      id: randomUUID(),
      tenantId,
      fullName: intake.name,
      email: intake.email,
      company: intake.company,
      title: `Baseline:${intake.baselineTarget} [${metricData.baselineId}]`,
      metadata: {
        initialBaselineAlignment: intake.baselineTarget,
        targetALE: GRC_SALES_PLAYBOOK[intake.baselineTarget].targetALE,
        ingressNotes: intake.notes,
      },
    },
  });
}

export function buildSalesPendingDraftSummary(input: {
  company: string;
  baselineTarget: BaselineTarget;
  notes: string;
  proposedPitch: string;
}): string {
  const subject = `Ironframe platform assessment — ${input.company}`;
  return [
    `${PENDING_SALES_DRAFT_TAG} ${subject}`,
    "--- Agent Proposed Reply Text ---",
    input.proposedPitch.trim(),
    "--- Prospect Context ---",
    `Baseline Track: ${input.baselineTarget}`,
    input.notes ? `Ingress Notes: ${input.notes}` : "Ingress Notes: Standard multi-tenant lifecycle optimization.",
    "Execution Source: agentSalesConsole | Channel: PUBLIC_LEAD_FORM",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_DRAFT_SUMMARY_CHARS);
}

export async function logPendingSalesDraftApproval(input: {
  tenantId: string;
  contactId: string;
  company: string;
  baselineTarget: BaselineTarget;
  notes: string;
  proposedPitch: string;
}): Promise<string> {
  const interaction = await prisma.ironboardCrmInteraction.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId,
      contactId: input.contactId,
      channel: "SYSTEM_AGENT",
      summary: buildSalesPendingDraftSummary(input),
      occurredAt: new Date(),
    },
  });
  return interaction.id;
}

export const SALES_LEAD_QUEUED_MESSAGE =
  "Your architectural profile has been queued for operator review. A platform strategist will follow up via your secure return email after human approval.";

export const SALES_LEAD_OFFLINE_MESSAGE =
  "Architectural profile successfully tracked. Our strategic alignment matrix is adjusting parameters. An enterprise engineering director will reach out shortly.";

export async function logAutomatedSalesProposal(input: {
  tenantId: string;
  contactId: string;
  baselineTarget: BaselineTarget;
  pitch: string;
  notes: string;
}): Promise<void> {
  const metricData = ALE_BASELINES[input.baselineTarget];
  const consolidatedSummary = [
    `[AUTOMATED PROPOSAL] Strategy pitch computed for ${input.baselineTarget} alignment.`,
    `Baseline ID: ${metricData.baselineId} | Units: ${metricData.units.toLocaleString()}`,
    input.notes ? `Ingress Notes: ${input.notes}` : "",
    "--- Generated Pitch Summary ---",
    input.pitch.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  await prisma.ironboardCrmInteraction.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId,
      contactId: input.contactId,
      channel: "NOTE",
      summary: consolidatedSummary.slice(0, 12_000),
      occurredAt: new Date(),
    },
  });
}

function resolveApiKey(): string {
  return process.env.GOOGLE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

function resolveModel(): string {
  return process.env.IRONBOARD_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

export async function synthesizeSalesAgentPitch(
  intake: SalesAgentIntake,
  contact: { fullName: string; company: string },
  playbookTier: GRCPlaybookTier = GRC_SALES_PLAYBOOK[intake.baselineTarget] ??
    GRC_SALES_PLAYBOOK.Gridcore,
): Promise<string> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_CREDENTIALS_UNASSIGNED");
  }

  const metricData = ALE_BASELINES[intake.baselineTarget];
  const selectedTarget = intake.baselineTarget;

  const systemInstruction = `You are the elite Sales Specialist Agent for the Ironframe/Ironboard GRC platform core.
Your absolute mandate is to evaluate incoming leads against the strict constraints of the ${playbookTier.name}.

CRITICAL OUTREACH ALGORITHMS:
1. Address the prospect's reported scale metrics directly: ${playbookTier.targetALE} (${metricData.units.toLocaleString()} protected units).
2. Focus the structural pitch on their target compliance frameworks: ${playbookTier.complianceFrameworks.join(", ")}.
3. Explicitly deploy the platform's core technical advantage for this scale: "${playbookTier.coreValueProposition}".
4. Maintain a peer-to-peer engineering tone. Avoid fluff, emojis, and vague promises.
5. Emphasize our control-first architecture, tenant isolation guarantees, and pure BigInt financial integrity.
6. Do not quote hard software licensing costs or financial pricing estimates unless explicitly stated in your core directives.
7. Output ONLY the clean, structured message body text.`;

  const inputPrompt = `Prospect Metadata:
- Name: ${contact.fullName}
- Enterprise: ${contact.company}
- Baseline Alignment Track: ${selectedTarget} (${metricData.units.toLocaleString()} Units Checked)
- Operation Obstacles Noted: ${intake.notes || "Standard multi-tenant lifecycle optimization."}

Synthesize a precise engineering-focused platform capabilities overview:`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: resolveModel(),
    contents: inputPrompt,
    config: {
      systemInstruction,
      temperature: 0.0,
      topP: 0,
      maxOutputTokens: 1_024,
    },
  });

  return (
    response.text?.trim() ||
    "Architectural assessment successfully computed. Your slot has been reserved."
  );
}

export function baselineAleCents(target: BaselineTarget): bigint {
  return BASELINE_CENTS[target];
}
