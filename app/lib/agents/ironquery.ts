import { GoogleGenerativeAI } from "@google/generative-ai";

const IRONQUERY_MODEL = "gemini-1.5-flash";
const MAX_PAYLOAD_CHARS = 12_000;

const FALLBACK_INSIGHT =
  "Ironquery could not reach the model to analyze this DMZ payload. Treat it as unreviewed: scan the details and Ironlock flags, then choose [ESCALATE TO SECOPS] if anything is ambiguous or hostile.";

function buildPrompt(payload: string): string {
  return `You are Ironquery, an expert GRC and SecOps analyst assistant. Read the following JSON payload that just hit our DMZ. In exactly two concise sentences, explain the core risk and recommend ONE of the following actions for the human analyst: [PROMOTE TO LEDGER], [REJECT AND ARCHIVE], or [ESCALATE TO SECOPS]. Payload: ${payload}`;
}

/**
 * Ironquery — autonomous disposition hint for DMZ ingress (runs after Ironlock; safe fallback on failure).
 */
export async function generateIronqueryInsight(payload: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    console.warn("[ironquery] GEMINI_API_KEY missing; using fallback insight.");
    return FALLBACK_INSIGHT;
  }

  const trimmed =
    payload.length > MAX_PAYLOAD_CHARS
      ? `${payload.slice(0, MAX_PAYLOAD_CHARS)}\n…[truncated]`
      : payload;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: IRONQUERY_MODEL });
    const result = await model.generateContent(buildPrompt(trimmed));
    const text = result.response.text()?.trim();
    if (text) return text;
    return FALLBACK_INSIGHT;
  } catch (e) {
    console.warn("[ironquery] generateContent failed:", e);
    return FALLBACK_INSIGHT;
  }
}
