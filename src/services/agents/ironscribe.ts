import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { SovereignGraphState } from '../orchestration/state';

// SOVEREIGN EXTRACTION SCHEMA
const ExtractionSchema = z.object({
  vendor_id: z.string().uuid().describe("The unique identifier for the vendor found in the document."),
  amount_cents: z.number().int().positive().describe("The total amount in integer cents. Multiply dollars by 100."),
  tenant_type: z.enum(["MEDSHIELD", "VAULTBANK", "GRIDCORE"]).describe("The specific protocol baseline to audit against."),
});

/**
 * AGENT 5 (IRONSCRIBE) - LIVE GEMINI EXTRACTION
 * Mandate: Absolute schema enforcement using Gemini 1.5 Pro.
 */
const IRONSCRIBE_MODEL =
  process.env.GEMINI_IRONSCRIBE_MODEL?.trim() ||
  process.env.GEMINI_IRONSIGHT_MODEL?.trim() ||
  "gemini-2.5-flash";

export class IronScribe {
  private static model = new ChatGoogleGenerativeAI({
    model: IRONSCRIBE_MODEL,
    maxOutputTokens: 2048,
    apiKey: process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY,
  }).withStructuredOutput(ExtractionSchema);

  /** Irongate structured telemetry (no document text) — skip Gemini when schema fields are already present. */
  private static extractFromStructuredTelemetry(
    raw: Record<string, unknown>,
  ): z.infer<typeof ExtractionSchema> | null {
    if (String(raw.telemetryType ?? "").toUpperCase() !== "VULNERABILITY") return null;
    const nested =
      raw.payload != null && typeof raw.payload === "object" && !Array.isArray(raw.payload)
        ? (raw.payload as Record<string, unknown>)
        : null;
    const centsRaw = nested?.assetValueCents ?? raw.assetValueCents;
    const cents =
      typeof centsRaw === "number" && Number.isFinite(centsRaw)
        ? Math.round(centsRaw)
        : typeof centsRaw === "string" && /^\d+$/.test(centsRaw.trim())
          ? Number.parseInt(centsRaw.trim(), 10)
          : NaN;
    if (!Number.isFinite(cents) || cents <= 0) return null;
    return {
      vendor_id: "550e8400-e29b-41d4-a716-446655440000",
      amount_cents: cents,
      tenant_type: "MEDSHIELD",
    };
  }

  static async extract(state: typeof SovereignGraphState.State): Promise<Partial<typeof SovereignGraphState.State>> {
    const raw =
      state.raw_payload != null && typeof state.raw_payload === "object" && !Array.isArray(state.raw_payload)
        ? (state.raw_payload as Record<string, unknown>)
        : {};
    const structured = this.extractFromStructuredTelemetry(raw);
    if (structured) {
      return {
        current_agent: "IRONTRUST",
        raw_payload: structured,
        agent_logs: [
          `Ironscribe (structured telemetry) sealed VULNERABILITY ingress for ${String(raw.alertId ?? "signal")} — ${structured.amount_cents} cents.`,
        ],
        status: "PROCESSING",
      };
    }

    const rawText = typeof raw.text === "string" ? raw.text : "";

    try {
      // LIVE AI CALL: Gemini analyzes the raw text and returns the validated Zod object
      const extraction = await this.model.invoke(
        `Extract the financial data from this document text.
         REMEMBER: Convert all dollar amounts to integer CENTS (e.g., $10.00 = 1000).
         DOCUMENT TEXT: ${rawText}`
      );

      return {
        current_agent: "IRONTRUST",
        raw_payload: extraction,
        agent_logs: [`Ironscribe (Gemini 1.5 Pro) successfully extracted data for Vendor ${extraction.vendor_id}`],
        status: "PROCESSING"
      };
    } catch (error) {
      console.error("Agent 5 LLM Error:", error);
      return {
        current_agent: "END",
        status: "FAILED",
        agent_logs: ["Ironscribe failed: LLM extraction error or schema violation."]
      };
    }
  }
}
