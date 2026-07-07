import { randomUUID } from "node:crypto";

import { GoogleGenAI } from "@google/genai";

import { PENDING_SUPPORT_INTAKE_TAG } from "@/app/lib/server/approvalQueueCore";
import {
  formatInTenantSupportTelemetryForCrm,
} from "@/app/lib/server/inTenantSupportTelemetry";
import {
  SUPPORT_OBJECTIVE_VALUES,
  supportObjectiveLabel,
} from "@/app/lib/support/supportIntentObjectives";
import type {
  InTenantSupportTelemetry,
  InTenantSupportTicketInput,
  InTenantSupportUrgency,
} from "@/app/types/inTenantSupportTelemetry";
import { sanitizeAppDocumentContent } from "@/lib/appDocumentSanitizer";
import prisma from "@/lib/prisma";

const MAX_MESSAGE_CHARS = 4_000;
const MAX_DRAFT_SUMMARY_CHARS = 12_000;

const SYSTEM_INSTRUCTION = `You are the elite automated Customer Service Agent for the Ironframe/Ironboard configuration platform.
Your absolute mandate is to solve operator anomalies based ONLY on the validated Grounding Context provided.

CRITICAL PROCESSING RULES:
- Keep your recommendations direct, actionable, and entirely bounded by the system documentation.
- If an issue cannot be resolved using the provided text, reply exactly with: "I am unable to trace a definitive solution within our local manuals. I have flagged a system administrator to take over and triage your environment parameters shortly."
- Never invent platform features, environment variable names, or security clearance procedures.
- Maintain a deterministic, authoritative, and strictly technical tone. Do not use creative flourishes.`;

function sanitizeIngressMessage(raw: string): string {
  return sanitizeAppDocumentContent(String(raw ?? ""))
    .replace(/javascript:/gi, "")
    .slice(0, MAX_MESSAGE_CHARS);
}

async function loadGroundingContext(): Promise<string> {
  const systemDocs = await prisma.appDocument
    .findMany({
      where: { readingLevel: "LEVEL_1" },
    })
    .catch(() => []);

  if (systemDocs.length === 0) {
    return "No localized system documentation manuals are currently populated inside the cluster state.";
  }

  return systemDocs
    .map((doc) => {
      const content = sanitizeAppDocumentContent(doc.content);
      return `Document: ${doc.title}\nContext:\n${content}`;
    })
    .join("\n\n---\n\n");
}

export function resolveCustomerServiceApiKey(): string {
  return process.env.GOOGLE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

export function resolveCustomerServiceModel(): string {
  return process.env.IRONBOARD_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

/** Execute grounded Gemini synthesis for the authenticated support console. */
export async function synthesizeCustomerServiceConsoleReply(message: string): Promise<string> {
  const apiKey = resolveCustomerServiceApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_CREDENTIALS_UNASSIGNED");
  }

  const groundingContext = await loadGroundingContext();
  const inquiry = sanitizeIngressMessage(message);

  const inputPrompt = `=== VALIDATED GROUNDING CONTEXT ===
${groundingContext}

=== OPERATOR QUERY ===
${inquiry}

Generate the deterministic resolution response text:`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: resolveCustomerServiceModel(),
    contents: inputPrompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.0,
      topP: 0,
      maxOutputTokens: 1_024,
    },
  });

  return (
    response.text?.trim() || "Automated synthesis engine failed to return valid content fields."
  );
}

const SUPPORT_CONSOLE_CONTACT_TITLE = "Support Console Session";

function buildSupportConsoleContactEmail(tenantId: string): string {
  return `console-support+${tenantId.slice(0, 8)}@ironframe.internal`;
}

export async function resolveSupportConsoleContact(tenantId: string) {
  const consoleEmail = buildSupportConsoleContactEmail(tenantId);
  const existing = await prisma.ironboardCrmContact.findFirst({
    where: { tenantId, email: consoleEmail },
  });
  if (existing) return existing;

  return prisma.ironboardCrmContact.create({
    data: {
      id: randomUUID(),
      tenantId,
      fullName: "Verified Operator",
      email: consoleEmail,
      company: "Ironframe Tenant Console",
      title: SUPPORT_CONSOLE_CONTACT_TITLE,
    },
  });
}

export function buildSupportConsoleIntakeSummary(input: {
  inquiry: string;
  tenantId: string;
  telemetry?: InTenantSupportTelemetry | null;
}): string {
  const telemetryBlock = input.telemetry
    ? `\n${formatInTenantSupportTelemetryForCrm(input.telemetry)}\n`
    : "";

  return [
    `${PENDING_SUPPORT_INTAKE_TAG} Re: Support console inquiry`,
    "--- Incoming Query ---",
    input.inquiry.trim(),
    telemetryBlock,
    "--- Tracking Core ---",
    `Execution Source: agentCustomerServiceConsole | Tenant: ${input.tenantId}`,
  ]
    .join("\n")
    .slice(0, MAX_DRAFT_SUMMARY_CHARS);
}

export async function logSupportConsoleIntake(input: {
  tenantId: string;
  contactId: string;
  inquiry: string;
  telemetry?: InTenantSupportTelemetry | null;
}): Promise<string> {
  const interaction = await prisma.ironboardCrmInteraction.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId,
      contactId: input.contactId,
      channel: "SYSTEM_AGENT",
      summary: buildSupportConsoleIntakeSummary(input),
      occurredAt: new Date(),
    },
  });
  return interaction.id;
}

/** @deprecated Use logSupportConsoleIntake — drafts are produced by SupportTeam worker. */
export function buildSupportConsolePendingDraftSummary(input: {
  inquiry: string;
  proposedReply: string;
  tenantId: string;
  telemetry?: InTenantSupportTelemetry | null;
}): string {
  return buildSupportConsoleIntakeSummary({
    inquiry: input.inquiry,
    tenantId: input.tenantId,
    telemetry: input.telemetry,
  });
}

/** @deprecated Use logSupportConsoleIntake — drafts are produced by SupportTeam worker. */
export async function logPendingSupportConsoleDraft(input: {
  tenantId: string;
  contactId: string;
  inquiry: string;
  proposedReply: string;
  telemetry?: InTenantSupportTelemetry | null;
}): Promise<string> {
  return logSupportConsoleIntake({
    tenantId: input.tenantId,
    contactId: input.contactId,
    inquiry: input.inquiry,
    telemetry: input.telemetry,
  });
}

export const CUSTOMER_SERVICE_QUEUED_MESSAGE =
  "Your inquiry has been queued for operator review. A platform administrator will verify the proposed resolution and follow up shortly.";

export const IN_TENANT_SUPPORT_DISPATCHED_MESSAGE =
  "Secure support ticket dispatched. Forensic workspace diagnostics are attached for engineering triage.";

const VALID_URGENCIES = new Set<InTenantSupportUrgency>([
  "ROUTINE",
  "AUDIT_BLOCKER",
  "DATA_INTEGRITY",
]);

export function parseInTenantSupportTicketInput(raw: unknown): InTenantSupportTicketInput | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const urgency = body.urgency;
  const objective = body.objective;
  const userNotes = typeof body.userNotes === "string" ? body.userNotes.trim() : "";
  if (!VALID_URGENCIES.has(urgency as InTenantSupportUrgency)) return null;
  if (!SUPPORT_OBJECTIVE_VALUES.has(objective as InTenantSupportTicketInput["objective"])) {
    return null;
  }
  if (objective === "OTHER" && !userNotes) return null;

  const context =
    body.context && typeof body.context === "object"
      ? (body.context as Record<string, unknown>)
      : undefined;

  return {
    urgency: urgency as InTenantSupportUrgency,
    objective: objective as InTenantSupportTicketInput["objective"],
    userNotes: userNotes.slice(0, MAX_MESSAGE_CHARS),
    attachTelemetry: body.attachTelemetry !== false,
    context: {
      surface: typeof context?.surface === "string" ? context.surface : undefined,
      path: typeof context?.path === "string" ? context.path : undefined,
    },
    clientTimestamp: typeof body.clientTimestamp === "string" ? body.clientTimestamp : undefined,
    clientLatencyMs:
      typeof body.clientLatencyMs === "number" && Number.isFinite(body.clientLatencyMs)
        ? Math.max(0, Math.round(body.clientLatencyMs))
        : undefined,
    frameworkContext:
      typeof body.frameworkContext === "string" ? body.frameworkContext.slice(0, 128) : undefined,
  };
}

export function buildInTenantSupportTicketSummary(input: {
  ticket: InTenantSupportTicketInput;
  tenantId: string;
  telemetry?: InTenantSupportTelemetry | null;
}): string {
  const telemetryBlock =
    input.ticket.attachTelemetry && input.telemetry
      ? `\n${formatInTenantSupportTelemetryForCrm(input.telemetry)}\n`
      : "\n--- Forensic Telemetry ---\nOperator opted out of diagnostic attachment.\n";

  return [
    `${PENDING_SUPPORT_INTAKE_TAG} Re: In-tenant support ticket`,
    `--- Urgency ---`,
    input.ticket.urgency,
    "--- Objective ---",
    `${input.ticket.objective} | ${supportObjectiveLabel(input.ticket.objective)}`,
    "--- Operator Details ---",
    input.ticket.userNotes.trim() || "(none — structured objective only)",
    "--- Route / Framework ---",
    `framework=${input.ticket.frameworkContext ?? "UNKNOWN"} | path=${input.ticket.context?.path ?? "n/a"} | surface=${input.ticket.context?.surface ?? "n/a"}`,
    `clientTimestamp=${input.ticket.clientTimestamp ?? "n/a"} | clientLatencyMs=${input.ticket.clientLatencyMs ?? "n/a"}`,
    telemetryBlock,
    "--- Tracking Core ---",
    `Execution Source: inTenantSupportTicket | Tenant: ${input.tenantId}`,
  ]
    .join("\n")
    .slice(0, MAX_DRAFT_SUMMARY_CHARS);
}

export async function logInTenantSupportTicket(input: {
  tenantId: string;
  contactId: string;
  ticket: InTenantSupportTicketInput;
  telemetry?: InTenantSupportTelemetry | null;
}): Promise<string> {
  const interaction = await prisma.ironboardCrmInteraction.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId,
      contactId: input.contactId,
      channel: "SYSTEM_AGENT",
      summary: buildInTenantSupportTicketSummary({
        ticket: input.ticket,
        tenantId: input.tenantId,
        telemetry: input.telemetry,
      }),
      occurredAt: new Date(),
    },
  });
  return interaction.id;
}

export async function dispatchInTenantSupportTicket(input: {
  tenantId: string;
  ticket: InTenantSupportTicketInput;
  telemetry?: InTenantSupportTelemetry | null;
}): Promise<{ interactionId: string; reply: string }> {
  const contact = await resolveSupportConsoleContact(input.tenantId);

  const interactionId = await logInTenantSupportTicket({
    tenantId: input.tenantId,
    contactId: contact.id,
    ticket: input.ticket,
    telemetry: input.ticket.attachTelemetry ? input.telemetry : null,
  });

  return {
    interactionId,
    reply: IN_TENANT_SUPPORT_DISPATCHED_MESSAGE,
  };
}
