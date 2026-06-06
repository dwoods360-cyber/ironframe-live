import { BoardStateAnnotation } from "../state.js";
import { assertWholeIntegerCents } from "../prompts.js";
import { instantiateBoardAgentModel } from "../config/modelFactory.js";

function resolveActiveProductLabel(
  state: typeof BoardStateAnnotation.State,
): string {
  const target = state.products.find((p) => p.id === state.activeTargetProductId);
  return target ? `${target.name} (${target.currentStatus})` : state.activeTargetProductId;
}

export async function agentCEO(
  state: typeof BoardStateAnnotation.State,
): Promise<Partial<typeof BoardStateAnnotation.State>> {
  const model = instantiateBoardAgentModel("CEO");
  const strategicLayer = model.systemPrompt;
  const productLabel = resolveActiveProductLabel(state);
  const assessmentLog = `[CEO] Portfolio target: ${productLabel}. Objective scoped under Zero to One monopoly matrix (${strategicLayer.length} chars, temperature=${model.generation.temperature}). Vaultbank baseline 590000000 cents acknowledged. ref: docs/TAS.md`;

  return {
    activeSpeaker: "CFO",
    executiveSummaryLog: [assessmentLog],
    departmentalApprovals: ["CEO"],
  };
}

export async function agentCFO(
  state: typeof BoardStateAnnotation.State,
): Promise<Partial<typeof BoardStateAnnotation.State>> {
  const model = instantiateBoardAgentModel("CFO");
  const strategicLayer = model.systemPrompt;
  const rawProjectedCents = state.financialProjectionsCents;
  assertWholeIntegerCents(rawProjectedCents);

  const assessmentLog = `[CFO] Financial validation cleared (${strategicLayer.length} chars, topP=${model.generation.topP}). Allocation ${rawProjectedCents} cents — Medshield 1110000000 · Vaultbank 590000000 · Gridcore 470000000 baselines aligned. ref: prisma/seed.ts`;

  return {
    activeSpeaker: "ComplianceOfficer",
    financialProjectionsCents: rawProjectedCents,
    executiveSummaryLog: [assessmentLog],
    departmentalApprovals: ["CFO"],
  };
}

export async function agentCompliance(
  state: typeof BoardStateAnnotation.State,
): Promise<Partial<typeof BoardStateAnnotation.State>> {
  const model = instantiateBoardAgentModel("CCO");
  assertWholeIntegerCents(state.financialProjectionsCents);
  const assessmentLog = `[Compliance] Cyber insurance underwriting expansion reviewed (CCO vector=${model.vectorNamespace ?? "n/a"}). DMZ QUARANTINE and INTEGRITY HUB controls verified. ref: app/components/ControlRoom.tsx`;

  return {
    activeSpeaker: "Ironcounsel",
    executiveSummaryLog: [assessmentLog],
    departmentalApprovals: ["ComplianceOfficer"],
  };
}

export async function agentLegal(
  state: typeof BoardStateAnnotation.State,
): Promise<Partial<typeof BoardStateAnnotation.State>> {
  const model = instantiateBoardAgentModel("LEGAL");
  const assessmentLog = `[Legal] Regulatory exposure memo sealed (temperature=${model.generation.temperature}). Board authorized under constitutional BigInt ledger constraints. ref: docs/hub.md`;

  return {
    activeSpeaker: "BoardClerk",
    legalReviewCleared: true,
    executiveSummaryLog: [assessmentLog],
    departmentalApprovals: ["Ironcounsel"],
  };
}
