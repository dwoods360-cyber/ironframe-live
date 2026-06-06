/**
 * Ironboard deliberation CLI — in-memory LangGraph only (no ironframe-live DB).
 * Run from Ironboard/: npm run deliberate
 */
import { corporateBoardGraph } from "../src/orchestrator.js";
import { graphStateToBoardState } from "../src/state.js";
import { ENTERPRISE_BASELINE_CENTS } from "../src/prompts.js";
import { FLAGSHIP_IRONFRAME_SAAS, INITIAL_PORTFOLIO } from "../src/seed.js";

/** $5.0M expansion budget — whole-integer cents only (no floats). */
const EXPANSION_BUDGET_CENTS = 500_000_000n;

async function runDeliberation() {
  console.log("🚀 IRONBOARD — EXECUTIVE DELIBERATION (standalone, no SaaS DB)");

  const initialGraphState = {
    products: INITIAL_PORTFOLIO,
    activeTargetProductId: FLAGSHIP_IRONFRAME_SAAS.id,
    businessObjective:
      "Launch an aggressive market expansion module into the cyber insurance underwriting space to capture our initial enterprise beachhead.",
    financialProjectionsCents: EXPANSION_BUDGET_CENTS.toString(),
    legalReviewCleared: false,
    departmentalApprovals: [] as string[],
    executiveSummaryLog: [
      `Board session convened — portfolio anchor: ${FLAGSHIP_IRONFRAME_SAAS.name} (${FLAGSHIP_IRONFRAME_SAAS.currentStatus}).`,
    ],
    activeSpeaker: "CEO",
  };

  try {
    console.log("🧠 Executing LangGraph cognitive node deliberation...");
    const finalGraphState = await corporateBoardGraph.invoke(initialGraphState);
    const finalState = graphStateToBoardState(finalGraphState);

    console.log("\n--- Executive summary log ---");
    finalState.executiveSummaryLog.forEach((log) => console.log(`  - ${log}`));
    console.log(`\nActive target product: ${finalState.activeTargetProductId}`);
    console.log(`Legal clearance: ${finalState.legalReviewCleared ? "CLEARED" : "DENIED"}`);
    console.log(`Budget cents: ${finalState.financialProjectionsCents.toString()}n`);
    if (finalGraphState.documentationArtifacts?.length) {
      console.log("\nDocumentation artifacts (content-firewall cleared):");
      finalGraphState.documentationArtifacts.forEach((p) => console.log(`  - docs/${p}`));
    }
    console.log("\nEnterprise baseline profile (cents):");
    console.log(`  Medshield: ${ENTERPRISE_BASELINE_CENTS.medshield}`);
    console.log(`  Vaultbank: ${ENTERPRISE_BASELINE_CENTS.vaultbank}`);
    console.log(`  Gridcore:  ${ENTERPRISE_BASELINE_CENTS.gridcore}`);
    console.log("\nPortfolio:");
    finalState.products.forEach((p) =>
      console.log(`  - ${p.id}: ${p.name} [${p.type}] — ${p.currentStatus}`),
    );
    console.log("\n==============================================================\n");
  } catch (error) {
    console.error("⨯ Ironboard deliberation failed:", error);
    process.exitCode = 1;
  }
}

void runDeliberation();
