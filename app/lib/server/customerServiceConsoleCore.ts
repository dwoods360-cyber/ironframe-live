import { randomUUID } from "node:crypto";

import { GoogleGenAI } from "@google/genai";

import { PENDING_DRAFT_TAG } from "@/app/lib/server/approvalQueueCore";
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

export function buildSupportConsolePendingDraftSummary(input: {
  inquiry: string;
  proposedReply: string;
  tenantId: string;
}): string {
  return [
    `${PENDING_DRAFT_TAG} Re: Support console inquiry`,
    "--- Incoming Query ---",
    input.inquiry.trim(),
    "--- Agent Proposed Reply Text ---",
    input.proposedReply.trim(),
    "--- Tracking Core ---",
    `Execution Source: agentCustomerServiceConsole | Tenant: ${input.tenantId}`,
  ]
    .join("\n")
    .slice(0, MAX_DRAFT_SUMMARY_CHARS);
}

export async function logPendingSupportConsoleDraft(input: {
  tenantId: string;
  contactId: string;
  inquiry: string;
  proposedReply: string;
}): Promise<string> {
  const interaction = await prisma.ironboardCrmInteraction.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId,
      contactId: input.contactId,
      channel: "SYSTEM_AGENT",
      summary: buildSupportConsolePendingDraftSummary(input),
      occurredAt: new Date(),
    },
  });
  return interaction.id;
}

export const CUSTOMER_SERVICE_QUEUED_MESSAGE =
  "Your inquiry has been queued for operator review. A platform administrator will verify the proposed resolution and follow up shortly.";
