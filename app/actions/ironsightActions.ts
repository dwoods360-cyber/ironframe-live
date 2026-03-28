'use server';

import { revalidatePath } from 'next/cache';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { mergeIngestionDetailsPatch } from '@/app/utils/ingestionDetailsMerge';

const IRONSIGHT_TRACE_MODEL =
  process.env.GEMINI_IRONSIGHT_MODEL?.trim() || 'gemini-2.5-flash';

/** Strict GRC blast-radius output for Active Risk UI (human-in-the-loop actions only). */
const ironsightAiTraceSchema = z.object({
  status: z.literal('COMPLETED'),
  report: z
    .string()
    .min(40)
    .max(12_000)
    .describe('Structured blast-radius narrative: dependencies, data flows, and GRC-relevant exposure.'),
  actions: z
    .array(
      z.object({
        label: z.string().min(2).max(80).describe('Short uppercase-style action label, e.g. ISOLATE DB'),
        actionId: z.string().min(1).max(64).describe('Stable machine id, e.g. iso-db-1'),
      }),
    )
    .min(1)
    .max(2)
    .describe('Exactly 1–2 realistic internal remediation intents (no autonomous execution).'),
  impactedAssets: z
    .array(z.string().min(1).max(120))
    .max(3)
    .describe(
      'List of 1–3 specific internal systems, databases, or services affected by the threat. Use an empty array if none apply.',
    ),
  complianceTags: z
    .array(z.string().min(1).max(96))
    .max(3)
    .describe(
      "List of 1-3 regulatory frameworks or specific controls impacted by this threat (e.g., 'SOC2: CC7.1', 'ISO 27001: A.12', 'HIPAA', 'GDPR').",
    ),
});

export type IronsightAiTracePayload = z.infer<typeof ironsightAiTraceSchema> & {
  generatedAt?: string;
};

function messageFromUnknownError(error: unknown): string {
  if (error instanceof Error && typeof error.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m.trim();
  }
  if (typeof error === 'string' && error.trim()) return error.trim();
  return 'Unknown AI error';
}

/** Safe for JSON/text column: strip NULs, cap length for UI + DB. */
function safeIronsightErrorReportForDb(message: string): string {
  const noNulls = message.replace(/\0/g, '');
  const capped = noNulls.trim().slice(0, 12_000);
  return capped.length > 0 ? capped : 'Unknown AI error';
}

const CENTS_PER_DOLLAR = 100n;
const DOLLARS_PER_MILLION = 1_000_000n;

/** Thousands separators for a base-ten integer string — no floating-point. */
function insertThousandsSeparators(integerDigits: string): string {
  const neg = integerDigits.startsWith('-');
  const digits = neg ? integerDigits.slice(1) : integerDigits;
  if (digits.length === 0) return '0';
  const parts: string[] = [];
  let i = digits.length;
  while (i > 0) {
    const start = Math.max(0, i - 3);
    parts.unshift(digits.slice(start, i));
    i = start;
  }
  return (neg ? '-' : '') + parts.join(',');
}

/**
 * Format BigInt cents for Irontrust work-note copy (e.g. "$1.7M" or "$1,700,000.00").
 * Uses only BigInt and string ops — no float arithmetic on money.
 */
function formatBigIntCentsForIrontrustNote(cents: bigint): string {
  const abs = cents < 0n ? -cents : cents;
  if (abs === 0n) return '$0';
  const dollars = abs / CENTS_PER_DOLLAR;
  const fracCents = abs % CENTS_PER_DOLLAR;
  if (dollars >= DOLLARS_PER_MILLION) {
    const wholeM = dollars / DOLLARS_PER_MILLION;
    const remDollars = dollars % DOLLARS_PER_MILLION;
    const tenth = (remDollars * 10n) / DOLLARS_PER_MILLION;
    if (tenth === 0n) return `$${wholeM.toString()}M`;
    return `$${wholeM.toString()}.${tenth.toString()}M`;
  }
  const frac = fracCents.toString().padStart(2, '0');
  return `$${insertThousandsSeparators(dollars.toString())}.${frac}`;
}

function sanitizeActionLabelForNote(label: string): string {
  return label.replace(/\s+/g, ' ').replace(/[\r\n\u0000]/g, '').trim().slice(0, 200) || 'Action';
}

function buildIronsightPrompt(ctx: {
  title: string;
  sourceAgent: string;
  targetEntity: string;
  score: number;
  liabilityMillions: string;
}): string {
  return `You are Ironsight, a strict GRC blast-radius mapping agent for enterprise security operations.
You do NOT execute changes. You only produce an evidence-style dependency trace and 1–2 suggested INTERNAL containment actions an analyst might later authorize.

Threat context:
- Title: ${ctx.title}
- Source agent: ${ctx.sourceAgent}
- Target entity / sector context: ${ctx.targetEntity}
- Risk score (1–10 scale): ${ctx.score}
- Financial exposure (approx. $M): ${ctx.liabilityMillions}

Requirements:
1. Write a concise but technical report mapping plausible blast radius (systems, data classes, trust boundaries). Stay generic—no real vendor names unless implied by the title.
2. Populate impactedAssets with 0–3 short labels for internal systems, databases, or services in scope (e.g. "Claims API", "Patient DB replica", "IdP federation"). Use [] if no plausible internal dependencies.
3. Populate complianceTags with 1–3 regulatory or control identifiers most relevant to this threat (e.g. SOC2: CC7.1, HIPAA Security Rule, GDPR Art. 32). Use [] only if none clearly apply.
4. Propose exactly 1 or 2 action objects with realistic internal ops labels (e.g. "ISOLATE DB", "ROTATE API KEYS", "SEGMENT VLAN", "DISABLE SERVICE ACCOUNT").
5. actionId must be short, unique slugs (e.g. isolate-db-primary, rotate-keys-edge).
6. status must be the literal string COMPLETED.
7. Do not claim automated remediation was performed.`;
}

export type TriggerDeepTraceResult =
  | { success: true; aiTrace: IronsightAiTracePayload }
  | { success: false; error: string };

/**
 * Ironsight deep trace via Gemini (Vercel AI SDK). Persists under ThreatEvent.ingestionDetails.aiTrace (JSON text).
 */
export async function triggerDeepTrace(threatId: string): Promise<TriggerDeepTraceResult> {
  const id = threatId?.trim();
  if (!id) {
    return { success: false, error: 'Missing threat id.' };
  }

  type TraceRow = {
    id: string;
    title: string;
    targetEntity: string;
    sourceAgent: string;
    score: number;
    financialRisk_cents: bigint;
    ingestionDetails: string | null;
  };

  let row: TraceRow | null = null;

  try {
    row = await prisma.threatEvent.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        targetEntity: true,
        sourceAgent: true,
        score: true,
        financialRisk_cents: true,
        ingestionDetails: true,
      },
    });

    if (!row) {
      return { success: false, error: 'Threat not found.' };
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return { success: false, error: 'GEMINI_API_KEY is not configured.' };
    }

    const liabilityMillions = (Number(row.financialRisk_cents) / 100_000_000).toFixed(2);
    const prompt = buildIronsightPrompt({
      title: row.title,
      sourceAgent: row.sourceAgent,
      targetEntity: row.targetEntity,
      score: row.score,
      liabilityMillions,
    });

    const google = createGoogleGenerativeAI({ apiKey });
    const { object } = await generateObject({
      model: google(IRONSIGHT_TRACE_MODEL),
      schema: ironsightAiTraceSchema,
      prompt,
    });

    const aiTrace: IronsightAiTracePayload = {
      ...object,
      generatedAt: new Date().toISOString(),
    };

    const nextIngestion = mergeIngestionDetailsPatch(row.ingestionDetails, {
      aiTrace: aiTrace as unknown as Prisma.InputJsonValue,
    });

    await prisma.threatEvent.update({
      where: { id },
      data: { ingestionDetails: nextIngestion },
    });

    revalidatePath('/');
    return { success: true, aiTrace };
  } catch (error: unknown) {
    console.error('[IRONSIGHT_ERROR]', error);

    const report = safeIronsightErrorReportForDb(messageFromUnknownError(error));

    if (row) {
      try {
        const nextIngestion = mergeIngestionDetailsPatch(row.ingestionDetails, {
          aiTrace: {
            status: 'FAILED',
            report,
            actions: [],
            impactedAssets: [],
            complianceTags: [],
          },
        });
        await prisma.threatEvent.update({
          where: { id },
          data: { ingestionDetails: nextIngestion },
        });
      } catch (persistErr) {
        console.error('[IRONSIGHT_ERROR] Failed to persist FAILED aiTrace', persistErr);
      }
    }

    revalidatePath('/');
    return { success: false, error: report };
  }
}

export type ExecuteTraceActionResult = { success: true } | { success: false; error: string };

/**
 * Human-in-the-loop: record operator authorization, apply 50% BigInt residual liability, audit + work note.
 */
export async function executeTraceAction(
  threatId: string,
  actionId: string,
  actionLabel: string,
  operatorId: string,
): Promise<ExecuteTraceActionResult> {
  const id = threatId?.trim();
  if (!id) {
    return { success: false, error: 'Missing threat id.' };
  }
  const op = operatorId?.trim() || 'unknown-operator';
  const aid = actionId?.trim() || 'unknown-action';
  const label = sanitizeActionLabelForNote(actionLabel?.trim() || aid);

  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.threatEvent.findUnique({
        where: { id },
        select: { id: true, financialRisk_cents: true },
      });
      if (!row) {
        throw new Error('THREAT_NOT_FOUND');
      }

      const currentCents = row.financialRisk_cents;
      const residualRiskCents = currentCents / 2n;
      const mitigatedCents = currentCents - residualRiskCents;

      await tx.threatEvent.update({
        where: { id },
        data: { financialRisk_cents: residualRiskCents },
      });

      const mitigatedFormatted = formatBigIntCentsForIrontrustNote(mitigatedCents);
      const noteText = `[IRONTRUST] Execution Authorized: ${label}. Residual Risk reduced by ${mitigatedFormatted}.`;

      await tx.workNote.create({
        data: {
          text: noteText,
          operatorId: op,
          threatId: id,
        },
      });

      const justificationPayload = JSON.stringify({
        actionId: aid,
        actionLabel: label,
        operatorId: op,
        mitigatedCents: mitigatedCents.toString(),
        residualRiskCents: residualRiskCents.toString(),
      });

      await tx.auditLog.create({
        data: {
          action: 'AI_REMEDIATION_TRIGGERED',
          justification: justificationPayload,
          operatorId: op,
          threatId: id,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'THREAT_NOT_FOUND') {
      return { success: false, error: 'Threat not found.' };
    }
    console.error('[irontrust] executeTraceAction failed', e);
    const message = e instanceof Error ? e.message : 'Execution failed.';
    return { success: false, error: message };
  }

  revalidatePath('/');
  return { success: true };
}
