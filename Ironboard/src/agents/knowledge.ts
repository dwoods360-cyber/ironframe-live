import { BoardStateAnnotation } from "../state.js";
import { instantiateBoardAgentModel } from "../config/modelFactory.js";
import { INSUFFICIENT_CONTEXT_RESPONSE } from "../validation/contentFirewall.js";
import { writeHubAssetSafely } from "../io/safeDocsWriter.js";

function buildTrainerDraft(state: typeof BoardStateAnnotation.State): string {
  return [
    "# Track 1 classroom milestone",
    "",
    "source-file: docs/training/high-school/index.html",
    "",
    "AGENT STATUS PULSE is documented in the top quadrant of the Left Pane per docs/hub.md.",
    "",
    `Board objective anchor: ${state.businessObjective}`,
    "",
    "Demo-seed baseline cents (SYNTHETIC_DEMO_SEED): medshield 1110000000, vaultbank 590000000, gridcore 470000000.",
  ].join("\n");
}

function buildWriterDraft(state: typeof BoardStateAnnotation.State): string {
  return [
    "<!DOCTYPE html>",
    "<html lang=\"en\"><head><meta charset=\"UTF-8\" /><title>Practitioner spec</title></head>",
    "<body>",
    "<!-- source-file: docs/technical/data_dictionary_and_api_track2.html -->",
    `<p>Financial integrity: amount_cents: 1110000000 (demo-seed slug medshield — SYNTHETIC_DEMO_SEED)</p>`,
    `<p>Active product: ${state.activeTargetProductId}</p>`,
    "</body></html>",
  ].join("\n");
}

export async function agentUserTrainer(
  state: typeof BoardStateAnnotation.State,
): Promise<Partial<typeof BoardStateAnnotation.State>> {
  const model = instantiateBoardAgentModel("TRAINER");

  if (!state.legalReviewCleared) {
    return {
      executiveSummaryLog: [INSUFFICIENT_CONTEXT_RESPONSE],
      documentationArtifacts: [],
    };
  }

  const draft = buildTrainerDraft(state);
  const relativePath = "training/ironboard/trainer-milestone.md";

  writeHubAssetSafely(relativePath, draft, "TRAINER");

  return {
    executiveSummaryLog: [
      `[Trainer] Milestone written via content firewall (namespace=${model.vectorNamespace}, temperature=${model.generation.temperature}). ref: ${relativePath}`,
    ],
    documentationArtifacts: [relativePath],
  };
}

export async function agentTechnicalWriter(
  state: typeof BoardStateAnnotation.State,
): Promise<Partial<typeof BoardStateAnnotation.State>> {
  const model = instantiateBoardAgentModel("WRITER");

  if (!state.legalReviewCleared) {
    return {
      executiveSummaryLog: [INSUFFICIENT_CONTEXT_RESPONSE],
    };
  }

  const draft = buildWriterDraft(state);
  const relativePath = "training/ironboard/writer-hub-fragment.html";

  writeHubAssetSafely(relativePath, draft, "WRITER");

  return {
    executiveSummaryLog: [
      `[Writer] Hub asset staged via content firewall (namespace=${model.vectorNamespace}, topP=${model.generation.topP}). ref: ${relativePath}`,
    ],
    documentationArtifacts: [relativePath],
  };
}
