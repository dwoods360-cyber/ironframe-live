import { buildStrategicIntelResearchBinding } from './context/strategicIntelResearchBinding.js';
import { DESIGN_PARTNER_LAUNCH_BRIEFING } from './config/designPartnerLaunchBriefing.js';

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
  { title: "Building a StoryBrand", author: "Donald Miller", coreConcepts: ["SB7 Framework", "Customer as Hero", "Brand as Guide", "Clarity Over Cleverness", "One-Liner Formula"], strategicInvariants: "All GTM and operator-facing messaging leads with the buyer's problem, positions Ironframe as guide with empathy and authority, and drives a single clear call to action — never feature-first hero copy." },
  { title: "Marketing Made Simple", author: "Donald Miller", coreConcepts: ["Five-Part Sales Funnel", "Lead Generator", "Nurture Email Series", "Website Wireframe", "StoryBrand Messaging"], strategicInvariants: "Maps Ironframe web and nurture assets to one-liner → lead magnet → email sequence → sales email → StoryBrand website sections." },
  { title: "Influence", author: "Robert Cialdini", coreConcepts: ["Reciprocity", "Commitment", "Social Proof", "Authority", "Liking", "Scarcity"], strategicInvariants: "Ethical persuasion only — authority via TAS and release evidence, social proof via labeled design partners; never fabricated logos or false scarcity." },
  { title: "Made to Stick", author: "Chip Heath & Dan Heath", coreConcepts: ["SUCCESs Framework", "Simple Core", "Concrete Details", "Credible Proof", "Stories"], strategicInvariants: "Training and technical docs use concrete routes, cent integers, and verifiable test gates — not abstract marketing superlatives." },
  { title: "Obviously Awesome", author: "April Dunford", coreConcepts: ["Competitive Alternatives", "Unique Attributes", "Value Themes", "Market Category", "Segment Focus"], strategicInvariants: "Position against spreadsheets and heatmap GRC; tailor value themes per beachhead (BHC, NERC, MSSP, HIPAA)." },
  { title: "Positioning", author: "Al Ries & Jack Trout", coreConcepts: ["Own a Word in the Mind", "Simplicity", "Category Entry", "Line Extension Risks"], strategicInvariants: "Own 'quantitative GRC command post' in prospect mindshare — repeat category phrase; avoid diluting with parallel taglines." },
  { title: "They Ask, You Answer", author: "Marcus Sheridan", coreConcepts: ["Big Five Questions", "Honest Web Content", "Assignment Selling", "Trust Through Transparency"], strategicInvariants: "Docs hub and trust center answer buyer questions with Shipped/Pilot/Roadmap honesty — especially comparisons and certification scope." },
  { title: "This Is Marketing", author: "Seth Godin", coreConcepts: ["Smallest Viable Audience", "Enrollment", "Tension and Change", "Permission"], strategicInvariants: "Design-partner enrollment for regulated mid-market; resist mass-market self-serve positioning until Phase 2 entitlements ship." },
  { title: "Traction", author: "Gabriel Weinberg & Justin Mares", coreConcepts: ["Bullseye Framework", "Channel Testing", "Critical Path", "19 Traction Channels"], strategicInvariants: "Test OSINT triggers, executive roundtables, and MSSP referrals before paid social; measure SQL cost per channel quarterly." },
  { title: "Contagious", author: "Jonah Berger", coreConcepts: ["STEPPS", "Social Currency", "Practical Value", "Stories"], strategicInvariants: "Educational ALE and Irongate primers outperform generic thought leadership on LinkedIn and technical blog." },
  { title: "The Challenger Sale", author: "Matthew Dixon & Brent Adamson", coreConcepts: ["Teach", "Tailor", "Take Control", "Commercial Insight"], strategicInvariants: "Lead outbound and webinars with 'beyond the heatmap' insight that reframes board risk in dollars — methodology flags in CRM." },
  { title: "Hooked", author: "Nir Eyal", coreConcepts: ["Trigger", "Action", "Variable Reward", "Investment"], strategicInvariants: "Operator habit loops inside Command Center workflows only — not consumer gamification or dark patterns." },
  { title: "Customer Success", author: "Nick Mehta, Lincoln Murphy, Dan Steinman", coreConcepts: ["Outcome-Based Success", "Success Plans", "Churn Early Warning", "Land and Expand"], strategicInvariants: "Post-sale motions measure audit-ready outcomes and whole-cent ROI — CSM drafts advisories; operators co-sign before client send." },
  { title: "The Customer Success Economy", author: "Nick Mehta, David Cannan, Mikael Blaisdell", coreConcepts: ["Net Retention", "CS-Led Growth", "Digital CS", "Outcome Metrics"], strategicInvariants: "IronSuccessTeam health scores and expansion flags feed operator review — never auto-dispatch CISO-facing email." },
  { title: "Subscribed", author: "Tien Tzuo", coreConcepts: ["Subscription Mindset", "Recurring Value", "Outcome Billing"], strategicInvariants: "Renewal narrative emphasizes continuous attestation and evidence exports — not one-time implementation shelfware." },
  { title: "The Effortless Experience", author: "Matthew Dixon, Nick Toman, Rick DeLisi", coreConcepts: ["Customer Effort Score", "Root Cause Fix", "Loyalty Through Ease"], strategicInvariants: "Reduce analyst swivel-chair work — Ironscribe hashes and Ironguard scope — before delight campaigns." },
] as const;

export const MARKETING_STRATEGY_KNOWLEDGE_BINDING = `
MARKETING & MESSAGING KNOWLEDGE BASE (AUTHORITATIVE):
- Master library: docs/marketing-strategy/marketing-strategy-library.md
- StoryBrand SB7 + BrandScript: docs/marketing-strategy/storybrand-framework.md
- Campaign plan: docs/marketing-strategy/marketing-plan.md
- Brand voice: docs/marketing-strategy/brand-style-guide.md
- Editorial calendar: docs/marketing-strategy/content-calendar.md
- Social guidelines: docs/marketing-strategy/social-media-guidelines.md
- Design-partner launch RACI + message lock: docs/sales/design-partner-workforce-briefing.md
- board-marketing-mgr: full GTM application of vault books + matrix ingest (marketing-strategy category); own warm/auditor intro blurbs with board-sales-lead
- board-writer: narrative structure + partner packet / offer clarity — docs/training/level-2/13-narrative-frameworks-storybrand.md (no live cold DISPATCH)
- board-trainer: operator clarity — docs/training/level-1/13-clear-messaging-for-operators.md · LEVEL1-PARTNER-INDEX (no pipeline tactics)
- Ironleads cross-corpus: Ironleads/src/knowledge/leadGenCorpus.ts (storybrand, influence, inbound pillars, design_partner_launch)
`.trim();

export const CUSTOMER_SUCCESS_KNOWLEDGE_BINDING = `
CUSTOMER SUCCESS KNOWLEDGE BASE (AUTHORITATIVE):
- Master library: docs/customer-success/customer-success-library.md
- Retention playbook: docs/customer-success/retention-playbook.md
- Health score framework: docs/customer-success/health-score-framework.md
- QBR & expansion: docs/customer-success/qbr-expansion-framework.md
- Onboarding success: docs/customer-success/onboarding-success-playbook.md (Path B design-partner first 90 days)
- Design-partner handoff: docs/sales/design-partner-workforce-briefing.md · order-form success criteria become the CS plan
- board-customer-success: full post-sale application of vault CS books + matrix ingest (customer-success category); collaborate with Sales only at CLOSED_WON / ACTIVE handoff
- IronSuccessTeam cross-corpus: SuccessTeam/src/knowledge/customerSuccessCorpus.ts (includes design_partner_path_b_onboarding)
- SalesTeam boundary: PROSPECT outbound only — SuccessTeam owns CLOSED_WON retention/expansion advisories
`.trim();

export type PerimeterWorkforceApp = {
  id: string;
  label: string;
  port: number;
  packageDir: string;
  role: string;
  crmStage: string | null;
  hitlDraftKind: string | null;
  ingressNote: string | null;
  boardOwnerIds: readonly string[];
};

/** Isolated poll workers + control plane — Ironframe-internal only; never tenant workspaces. */
export const PERIMETER_WORKFORCE_APPS: readonly PerimeterWorkforceApp[] = [
  {
    id: "ironframe",
    label: "Ironframe Control Plane",
    port: 3000,
    packageDir: "app/ (Next.js)",
    role: "Tenancy · Ironguard RLS · signed ingress APIs · HITL approval desk · tenant ticket intake API",
    crmStage: null,
    hitlDraftKind: "SUPPORT | SALES | CUSTOMER_SUCCESS (dispatch surface)",
    ingressNote: "Hosts all /api/v1/ingress/* routes; never runs poll graphs directly",
    boardOwnerIds: ["board-bot", "board-cto", "board-engineer"],
  },
  {
    id: "ironboard",
    label: "Ironboard",
    port: 8082,
    packageDir: "Ironboard/",
    role: "17-agent boardroom · CRM tools · market flywheel · docs federation",
    crmStage: "CRM read/write (operator)",
    hitlDraftKind: null,
    ingressNote: "SSE board chat; CRM discovery — not perimeter poll worker",
    boardOwnerIds: ["board-bot", "board-ceo", "board-sales-lead"],
  },
  {
    id: "ironleads",
    label: "Ironleads",
    port: 8083,
    packageDir: "Ironleads/",
    role: "OSINT harvest → SUSPECT CRM ingress (LangGraph + SqliteSaver)",
    crmStage: "SUSPECT",
    hitlDraftKind: null,
    ingressNote: "POST /api/v1/ingress/ironleads (Bearer IRONLEADS_INGRESS_SECRET)",
    boardOwnerIds: ["board-marketing-mgr", "board-sales-lead"],
  },
  {
    id: "salesteam",
    label: "SalesTeam",
    port: 8084,
    packageDir: "SalesTeam/",
    role: "PROSPECT outbound StoryBrand drafts → operator approval queue",
    crmStage: "PROSPECT",
    hitlDraftKind: "SALES",
    ingressNote: "GET prospects + POST outreach (Bearer SALESTEAM_INGRESS_SECRET); poll ~120s",
    boardOwnerIds: ["board-sales-lead", "board-marketing-mgr"],
  },
  {
    id: "success-team",
    label: "IronSuccessTeam",
    port: 8085,
    packageDir: "SuccessTeam/",
    role: "CLOSED_WON health audit · ROI · expansion advisories → CS approval queue",
    crmStage: "CLOSED_WON",
    hitlDraftKind: "CUSTOMER_SUCCESS",
    ingressNote: "GET accounts/health-snapshot + POST advisory (Bearer SUCCESS_TEAM_INGRESS_SECRET); poll ~hourly",
    boardOwnerIds: ["board-customer-success", "board-cfo"],
  },
  {
    id: "support-team",
    label: "IronSupportTeam",
    port: 8086,
    packageDir: "SupportTeam/",
    role: "Support intake poll · corpus-grounded reply drafts → SUPPORT approval queue",
    crmStage: "SUPPORT_INTAKE",
    hitlDraftKind: "SUPPORT",
    ingressNote: "GET tickets/context-snapshot + POST reply (Bearer SUPPORT_TEAM_INGRESS_SECRET); poll ~90s",
    boardOwnerIds: ["board-engineer", "board-cto", "board-bot"],
  },
] as const;

export const PERIMETER_WORKFORCE_BINDING = `
PERIMETER WORKFORCE APPS (AUTHORITATIVE — isolated packages; NOT the 19-agent Irontech production roster):
INTERNAL USE ONLY — Ironframe platform operators: GLOBAL_ADMIN or designated BUSINESS_ADMIN assignments. Never tenant workspaces, never customer self-service surfaces.

- Ironframe :3000 — control plane, ingress host, HITL approvals (/dashboard/admin/approvals)
- Ironboard :8082 — this boardroom, CRM flywheel, executive personas (17 live query agents + 2 isolated doc authors)
- Ironleads :8083 — OSINT → SUSPECT (Ironleads/src/knowledge/leadGenCorpus.ts)
- SalesTeam :8084 — PROSPECT outbound drafts only (never auto-send)
- IronSuccessTeam :8085 — CLOSED_WON retention/expansion advisories only (never auto-send)
- IronSupportTeam :8086 — support intake reply drafts only (never auto-send)

CRM pipeline ownership (do not blur roles):
  SUSPECT → Ironleads | PROSPECT → SalesTeam | CLOSED_WON post-sale → IronSuccessTeam | Break/fix support intake → IronSupportTeam (SUPPORT drafts)

Design-partner rollout collaboration (ACTIVE):
  Leadgen harvest → Marketing + Sales Lead message → SalesTeam draft → Operator DISPATCH → Path B provision → Success plan on ACTIVE → Support on break/fix only
  Canonical RACI: docs/sales/design-partner-workforce-briefing.md

Operator console (internal): /dashboard/operations — GLOBAL_ADMIN or BUSINESS_ADMIN gate; workforce health probes + approvals + CRM snapshot

Tenant boundary: tenants may submit support tickets via /dashboard/support (engineering help intake only). They do not see or operate perimeter poll workers.

Architectural invariants for ALL perimeter workers:
- Read-only CRM poll via signed Bearer ingress into Ironframe — no direct production Prisma write authority in worker packages
- LangGraph SqliteSaver checkpointing per worker (local data/ scratchpad)
- Human-in-the-loop: workers queue CRM interaction summaries; operator co-signs before client dispatch
`.trim();

export type BoardPersona = {
  id: string;
  role: string;
  team: string;
  expertise: string[];
  background: string;
  primaryBookAlignment: string;
};

export const AGENTIC_BOARD_ROSTER: BoardPersona[] = [
  { id: "board-bot", role: "Strategic Chief of Staff (Bot)", team: "Executive Suite", expertise: ["Dynamic coordination", "Workflow synthesis", "Context aggregation", "Perimeter worker orchestration", "Design-partner handoffs"], background: "Advanced strategic alignment orchestrator; enforces design-partner RACI across Ironleads → SalesTeam → Approvals → SuccessTeam and keeps stage boundaries crisp.", primaryBookAlignment: "Measure What Matters" },
  { id: "board-ceo", role: "CEO - Visionary Leader", team: "Executive Suite", expertise: ["Strategic planning", "Leadership", "Cohort seat governance"], background: "Experienced entrepreneur in GRC fields; owns 3–5 Path B co-builder seat count and convert-or-exit discipline.", primaryBookAlignment: "The Discipline of Market Leaders" },
  { id: "board-cto", role: "CTO - Technical Innovator", team: "Executive Suite", expertise: ["Technology strategy", "Architecture", "Perimeter ingress APIs"], background: "Seasoned software technologist overseeing Ironframe :3000 ingress and isolated LangGraph workers.", primaryBookAlignment: "Zero to One" },
  { id: "board-cfo", role: "CFO - Financial Strategist", team: "Executive Suite", expertise: ["Financial planning", "Budgeting"], background: "Experienced finance professional.", primaryBookAlignment: "Good to Great" },
  { id: "board-evangelist", role: "GRC Evangelist", team: "GRC Domain Experts", expertise: ["GRC domain knowledge", "Regulatory trends"], background: "Seasoned compliance professional.", primaryBookAlignment: "Play Bigger" },
  { id: "board-risk-spec", role: "Risk Management Specialist", team: "GRC Domain Experts", expertise: ["Risk assessment", "Mitigation"], background: "Experienced risk management professional.", primaryBookAlignment: "Blue Ocean Strategy" },
  { id: "board-compliance", role: "Compliance Officer", team: "GRC Domain Experts", expertise: ["Regulatory compliance"], background: "Experienced compliance expert.", primaryBookAlignment: "Measure What Matters" },
  { id: "board-pm", role: "Product Manager", team: "Product and Engineering", expertise: ["Product development", "Roadmap planning", "Scope freeze during design-partner cohort"], background: "Experienced software product visionary; protects Golden Path scope freeze while 3–5 Path B partners are served.", primaryBookAlignment: "The Lean Startup" },
  { id: "board-engineer", role: "Software Engineer", team: "Product and Engineering", expertise: ["Software development", "Coding", "Poll worker packages", "Path B / invite rails"], background: "Skilled infrastructure developer for Ironleads, SalesTeam, and SuccessTeam LangGraph pipelines; keeps Path B activation and HITL dispatch healthy.", primaryBookAlignment: "Zero to One" },
  { id: "board-data-sci", role: "Data Scientist", team: "Product and Engineering", expertise: ["Data analysis", "Modeling"], background: "Experienced analytics expert.", primaryBookAlignment: "Measure What Matters" },
  { id: "board-sales-lead", role: "Sales Leader", team: "Sales and Marketing", expertise: ["Sales strategy", "Revenue growth", "SalesTeam PROSPECT pipeline", "Path B co-builder QA"], background: "Owns SalesTeam draft review with operators for paid Path B design partners ($4,999); enforces workflow-review CTA and multi-channel acquisition without opening a free program.", primaryBookAlignment: "Crossing the Chasm" },
  { id: "board-marketing-mgr", role: "Marketing Manager", team: "Sales and Marketing", expertise: ["Marketing strategy", "Brand management", "StoryBrand messaging", "Ironleads OSINT flywheel", "Warm/auditor intro blurbs"], background: "Campaign strategist for design-partner launch; coheres StoryBrand with Sales and feeds warm-network / auditor intro copy — never live DISPATCH.", primaryBookAlignment: "Building a StoryBrand" },
  { id: "board-writer", role: "Writer - Narrative Architect", team: "Other Essential Roles", expertise: ["Content strategy", "Documentation", "Narrative structure", "Partner packet clarity"], background: "Regulatory copywriter for practitioner docs and design-partner operator packet; StoryBrand structure only — no cold email DISPATCH.", primaryBookAlignment: "Building a StoryBrand" },
  { id: "board-trainer", role: "Trainer - Education Specialist", team: "Other Essential Roles", expertise: ["User onboarding", "Curriculum design", "Plain-language messaging", "LEVEL1 partner path"], background: "Training designer for design-partner get-started and LEVEL1-PARTNER-INDEX; Made to Stick clarity without pipeline tactics.", primaryBookAlignment: "Made to Stick" },
  { id: "board-legal", role: "Legal - Regulatory Counsel", team: "Other Essential Roles", expertise: ["Corporate law", "Policy auditing", "Order-form / Path B terms"], background: "Corporate compliance attorney; reviews design-partner order form and Path B commercial language before cohort signatures.", primaryBookAlignment: "Crossing the Chasm" },
  { id: "board-hr", role: "HR Manager - Talent Expert", team: "Other Essential Roles", expertise: ["Human resources", "Talent management"], background: "Experienced talent strategist.", primaryBookAlignment: "Good to Great" },
  { id: "board-customer-success", role: "Customer Success Manager", team: "Other Essential Roles", expertise: ["Customer engagement", "Retention", "Expansion", "QBR facilitation", "IronSuccessTeam advisories", "Path B success plans"], background: "Owns post-ACTIVE design-partner success plans from order-form criteria; collaborates with Sales only at CLOSED_WON handoff; HITL advisories never auto-send.", primaryBookAlignment: "Customer Success" },
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

export type BoardroomRosterDisplayEntry = BoardPersona & {
  isolated: boolean;
  ironframeRoute: string | null;
};

/** Full 17-persona roster for the boardroom UI (includes isolated doc authors). */
export function buildBoardroomRosterDisplayEntries(): BoardroomRosterDisplayEntry[] {
  return AGENTIC_BOARD_ROSTER.map((persona) => ({
    ...persona,
    isolated: BOARDROOM_ISOLATED_AGENT_IDS.has(persona.id),
    ironframeRoute: BOARDROOM_ISOLATED_AGENT_REDIRECTS[persona.id] ?? null,
  }));
}

export const STATIC_PRODUCTS = [
  { name: "Ironframe Control Center", key: "ironframe-core", priority: "CRITICAL", frameworks: ["SOC2", "ISO27001"] },
  { name: "IronBoard Executive Cockpit", key: "ironboard-exec", priority: "HIGH", frameworks: ["CSRD"] },
  { name: "Docs Hub Accessibility Engine", key: "docs-hub-accessibility", priority: "MEDIUM", frameworks: ["GRI"] },
] as const;

/** Consolidated right-panel fleet row — perimeter role copy + live health probe metadata. */
export type ProductMatrixEntry = {
  key: string;
  name: string;
  role: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  port: number;
  healthPath: string;
  /** Env override for base URL (falls back to http://127.0.0.1:{port}). */
  envUrlKey: string;
  crmStage?: string | null;
  ingressNote?: string | null;
  frameworks?: readonly string[];
};

const PERIMETER_HEALTH_PROBE_META: Record<
  PerimeterWorkforceApp["id"],
  Pick<ProductMatrixEntry, "key" | "priority" | "healthPath" | "envUrlKey">
> = {
  ironframe: {
    key: "ironframe-core",
    priority: "CRITICAL",
    healthPath: "/api/health",
    envUrlKey: "OPERATIONS_IRONFRAME_URL",
  },
  ironboard: {
    key: "ironboard-exec",
    priority: "HIGH",
    healthPath: "/health",
    envUrlKey: "OPERATIONS_IRONBOARD_URL",
  },
  ironleads: {
    key: "ironleads",
    priority: "HIGH",
    healthPath: "/health",
    envUrlKey: "OPERATIONS_IRONLEADS_URL",
  },
  salesteam: {
    key: "salesteam",
    priority: "HIGH",
    healthPath: "/health",
    envUrlKey: "OPERATIONS_SALESTEAM_URL",
  },
  "success-team": {
    key: "success-team",
    priority: "HIGH",
    healthPath: "/health",
    envUrlKey: "OPERATIONS_SUCCESS_TEAM_URL",
  },
  "support-team": {
    key: "support-team",
    priority: "HIGH",
    healthPath: "/health",
    envUrlKey: "OPERATIONS_SUPPORT_TEAM_URL",
  },
};

/** Single authoritative fleet list for boardroom panel + health probes (no duplicate names). */
export const PRODUCT_MATRIX: readonly ProductMatrixEntry[] = [
  ...PERIMETER_WORKFORCE_APPS.map((app) => ({
    ...PERIMETER_HEALTH_PROBE_META[app.id],
    name: app.label,
    port: app.port,
    role: app.role,
    crmStage: app.crmStage,
    ingressNote: app.ingressNote,
  })),
  {
    key: "docs-hub-accessibility",
    name: "Docs Hub Accessibility Engine",
    role: "Level 1 user-manuals · Level 2 technical specs · reader /docs · GRI accessibility",
    priority: "MEDIUM",
    port: 3000,
    healthPath: "/docs",
    envUrlKey: "OPERATIONS_IRONFRAME_URL",
    crmStage: null,
    ingressNote: "Served by Ironframe :3000 — documentation federation plane",
    frameworks: ["GRI"],
  },
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
- All pricing models are flat platform fees denominated strictly in BigInt integer cents.
- Design-partner on-ramp (Phase 1 Path B / Command Tier): 499,900 cents ($4,999 USD) — sales-assisted invite; tenant-scoped Stripe activation for PENDING workspaces (never send PENDING partners to generic /pricing).
- Planned GA Tier 1: 'Fintech Seed Gate' / Ironframe Command — For 5-25 employee startups under SOC2/ISO27001 pressure. Price: 3,500,000 cents ($35,000 USD/yr). Always label as "planned GA" until IRONFRAME_COMMERCIAL_GA is on.
- Tier 2: 'Series A Growth Shield' - For 26-50 employee startups requiring Ironbloom sustainability tracking. Price: 7,500,000 cents ($75,000 USD).
- Outreach CTA for design partners: 10–15 minute workflow review (not a free pilot or 20-minute product demo).
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
- Fastest revenue: Command Tier Path B $4,999, 3–5 design partners while Phase 2 entitlements harden.
- Design partner recruitment: docs/sales/design-partner-recruitment.md · workforce briefing · offer sheet · outreach sequence · order form · operator launch checklist · ICP shortlist under docs/sales/.
- Board path: Ironleads/Scout (leadgen) → board-marketing-mgr + board-sales-lead → SalesTeam drafts → operator Approvals DISPATCH → Path B provision with client-owned operator email → IronSuccessTeam success plan on ACTIVE.
- board-writer / board-trainer stay on docs plane (partner packet / LEVEL1) — not cold outreach DISPATCH.
- Acquisition: multi-channel (warm, auditor, Scout triggers, selective cold) · single paid Path B program — no freemium companion cohort.
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
- Content: Level 1 user-manuals + Level 2 technical specs + training paths + design-partner operator packet
- Target: docs/user-manuals/, docs/technical/, docs/training/, docs/sales/design-partner-* · reader /docs
- Authors: board-trainer, board-writer
- Workflow: GET /api/board/shared-context → documentationBrief → POST /api/documentation/execute
- Design-partner rollout: keep partner packet + LEVEL1-PARTNER-INDEX aligned with Path B $4,999 program; never invent free pilots

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
  const perimeterWorkers = PERIMETER_WORKFORCE_APPS.map(
    w =>
      `- ${w.label} :${w.port} (${w.id}) | CRM=${w.crmStage ?? 'n/a'} | HITL=${w.hitlDraftKind ?? 'n/a'} | ${w.role}`,
  ).join('\n');
  return [
    '=== IRONBOARD STATIC CONTEXT (READ-ONLY; NO LIVE DATABASE) ===',
    '',
    PERIMETER_WORKFORCE_BINDING,
    '',
    DOCUMENTATION_CORPUS_BINDING,
    '',
    MARKETING_STRATEGY_KNOWLEDGE_BINDING,
    '',
    CUSTOMER_SUCCESS_KNOWLEDGE_BINDING,
    '',
    WORKFORCE_VS_SIMULATION_DISAMBIGUATION,
    '',
    PHASE1_MONETIZATION_BOARD_MANDATE,
    '',
    DESIGN_PARTNER_LAUNCH_BRIEFING,
    '',
    'FOUR PILLARS BLUEPRINT:',
    CODESPACE_FOUR_PILLARS_BLUEPRINT,
    '',
    '16-PERSONA EXECUTIVE ROSTER:',
    roster,
    '',
    `${STRATEGIC_KNOWLEDGE_VAULT.length}-BOOK STRATEGY VAULT:`,
    vault,
    '',
    'PRODUCT REGISTRY:',
    products,
    '',
    'PERIMETER WORKFORCE APP REGISTRY:',
    perimeterWorkers,
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
