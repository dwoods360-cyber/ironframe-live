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
export class IronScribe {
  private static model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-pro",
    maxOutputTokens: 2048,
    apiKey: process.env.GOOGLE_API_KEY,
  }).withStructuredOutput(ExtractionSchema);

  static async extract(state: typeof SovereignGraphState.State): Promise<Partial<typeof SovereignGraphState.State>> {
    const rawText = state.raw_payload?.text || "";

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
