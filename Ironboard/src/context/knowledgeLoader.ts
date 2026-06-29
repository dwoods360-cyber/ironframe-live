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
  { title: "Zero to One", author: "Peter Thiel", coreConcepts: ["Vertical Progress", "Proprietary Technology", "Network Effects", "Monopoly vs. Perfect Competition"], strategicInvariants: "Planning lens only — pursue 10x product bets and defensible architecture; never cite this book as proof Ironframe currently leads the GRC market or holds uncopyable moats." },
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
 * Deprecated — static Frame fallbacks violate Dynamic Discovery Mandate.
 * Use routeExecutivePanel + runDynamicDiscovery + deliberateExecutiveQuery.
 */
export async function deliberateUnifiedBoardRoom(
  _query: string,
  _explicitOverrideId?: string,
): Promise<never> {
  throw new Error(
    'deliberateUnifiedBoardRoom is deprecated: static Frame fallbacks violate the Dynamic Discovery Mandate. Use routeExecutivePanel + runDynamicDiscovery + deliberateExecutiveQuery on the IronBoard 17-agent plane.',
  );
}
