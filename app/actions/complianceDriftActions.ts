"use server";

import { readFileSync } from "fs";
import { join } from "path";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  readComplianceDriftState,
  writeComplianceDriftState,
} from "@/app/lib/complianceDriftState";
import { hashAmendmentDraftId } from "@/app/services/irontallyGapAnalysis";
import { runIronsightRegulatoryPoll } from "@/app/services/ironsightMonitor";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";
import { GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS } from "@/app/utils/financialRisk";
import { resolveGeminiFlashModel } from "@/app/config/geminiModels";

const AMENDMENT_MODEL = resolveGeminiFlashModel(process.env.GEMINI_IRONSIGHT_MODEL);

function readTasMdExcerpt(maxChars = 12_000): string {
  try {
    const path = join(process.cwd(), "docs", "TAS.md");
    return readFileSync(path, "utf8").slice(0, maxChars);
  } catch {
    return "";
  }
}

export async function pollRegulatoryFeedsAction() {
  const poll = await runIronsightRegulatoryPoll();
  const maturity = await recalculateSystemMaturityScore({ trigger: "MANUAL_REGULATORY_POLL" });
  return { poll, maturityScore: maturity.current.score };
}

export async function generateTasAmendmentAction(alertId: string): Promise<
  | { ok: true; draftId: string; markdown: string }
  | { ok: false; error: string }
> {
  const state = await readComplianceDriftState();
  const alert = state.alerts.find((a) => a.id === alertId);
  if (!alert) return { ok: false, error: "Drift alert not found." };

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured." };
  }

  const tasExcerpt = readTasMdExcerpt();
  const google = createGoogleGenerativeAI({ apiKey });

  const prompt = `You are Irontally (Agent 19), Ironframe GRC Framework Mapper.

Draft a formal TAS.md AMENDMENT PROPOSAL for Section ${alert.tasSection} (${alert.tasSectionTitle}) only.

REGULATORY DRIVER:
${alert.lawSummary}
${alert.lawExcerpt}

CURRENT CONSTITUTIONAL POSTURE (${alert.agentLabel}):
${alert.tasCurrentPosture}

REQUIREMENTS:
- Satisfy the new regulation (including any shorter breach-notification window).
- Preserve the $${GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS}B governed security posture and BIGINT financial lock.
- Reference Ironcast / Irongate / Irontally agents where appropriate.
- Output markdown with: ## Amendment Summary, ## Revised Section Text, ## Control Mapping, ## Implementation Notes.
- Do NOT change unrelated TAS sections.

TAS.md excerpt for context:
${tasExcerpt.slice(0, 8000)}`;

  try {
    const { text } = await generateText({
      model: google(AMENDMENT_MODEL),
      prompt,
      maxOutputTokens: 4096,
    });

    const draftId = hashAmendmentDraftId(alertId);
    const markdown = text.trim();
    const nextAlerts = state.alerts.map((a) =>
      a.id === alertId ? { ...a, amendmentDraftId: draftId, status: "ACKNOWLEDGED" as const } : a,
    );
    await writeComplianceDriftState({ ...state, alerts: nextAlerts });

    return { ok: true, draftId, markdown };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Amendment generation failed.",
    };
  }
}

export async function getComplianceDriftDashboardAction() {
  const state = await readComplianceDriftState();
  const { getActiveComplianceDriftMaturityPenalty } = await import(
    "@/app/services/complianceDriftMaturityPenalty"
  );
  const penalty = await getActiveComplianceDriftMaturityPenalty();
  return {
    state,
    activeDrifts: state.alerts.filter((a) => a.status === "ACTIVE" && a.isDriftDetected),
    maturityPenalty: penalty,
  };
}
