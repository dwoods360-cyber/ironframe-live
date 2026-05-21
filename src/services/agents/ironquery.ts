import { createHash } from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";

const IRONQUERY_MODEL = "gemini-1.5-flash";
const MAX_PAYLOAD_CHARS = 12_000;

const FALLBACK_INSIGHT =
  "Ironquery could not reach the model to analyze this payload. Treat it as unreviewed: scan the details and Ironlock flags, then choose [ESCALATE TO SECOPS] if anything is ambiguous or hostile.";

export type IronqueryRecommendedAction =
  | "PROMOTE_TO_LEDGER"
  | "REJECT_AND_ARCHIVE"
  | "ESCALATE_TO_SECOPS"
  | "UNREVIEWED";

export type IronqueryAnalystResult = {
  insight: string;
  summarySignature: string;
  recommendedAction: IronqueryRecommendedAction;
};

function resolveApiKey(): string | undefined {
  return (
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  );
}

function payloadToString(payload: string | Record<string, unknown>): string {
  if (typeof payload === "string") {
    return payload.length > MAX_PAYLOAD_CHARS
      ? `${payload.slice(0, MAX_PAYLOAD_CHARS)}\n…[truncated]`
      : payload;
  }
  const serialized = JSON.stringify(payload);
  return serialized.length > MAX_PAYLOAD_CHARS
    ? `${serialized.slice(0, MAX_PAYLOAD_CHARS)}\n…[truncated]`
    : serialized;
}

function buildAnalystPrompt(payloadText: string): string {
  return `You are Ironquery (Agent 15), the Interactive Analyst / Copilot for a GRC platform.
Perform structured query analysis (RAG-style) over this sanitized forensic payload.
In exactly two concise sentences: explain the core risk and recommend ONE action:
[PROMOTE TO LEDGER], [REJECT AND ARCHIVE], or [ESCALATE TO SECOPS].

Payload:
${payloadText}`;
}

function parseRecommendedAction(insight: string): IronqueryRecommendedAction {
  const upper = insight.toUpperCase();
  if (upper.includes("[PROMOTE TO LEDGER]") || upper.includes("PROMOTE TO LEDGER")) {
    return "PROMOTE_TO_LEDGER";
  }
  if (upper.includes("[REJECT AND ARCHIVE]") || upper.includes("REJECT AND ARCHIVE")) {
    return "REJECT_AND_ARCHIVE";
  }
  if (upper.includes("[ESCALATE TO SECOPS]") || upper.includes("ESCALATE TO SECOPS")) {
    return "ESCALATE_TO_SECOPS";
  }
  return "UNREVIEWED";
}

/** SHA-256 evidence-chain fingerprint (first 16 hex chars) for Audit Intelligence / ledger correlation. */
export function ironquerySummarySignature(
  payloadText: string,
  insight: string,
  tenantId?: string,
): string {
  const stamp = tenantId?.trim() ? `${tenantId.trim()}|` : "";
  return createHash("sha256")
    .update(`${stamp}${payloadText}|${insight}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Epic 16 / TAS §3 — Ironquery analyst RAG handler over sanitized or raw forensic payload.
 */
export async function generateIronqueryAnalystInsight(
  payload: string | Record<string, unknown>,
  options?: { tenantId?: string },
): Promise<IronqueryAnalystResult> {
  const payloadText = payloadToString(payload);
  const apiKey = resolveApiKey();

  let insight = FALLBACK_INSIGHT;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: IRONQUERY_MODEL });
      const result = await model.generateContent(buildAnalystPrompt(payloadText));
      const text = result.response.text()?.trim();
      if (text) insight = text;
    } catch (e) {
      console.warn("[ironquery] analyst generateContent failed:", e);
    }
  } else {
    console.warn("[ironquery] GOOGLE_API_KEY / GEMINI_API_KEY missing; using fallback insight.");
  }

  const tenantId =
    options?.tenantId ??
    (typeof payload === "object" && payload !== null
      ? String(
          (payload as Record<string, unknown>).tenant_id ??
            (payload as Record<string, unknown>).tenantId ??
            "",
        ).trim() || undefined
      : undefined);

  return {
    insight,
    summarySignature: ironquerySummarySignature(payloadText, insight, tenantId),
    recommendedAction: parseRecommendedAction(insight),
  };
}

/**
 * DMZ / clearance UI — plain-text disposition hint (wraps analyst handler).
 */
export async function generateIronqueryInsight(payload: string): Promise<string> {
  const { insight } = await generateIronqueryAnalystInsight(payload);
  return insight;
}
