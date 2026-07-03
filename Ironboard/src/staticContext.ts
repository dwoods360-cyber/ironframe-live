import { buildStrategicIntelResearchBinding } from './context/strategicIntelResearchBinding.js';

export const CODESPACE_FOUR_PILLARS_BLUEPRINT = `
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

export const STRATEGIC_KNOWLEDGE_VAULT = [
  { title: "The Discipline of Market Leaders", author: "Treacy & Wiersema", coreConcepts: ["Operational Excellence", "Product Leadership", "Customer Intimacy"], strategicInvariants: "Enforces focus on a single value discipline to achieve market dominance while maintaining industry-standard thresholds in the remaining two." },
  { title: "Blue Ocean Strategy", author: "Kim & Mauborgne", coreConcepts: ["Value Innovation", "ERRC Grid", "Uncontested Market Space", "Breaking Cost-Value Trade-off"], strategicInvariants: "Aligns the system to eliminate industry-standard bloat while raising core security values, creating uncontested market opportunities." },
  { title: "Play Bigger", author: "Ramadan, Peterson, Lochhead, Maney", coreConcepts: ["Category Design", "Product-Company-Category Triangle", "Category King Conditioning"], strategicInvariants: "Positions the platform to define, develop, and completely rule an entirely new software category." },
  { title: "Crossing the Chasm", author: "Geoffrey A. Moore", coreConcepts: ["Technology Adoption Life Cycle", "The Chasm", "Bowling Alley Strategy", "The Beachhead Market"], strategicInvariants: "Targets highly specific enterprise target profiles to cross the adoption gap from early visionary testers to mainstream corporations." },
  { title: "Good to Great", author: "Jim Collins", coreConcepts: ["First Who... Then What", "The Hedgehog Concept", "Culture of Discipline", "The Flywheel Effect"], strategicInvariants: "Anchors structural execution solely at the intersection of deep passion, world-class technical capabilities, and deterministic economic engines." },
  { title: "The Lean Startup", author: "Eric Ries", coreConcepts: ["Validated Learning", "Build-Measure-Learn", "Minimum Viable Product", "Pivot or Persevere"], strategicInvariants: "Drives rapid, atomic code deployments coupled with deterministic user telemetry to minimize wasted developmental energy." },
  { title: "Zero to One", author: "Peter Thiel", coreConcepts: ["Vertical Progress", "Proprietary Technology", "Network Effects", "Monopoly vs. Perfect Competition"], strategicInvariants: "Planning lens only — pursue 10x product bets and defensible architecture; never cite this book as proof Ironframe currently leads the GRC market or holds uncopyable moats." },
  { title: "Measure What Matters", author: "John Doerr", coreConcepts: ["Objectives and Key Results (OKRs)", "Radical Alignment", "Continuous Tracking", "Stretch Goals"], strategicInvariants: "Binds every agent workflow execution to quantifiable metrics to guarantee zero systemic drift across the organization." },
] as const;

export type BoardPersona = {
  id: string;
  role: string;
  team: string;
  expertise: string[];
  background: string;
  primaryBookAlignment: string;
};

export const AGENTIC_BOARD_ROSTER: BoardPersona[] = [
  { id: "board-bot", role: "Strategic Chief of Staff (Bot)", team: "Executive Suite", expertise: ["Dynamic coordination", "Workflow synthesis", "Context aggregation"], background: "Advanced strategic alignment orchestrator built for Ironframe.", primaryBookAlignment: "Measure What Matters" },
  { id: "board-ceo", role: "CEO - Visionary Leader", team: "Executive Suite", expertise: ["Strategic planning", "Leadership"], background: "Experienced entrepreneur in GRC fields.", primaryBookAlignment: "The Discipline of Market Leaders" },
  { id: "board-cto", role: "CTO - Technical Innovator", team: "Executive Suite", expertise: ["Technology strategy", "Architecture"], background: "Seasoned software technologist.", primaryBookAlignment: "Zero to One" },
  { id: "board-cfo", role: "CFO - Financial Strategist", team: "Executive Suite", expertise: ["Financial planning", "Budgeting"], background: "Experienced finance professional.", primaryBookAlignment: "Good to Great" },
  { id: "board-evangelist", role: "GRC Evangelist", team: "GRC Domain Experts", expertise: ["GRC domain knowledge", "Regulatory trends"], background: "Seasoned compliance professional.", primaryBookAlignment: "Play Bigger" },
  { id: "board-risk-spec", role: "Risk Management Specialist", team: "GRC Domain Experts", expertise: ["Risk assessment", "Mitigation"], background: "Experienced risk management professional.", primaryBookAlignment: "Blue Ocean Strategy" },
  { id: "board-compliance", role: "Compliance Officer", team: "GRC Domain Experts", expertise: ["Regulatory compliance"], background: "Experienced compliance expert.", primaryBookAlignment: "Measure What Matters" },
  { id: "board-pm", role: "Product Manager", team: "Product and Engineering", expertise: ["Product development", "Roadmap planning"], background: "Experienced software product visionary.", primaryBookAlignment: "The Lean Startup" },
  { id: "board-engineer", role: "Software Engineer", team: "Product and Engineering", expertise: ["Software development", "Coding"], background: "Skilled infrastructure developer.", primaryBookAlignment: "Zero to One" },
  { id: "board-data-sci", role: "Data Scientist", team: "Product and Engineering", expertise: ["Data analysis", "Modeling"], background: "Experienced analytics expert.", primaryBookAlignment: "Measure What Matters" },
  { id: "board-sales-lead", role: "Sales Leader", team: "Sales and Marketing", expertise: ["Sales strategy", "Revenue growth"], background: "Experienced enterprise sales professional.", primaryBookAlignment: "Crossing the Chasm" },
  { id: "board-marketing-mgr", role: "Marketing Manager", team: "Sales and Marketing", expertise: ["Marketing strategy", "Brand management"], background: "Experienced campaign strategist.", primaryBookAlignment: "Play Bigger" },
  { id: "board-writer", role: "Writer - Narrative Architect", team: "Other Essential Roles", expertise: ["Content strategy", "Documentation"], background: "Expert regulatory copywriter.", primaryBookAlignment: "The Discipline of Market Leaders" },
  { id: "board-trainer", role: "Trainer - Education Specialist", team: "Other Essential Roles", expertise: ["User onboarding", "Curriculum design"], background: "Seasoned training designer.", primaryBookAlignment: "The Lean Startup" },
  { id: "board-legal", role: "Legal - Regulatory Counsel", team: "Other Essential Roles", expertise: ["Corporate law", "Policy auditing"], background: "Corporate compliance attorney.", primaryBookAlignment: "Crossing the Chasm" },
  { id: "board-hr", role: "HR Manager - Talent Expert", team: "Other Essential Roles", expertise: ["Human resources", "Talent management"], background: "Experienced talent strategist.", primaryBookAlignment: "Good to Great" },
  { id: "board-customer-success", role: "Customer Success Manager", team: "Other Essential Roles", expertise: ["Customer engagement", "Retention"], background: "Experienced customer success professional.", primaryBookAlignment: "The Discipline of Market Leaders" },
];

/** Personas isolated from live POST /api/query — use dedicated Ironframe agent workers. */
export const BOARDROOM_ISOLATED_AGENT_IDS = new Set<string>(["board-trainer", "board-writer"]);

/** Ironframe :3000 routes for isolated documentation author personas. */
export const BOARDROOM_ISOLATED_AGENT_REDIRECTS: Record<string, string> = {
  "board-trainer": "/api/agents/trainer",
  "board-writer": "/api/agents/writer",
};

/** Live boardroom chat roster (excludes isolated documentation author workers). */
export const BOARDROOM_QUERY_ROSTER: BoardPersona[] = AGENTIC_BOARD_ROSTER.filter(
  (persona) => !BOARDROOM_ISOLATED_AGENT_IDS.has(persona.id),
);

export const STATIC_PRODUCTS = [
  { name: "Ironframe Control Center", key: "ironframe-core", priority: "CRITICAL", frameworks: ["SOC2", "ISO27001"] },
  { name: "IronBoard Executive Cockpit", key: "ironboard-exec", priority: "HIGH", frameworks: ["CSRD"] },
  { name: "Docs Hub Accessibility Engine", key: "docs-hub-accessibility", priority: "MEDIUM", frameworks: ["GRI"] },
] as const;

export const SOVEREIGN_POOL_BASELINES_CENTS = {
  medshield: '1110000000',
  vaultbank: '590000000',
  gridcore: '470000000',
  enterpriseReserve: '2170000000',
} as const;

/** Overrides stale federation text — Kimbot is NOT Agent 17. */
export const WORKFORCE_VS_SIMULATION_DISAMBIGUATION = `
NAMING LOCK (AUTHORITATIVE — overrides any conflicting markdown in federation bundle):
- The **19-agent production workforce** includes **Ironbloom as Agent 17** (CSRD / sustainability ledger; physical units kWh, L, km only).
- **Kimbot is NOT Agent 17** and is NOT a production workforce agent.
- **Kimbot is Simulation Bot B (Red Team)** — a shadow-plane antagonist that injects fake adversary threats (ransomware, data leak, API breach) to stress-test the Command Center pipeline, dual-key flows, and ACK/audit loops.
- Sibling simulation bots: **Bot A = Attbot** (attack/chaos), **Bot C = GRCbot** (GRC QA). IronBoard cockpit (:8082) exposes only validated market flywheel controls — no simulation purge UI.
- Never describe Kimbot as the Sustainability Analyst; that role is **Ironbloom (Agent 17)**.

PRICING MODEL CONSTITUTIONAL STANDARD:
- Our platform completely rejects per-user, per-month seat licensing to eliminate fractional float billing calculations.
- All pricing models are flat annual platform fees denominated strictly in BigInt integer cents.
- Tier 1: 'Fintech Seed Gate' - For 5-25 employee startups under SOC2/ISO27001 pressure. Price: 3,500,000 cents ($35,000 USD).
- Tier 2: 'Series A Growth Shield' - For 26-50 employee startups requiring Ironbloom sustainability tracking. Price: 7,500,000 cents ($75,000 USD).
- Heavily penalize and short-circuit any model generation that attempts to propose seat-based metrics, decimals, or enterprise enterprise pricing tiers over $100k.

OPERATIONAL COST VS. CLIENT BASELINE DISTINCTION:
- Our internal operational cost is lean, totaling exactly between 7,700 cents ($77 USD) and 11,700 cents ($117 USD) per month for cloud infrastructure hosting (Vercel, Supabase, and Gemini API usage tokens).
- Slugs medshield (1,110,000,000 cents), vaultbank (590,000,000 cents), and gridcore (470,000,000 cents) are SYNTHETIC_DEMO_SEED engineering fixtures — NOT real companies. Prospect company names MUST come from live discoverRegionalProspects rows only — never static lists.
- Under no circumstances shall any agent misrepresent these client benchmarks as the platform's operating costs. Keep company overhead calculations bound tightly to actual local infrastructure whole-cent parameters.
`.trim();

export const KIMBOT_CANONICAL_ANSWER = [
  'Kimbot is Simulation Bot B (Red Team) — a shadow-plane antagonist for drills and app testing.',
  'It is separate from the 19-agent production workforce and is NOT Agent 17.',
  'Kimbot injects simulated adversary threats into the pipeline so operators can exercise CISO dual-key approval, ACK/de-ACK, and audit flows.',
  'Production sustainability / CSRD / Carbon ALE is owned by Ironbloom (Agent 17), which requires physical units and rejects monetary-only proxies.',
].join(' ');

/** Phase 1 monetization decision — sales-assisted invite + Stripe (see stakeholder-deck blueprint). */
export const PHASE1_MONETIZATION_BOARD_MANDATE = `
PHASE 1 MONETIZATION MANDATE (AUTHORITATIVE — Q2 2026):
- Model: SALES-ASSISTED INVITE ONLY for first revenue — not self-serve multi-subdomain provisioning.
- Wire: inviteCorporateTenantUserAction + admin tenant UI + Stripe webhook → TenantBilling.status ACTIVE.
- P0 blockers before charging: Stripe rails, /terms + /privacy, production quarantine narrowed for public routes, admin invite panel.
- P1 before broad sales: tier entitlements, Epic 12 WORM honesty, stub page badges, SOC2-aligned (never certified) language.
- Fastest revenue: Command tier, one price, 2–3 design partners while Phase 2 entitlements harden.
- Full market/competitor/regulatory backlog: docs/stakeholder-deck/ironframe-monetization-market-blueprint-2026-q2.md (federated at board startup).
`.trim();

export const DOCUMENTATION_CORPUS_BINDING = `
DUAL-LOCATION OUTPUT MATRIX (AUTHORITATIVE — see lib/documentationCorpusPlanes.ts):

PLANE 1 — NEWSLETTERS & BRIEFINGS (External / GTM Intelligence Surface)
- Content: Market analysis, regulatory narratives, flywheel briefing logs
- Target: /governance-frame/[slug] · PublishedBriefing DB · Substack / Ironcast staging
- Authors: board-bot, board-cfo, flywheel agents, narrate cron — NOT board-trainer/writer
- Workflow: briefing-queue/ → human Section V → promote-briefing-draft.ts

PLANE 2 — APP DOCS (Internal / Product GRC Corpus)
- Content: Level 1 user-manuals + Level 2 technical specs + training paths
- Target: docs/user-manuals/, docs/technical/, docs/training/ · reader /docs
- Authors: board-trainer, board-writer
- Workflow: GET /api/board/shared-context → documentationBrief → POST /api/documentation/execute

Constitutional: docs/TAS.md · delivery@ironframegrc.com
`.trim();

export function buildStaticContextBundle(): string {
  const roster = AGENTIC_BOARD_ROSTER.map(
    a => `- ${a.role} (${a.id}): ${a.expertise.join(', ')} | book=${a.primaryBookAlignment}`,
  ).join('\n');
  const vault = STRATEGIC_KNOWLEDGE_VAULT.map(
    b => `- ${b.title} by ${b.author}: ${b.strategicInvariants}`,
  ).join('\n');
  const products = STATIC_PRODUCTS.map(
    p => `- ${p.name} key=${p.key} priority=${p.priority} frameworks=${p.frameworks.join('/')}`,
  ).join('\n');
  return [
    '=== IRONBOARD STATIC CONTEXT (READ-ONLY; NO LIVE DATABASE) ===',
    '',
    DOCUMENTATION_CORPUS_BINDING,
    '',
    WORKFORCE_VS_SIMULATION_DISAMBIGUATION,
    '',
    PHASE1_MONETIZATION_BOARD_MANDATE,
    '',
    'FOUR PILLARS BLUEPRINT:',
    CODESPACE_FOUR_PILLARS_BLUEPRINT,
    '',
    '16-PERSONA EXECUTIVE ROSTER:',
    roster,
    '',
    '8-BOOK STRATEGY VAULT:',
    vault,
    '',
    'PRODUCT REGISTRY:',
    products,
    '',
    'SYNTHETIC DEMO SEED BASELINES (BigInt cents — NOT real companies; do not invent other values):',
    `- slug medshield (SYNTHETIC_DEMO_SEED): ${SOVEREIGN_POOL_BASELINES_CENTS.medshield}¢`,
    `- slug vaultbank (SYNTHETIC_DEMO_SEED): ${SOVEREIGN_POOL_BASELINES_CENTS.vaultbank}¢`,
    `- slug gridcore (SYNTHETIC_DEMO_SEED): ${SOVEREIGN_POOL_BASELINES_CENTS.gridcore}¢`,
    `- Enterprise reserve reference: ${SOVEREIGN_POOL_BASELINES_CENTS.enterpriseReserve}¢`,
    '',
    buildStrategicIntelResearchBinding(),
  ].join('\n');
}
