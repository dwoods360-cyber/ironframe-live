import { BOARD_ORCHESTRATION_CONFIG } from './config.js';
import { IRONFRAME_CORPORATE_PILLARS } from './corporatePillars.js';
import { CORE_COMPANY_PRODUCTS, CompanyProductProfile } from './productRegistry.js';
import { AGENTIC_BOARD_ROSTER as STATIC_BOARD_ROSTER, type BoardPersona } from '../staticContext.js';

export type AgenticPersona = BoardPersona;

export interface BusinessFrameworkContext {
  title: string;
  author: string;
  coreConcepts: string[];
  strategicInvariants: string;
}

// 📚 THE COMPLETE 8-BOOK BUSINESS STRATEGY & KNOWLEDGE VAULT
export const STRATEGIC_KNOWLEDGE_VAULT: BusinessFrameworkContext[] = [
  { title: "The Discipline of Market Leaders", author: "Treacy & Wiersema", coreConcepts: ["Operational Excellence", "Product Leadership", "Customer Intimacy"], strategicInvariants: "Enforces focus on a single value discipline to achieve market dominance while maintaining industry-standard thresholds in the remaining two." },
  { title: "Blue Ocean Strategy", author: "Kim & Mauborgne", coreConcepts: ["Value Innovation", "ERRC Grid", "Uncontested Market Space", "Breaking Cost-Value Trade-off"], strategicInvariants: "Aligns the system to eliminate industry-standard bloat while raising core security values, creating uncontested market opportunities." },
  { title: "Play Bigger", author: "Ramadan, Peterson, Lochhead, Maney", coreConcepts: ["Category Design", "Product-Company-Category Triangle", "Category King Conditioning"], strategicInvariants: "Positions the platform to define, develop, and completely rule an entirely new software category." },
  { title: "Crossing the Chasm", author: "Geoffrey A. Moore", coreConcepts: ["Technology Adoption Life Cycle", "The Chasm", "Bowling Alley Strategy", "The Beachhead Market"], strategicInvariants: "Targets highly specific enterprise target profiles to cross the adoption gap from early visionary testers to mainstream corporations." },
  { title: "Good to Great", author: "Jim Collins", coreConcepts: ["First Who... Then What", "The Hedgehog Concept", "Culture of Discipline", "The Flywheel Effect"], strategicInvariants: "Anchors structural execution solely at the intersection of deep passion, world-class technical capabilities, and deterministic economic engines." },
  { title: "The Lean Startup", author: "Eric Ries", coreConcepts: ["Validated Learning", "Build-Measure-Learn", "Minimum Viable Product", "Pivot or Persevere"], strategicInvariants: "Drives rapid, atomic code deployments coupled with deterministic user telemetry to minimize wasted developmental energy." },
  { title: "Zero to One", author: "Peter Thiel", coreConcepts: ["Vertical Progress", "Proprietary Technology", "Network Effects", "Monopoly vs. Perfect Competition"], strategicInvariants: "Mandates building software with an order-of-magnitude technical advantage, establishing absolute defensive moats around architecture." },
  { title: "Measure What Matters", author: "John Doerr", coreConcepts: ["Objectives and Key Results (OKRs)", "Radical Alignment", "Continuous Tracking", "Stretch Goals"], strategicInvariants: "Binds every agent workflow execution to quantifiable metrics to guarantee zero systemic drift across the organization." }
];

// 🤖 THE FULL 17-PERSONA EXECUTABLE BOARD ROOM ROSTER (includes board-bot Chief of Staff)
export const AGENTIC_BOARD_ROSTER: AgenticPersona[] = [...STATIC_BOARD_ROSTER];

const FOUR_PILLARS_DETERMINATION = `
EXECUTIVE DETERMINATION: THE 4 PILLARS OF IRONFRAME OPERATIONS

Pillar 1: Business Operations & Financial Integrity
- Scalable corporate business model mapping clear revenue streams and cost profiles.
- Strict requirement for absolute numeric precision; all financials map exclusively to PostgreSQL NUMERIC or BigInt whole-integer cents to protect transactional history from rounding variants.

Pillar 2: Technology & Air-Gapped Infrastructure
- Fully isolated cloud infrastructure designed to support rapid SaaS expansion without structural drift.
- Multi-layered data protection including real-time threat mapping, automated quarantine authority (Ironlock), and a secure data layout using Prisma ORM.

Pillar 3: Talent, Culture & Agentic Coordination
- Continuous engineering focus utilizing a modular 19-agent workforce running on persistent, checkpointed states.
- Dedicated commitment to talent acquisition, employee development, and DEI modeling using salted, anonymized data arrays (Ironethic).

Pillar 4: Regulatory, GRC & Strategic Partnerships
- Direct translation of global compliance frameworks (SOC2, ISO27001, CSRD, GRI) straight into executable machine rules via Irontally and Ironlogic.
- Transparent, human-in-the-loop tracking channels configured to accelerate platform innovation alongside strategic enterprise partners.
`.trim();

function directiveMatchesQuery(directive: string, normalizedQuery: string): boolean {
  const lower = directive.toLowerCase();
  if (normalizedQuery.includes(lower)) return true;
  return lower
    .split(/[^a-z0-9]+/)
    .filter(token => token.length > 4)
    .some(token => normalizedQuery.includes(token));
}

function resolveEngagedPillars(normalizedQuery: string) {
  if (
    normalizedQuery.includes("pillar") ||
    normalizedQuery.includes("4 pillars") ||
    normalizedQuery.includes("four pillars")
  ) {
    return [...IRONFRAME_CORPORATE_PILLARS];
  }

  return IRONFRAME_CORPORATE_PILLARS.filter(pillar => {
    const idToken = pillar.pillarId.replace("pillar-", "");
    if (normalizedQuery.includes(idToken)) return true;
    if (normalizedQuery.includes(pillar.name.toLowerCase())) return true;
    return pillar.keyDirectives.some(directive => directiveMatchesQuery(directive, normalizedQuery));
  });
}

/**
 * 📊 RESTORED UNIFIED CONSENSUS ROUTER ENGINE (UPDATED WITH CORPORATE PILLARS)
 * Automatically evaluates query intent to assemble a balanced leadership panel
 * and execute an end-to-end thinking loop containing real domain knowledge.
 */
export async function deliberateUnifiedBoardRoom(query: string, explicitOverrideId?: string) {
  console.log(`[IRONBOARD UNIFIED] Running consensus deliberation engine...`);
  const normalizedQuery = query.toLowerCase();

  // Step 1: Establish the Executive Lead Persona
  let leader: AgenticPersona = AGENTIC_BOARD_ROSTER.find(a => a.id === "board-ceo")!;

  if (explicitOverrideId && explicitOverrideId !== 'auto') {
    const override = AGENTIC_BOARD_ROSTER.find(a => a.id === explicitOverrideId);
    if (override) leader = override;
  } else {
    let highestScore = 0;
    for (const agent of AGENTIC_BOARD_ROSTER) {
      let score = 0;
      if (normalizedQuery.includes(agent.id.replace('board-', ''))) score += 5;
      if (agent.expertise.some(skill => normalizedQuery.includes(skill.toLowerCase()))) score += 3;
      if (normalizedQuery.includes(agent.primaryBookAlignment.toLowerCase())) score += 4;

      if (score > highestScore) {
        highestScore = score;
        leader = agent;
      }
    }
  }

  // Step 2: Auto-Assemble Two Support Personas Based on Team Balance
  const supportStaff = AGENTIC_BOARD_ROSTER.filter(a => a.id !== leader.id);
  const legalSupport = supportStaff.find(a => a.id === "board-legal") || supportStaff[0];
  const financialSupport = supportStaff.find(a => a.id === "board-cfo") || supportStaff[1];
  const technicalSupport = supportStaff.find(a => a.id === "board-cto") || supportStaff[2];

  let selectedSupport: AgenticPersona[] = [];
  if (leader.team === "Executive Suite") {
    selectedSupport = [legalSupport, AGENTIC_BOARD_ROSTER.find(a => a.id === "board-compliance")!];
  } else if (leader.team === "Product and Engineering") {
    selectedSupport = [financialSupport, legalSupport];
  } else {
    selectedSupport = [AGENTIC_BOARD_ROSTER.find(a => a.id === "board-ceo")!, technicalSupport];
  }

  // Step 3: CORE CONTENT INJECTION — Dynamic 4 Pillars Knowledge Base
  const engagedPillars = resolveEngagedPillars(normalizedQuery);
  let generatedDetermination =
    "The board is actively evaluating this operational trajectory against our standard framework invariants.";

  if (
    normalizedQuery.includes("pillar") ||
    normalizedQuery.includes("4 pillars") ||
    normalizedQuery.includes("four pillars")
  ) {
    generatedDetermination = FOUR_PILLARS_DETERMINATION;
  } else if (engagedPillars.length > 0) {
    generatedDetermination = engagedPillars
      .map(
        pillar =>
          `${pillar.name}\n${pillar.description}\nKey directives: ${pillar.keyDirectives.join("; ")}`
      )
      .join("\n\n");
  }

  const coreBook = STRATEGIC_KNOWLEDGE_VAULT.find(f => f.title === leader.primaryBookAlignment)!;
  const secondaryFrameworks = STRATEGIC_KNOWLEDGE_VAULT
    .filter(f => f.title !== leader.primaryBookAlignment &&
                (normalizedQuery.includes(f.title.toLowerCase()) || f.coreConcepts.some(c => normalizedQuery.includes(c.toLowerCase()))))
    .map(f => f.title);

  const matchedProducts = CORE_COMPANY_PRODUCTS.filter(p =>
    normalizedQuery.includes(p.productKey.toLowerCase()) || normalizedQuery.includes(p.name.toLowerCase())
  ).map(p => p.name);

  return {
    isAutoRouted: !explicitOverrideId || explicitOverrideId === 'auto',
    panelAssembly: {
      executiveLead: leader.role,
      leadId: leader.id,
      alignedPrimaryFramework: `"${coreBook.title}" by ${coreBook.author}`,
      advisoryCouncil: selectedSupport.map(s => `${s.role} [Lens: ${s.primaryBookAlignment}]`)
    },
    determination: generatedDetermination,
    thinkingTraces: {
      cognitivePath: `Consensus router identified intent. Selected ${leader.role} to drive determination utilizing framework parameters: "${coreBook.strategicInvariants}"`,
      secondaryCrossCuts: secondaryFrameworks.length > 0 ? secondaryFrameworks : ["Standard Operations Base"],
      auditedProducts: matchedProducts.length > 0 ? matchedProducts : ["Full Portfolio Matrix Overview"],
      corporatePillarsEngaged: engagedPillars.map(p => p.name)
    },
    executionStatus: "COMPLETE",
    configEcho: BOARD_ORCHESTRATION_CONFIG.layout,
    baselinesChecked: {
      medshield_cents: 1110000000n,
      vaultbank_cents: 590000000n,
      gridcore_cents: 470000000n
    }
  };
}
