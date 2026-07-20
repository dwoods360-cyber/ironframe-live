import type { LeadGenKnowledgeEntry } from '../types/leadGenKnowledge.js';
import { DESIGN_PARTNER_PATH_B_USD } from '../../../lib/ironframeProductKnowledge/commercial.js';

const ALL = 'ALL' as const;

/**
 * Ironleads authoritative lead-generation corpus — books, frameworks, and OSINT strategies
 * aligned to Ironframe beachheads (regional BHC, NERC utilities, MSSP enclaves, HIPAA health).
 */
export const LEAD_GEN_KNOWLEDGE_CORPUS: Record<string, LeadGenKnowledgeEntry> = {
  predictable_revenue: {
    id: 'predictable_revenue',
    kind: 'book',
    title: 'Predictable Revenue',
    authors: ['Aaron Ross', 'Marylou Tyler'],
    publicationYear: 2011,
    category: 'sales_development',
    coreConcept:
      'Specialize roles (SDR vs AE), outbound cadences, and measurable pipeline generation — Cold Calling 2.0 and separation of prospecting from closing.',
    ironframeApplication:
      'Map SDR qualification to IronBoard SUSPECT→PROSPECT promotion; AEs advance only scored leads with dollar-denominated pain documented in CRM.',
    beachheadSectors: ALL,
    keyTactics: [
      'Dedicated prospecting role — no AE self-sourcing in regulated mid-market.',
      'Named-account lists segmented by beachhead vertical.',
      'Email + phone cadence with break-up messages after 8–12 touches.',
      'Pass leads to AE only when BANT+ gap quantified in whole cents.',
    ],
    discoveryQuestions: [
      'Who owns net-new pipeline creation vs closing in your org today?',
      'What is your current SDR-to-AE handoff criteria?',
    ],
    complementaryIronboardPlaybooks: ['sales_acceleration_formula', 'spin_selling'],
    antiPatterns: ['AEs building lists from LinkedIn without trigger context', 'Blended roles under quota pressure'],
  },

  fanatical_prospecting: {
    id: 'fanatical_prospecting',
    kind: 'book',
    title: 'Fanatical Prospecting',
    authors: ['Jeb Blount'],
    publicationYear: 2015,
    category: 'outbound_prospecting',
    coreConcept:
      'Pipeline sufficiency requires daily prospecting discipline — balance phone, email, social, and text with relentless activity metrics.',
    ironframeApplication:
      'Ironleads feeds SDR daily call lists from prioritized CRM scores; reps must clear top-quartile SUSPECT queue before broad outbound.',
    beachheadSectors: ALL,
    keyTactics: [
      'Prospecting blocks on calendar — minimum 2 hours daily untouched.',
      'Multi-channel cadence: call → voicemail → email → LinkedIn → call.',
      'Pipeline math: 3× coverage on quota in qualified opportunities.',
      'Work the prioritized list — highest priorityScore contacts first.',
    ],
    triggerSignals: ['NEW_CISO', 'COMPLIANCE_JOB_POST'],
    antiPatterns: ['Waiting for inbound in regulated sectors', 'Random account blitz without beachhead filter'],
    complementaryIronboardPlaybooks: ['sales_machine'],
  },

  new_sales_simplified: {
    id: 'new_sales_simplified',
    kind: 'book',
    title: 'New Sales. Simplified.',
    authors: ['Mike Weinberg'],
    publicationYear: 2012,
    category: 'outbound_prospecting',
    coreConcept:
      'New business development is a distinct craft — prospecting, storytelling, and pipeline creation separate from account management.',
    ironframeApplication:
      'Position Ironframe as new-logo motion for MSSPs and regional BHCs — not a upsell play. Story: dollar-denominated board risk vs heatmap theater.',
    beachheadSectors: ALL,
    keyTactics: [
      'Lead with a sharp sales story — problem → differentiation → proof.',
      'Prospect into pain — regulatory scrutiny and board mandates.',
      'Protect new-business time from customer success fire drills.',
    ],
    discoveryQuestions: [
      'What percentage of revenue comes from new logos vs expansion?',
      'Who is accountable for new business pipeline this quarter?',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'gap_selling'],
  },

  sales_development_playbook: {
    id: 'sales_development_playbook',
    kind: 'book',
    title: 'The Sales Development Playbook',
    authors: ['Trish Bertuzzi', 'Adam Goldstein'],
    publicationYear: 2015,
    category: 'sales_development',
    coreConcept:
      'Build and scale SDR teams with ICP definition, messaging, metrics, and handoff SLAs for B2B pipeline generation.',
    ironframeApplication:
      'SDR scripts use IronBoard discovery questions; handoff requires priorityScore ≥ 40 and documented trigger tag.',
    beachheadSectors: ALL,
    keyTactics: [
      'Define ICP by beachhead sector enum — reject out-of-vertical accounts.',
      'SDR metrics: meetings booked, SQL rate, time-to-first-touch on SUSPECT leads.',
      'Structured handoff template: pain, trigger, stakeholders, cents estimate.',
    ],
    osintVectors: ['compliance_job_postings', 'leadership_change_announcements'],
    complementaryIronboardPlaybooks: ['spin_selling', 'sales_acceleration_formula'],
  },

  complex_sale_lead_gen: {
    id: 'complex_sale_lead_gen',
    kind: 'book',
    title: 'Lead Generation for the Complex Sale',
    authors: ['Brian Carroll'],
    publicationYear: 2006,
    category: 'inbound_demand_gen',
    coreConcept:
      'Complex B2B buying requires nurtured leads, scoring, and alignment between marketing and sales over long cycles.',
    ironframeApplication:
      'Score inbound + OSINT leads with deterministic priority vector; nurture MSSP partners until multi-tenant enclave pain is explicit.',
    beachheadSectors: ALL,
    keyTactics: [
      'Lead scoring: fit (beachhead) + behavior (content) + trigger (OSINT).',
      'Nurture tracks by vertical — NERC content for utilities, FFIEC for BHC.',
      'Sales-ready definition: budget owner identified + implied pain in cents.',
    ],
    triggerSignals: ['REG_FINE', 'AUDIT_FINDING', 'BOARD_MANDATE_DOLLAR_RISK'],
    complementaryIronboardPlaybooks: ['spin_selling', 'gap_selling'],
  },

  impossible_to_inevitable: {
    id: 'impossible_to_inevitable',
    kind: 'book',
    title: 'From Impossible to Inevitable',
    authors: ['Jason Lemkin', 'Aaron Ross'],
    publicationYear: 2016,
    category: 'executive_selling',
    coreConcept:
      'SaaS growth levers — niche domination, churn reduction, expansion, and process — applied to break through revenue plateaus.',
    ironframeApplication:
      'Dominate one beachhead at a time (regional BHC first); expand to utilities and health only after reference accounts exist.',
    beachheadSectors: ALL,
    keyTactics: [
      'Pick a niche and own it — no horizontal GRC spray.',
      'Design partner program before broad marketing spend.',
      'Executive sponsorship on every deal > $250k ACV equivalent.',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'sales_enablement_board'],
  },

  founding_sales: {
    id: 'founding_sales',
    kind: 'book',
    title: 'Founding Sales',
    authors: ['Pete Kazanjy'],
    publicationYear: 2020,
    category: 'sales_development',
    coreConcept:
      'Early-stage B2B sales — ICP, messaging, hiring first reps, and repeatable pipeline before scale.',
    ironframeApplication:
      'Design-partner motion: 5–10 named accounts per beachhead with co-development narrative and board-ready ALE exports.',
    beachheadSectors: ALL,
    keyTactics: [
      'Founder-led sales until playbook repeats 3×.',
      'Document winning calls — feed IronBoard methodology validation.',
      'Hire first AE only when SDR motion produces predictable SQLs.',
    ],
    complementaryIronboardPlaybooks: ['spin_selling', 'gap_selling'],
  },

  obviously_awesome: {
    id: 'obviously_awesome',
    kind: 'book',
    title: 'Obviously Awesome',
    authors: ['April Dunford'],
    publicationYear: 2019,
    category: 'positioning_messaging',
    coreConcept:
      'Positioning is context setting — competitive alternatives, unique attributes, value, and target market definition.',
    ironframeApplication:
      'Outbound opens with positioning against heatmap GRC and spreadsheet board packs — not feature lists.',
    beachheadSectors: ALL,
    keyTactics: [
      'Define competitive alternatives: spreadsheets, legacy GRC, bolt-on AI chat.',
      'Lead with "quantitative GRC command post" category for each beachhead.',
      'Tailor value themes: subsidiary isolation (BHC), NERC evidence (utility), client enclaves (MSSP).',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'gap_selling'],
  },

  crossing_the_chasm: {
    id: 'crossing_the_chasm',
    kind: 'book',
    title: 'Crossing the Chasm',
    authors: ['Geoffrey A. Moore'],
    publicationYear: 1991,
    category: 'positioning_messaging',
    coreConcept:
      'Beachhead segment concentration — dominate a niche with whole product before adjacent expansion.',
    ironframeApplication:
      'Ironleads beachhead enum enforces chasm discipline — no pipeline stage advance without sector alignment.',
    beachheadSectors: ALL,
    keyTactics: [
      'Single beachhead until 3+ reference logos in segment.',
      'Whole product: GRC + ALE + Irongate ingest + board export.',
      'Pragmatist buyers need peer proof in their vertical.',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale'],
  },

  traction_bullseye: {
    id: 'traction_bullseye',
    kind: 'book',
    title: 'Traction',
    authors: ['Gabriel Weinberg', 'Justin Mares'],
    publicationYear: 2014,
    category: 'inbound_demand_gen',
    coreConcept:
      'Bullseye Framework — test traction channels systematically; double down on what moves needle.',
    ironframeApplication:
      'Test OSINT trigger channel vs executive roundtables vs MSSP referrals per beachhead; measure SQL cost per channel.',
    beachheadSectors: ALL,
    keyTactics: [
      'Outer ring: brainstorm 19 channels; middle ring: rank by potential.',
      'Inner ring: run cheap tests on top 3 channels per quarter.',
      'For Ironframe: prioritize trigger OSINT + ABM over paid social.',
    ],
    complementaryIronboardPlaybooks: ['sales_acceleration_formula'],
  },

  snap_selling: {
    id: 'snap_selling',
    kind: 'book',
    title: 'SNAP Selling',
    authors: ['Jill Konrath'],
    publicationYear: 2010,
    category: 'executive_selling',
    coreConcept:
      'Keep it Simple, be iNvaluable, always Align, raise Priorities — sell to frazzled executives.',
    ironframeApplication:
      'CISO and GC buyers are SNAP profiles — short, priority-aligned outreach citing board dollar-risk mandate.',
    beachheadSectors: ALL,
    keyTactics: [
      'Simple: one insight per touch, no 12-page decks on first call.',
      'Align to their #1 priority: audit readiness, board reporting, breach avoidance.',
      'Priority: tie Ironframe to this quarter board meeting date.',
    ],
    discoveryQuestions: [
      'What is the single highest-stakes initiative on your plate this quarter?',
      'When is your next board or regulator-facing review?',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'spin_selling'],
  },

  jolt_effect: {
    id: 'jolt_effect',
    kind: 'book',
    title: 'The Jolt Effect',
    authors: ['Matthew Dixon', 'Ted McKenna'],
    publicationYear: 2022,
    category: 'executive_selling',
    coreConcept:
      'Buyers fear making mistakes (FOMU) more than missing out — offer recommendation, not more information.',
    ironframeApplication:
      'After commercial insight, deliver a prescriptive path: pilot scope, timeline, and board packet template.',
    beachheadSectors: ALL,
    keyTactics: [
      'Diagnose indecision — offer limited-choice recommendation.',
      'Reduce fear with pilot design partners and immutable audit trail proof.',
      'Avoid feature dumps that increase decision anxiety.',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'never_split_the_difference'],
  },

  hacking_sales: {
    id: 'hacking_sales',
    kind: 'book',
    title: 'Hacking Sales',
    authors: ['Max Altschuler'],
    publicationYear: 2016,
    category: 'outbound_prospecting',
    coreConcept:
      'Sales stack optimization — tools, automation, and data for scalable outbound without losing personalization.',
    ironframeApplication:
      'Ironleads is the OSINT layer; IronBoard CRM is system of record — no scraper writes directly to production DB.',
    beachheadSectors: ALL,
    keyTactics: [
      'Stack: CRM + intent data + sequencing + call recording.',
      'Automate research, personalize first line from trigger.',
      'A/B test subject lines on regulatory trigger vs generic GRC.',
    ],
    osintVectors: ['regulatory_feeds', 'job_boards', 'press_releases'],
    complementaryIronboardPlaybooks: ['sales_acceleration_formula'],
  },

  linkedin_unlocked: {
    id: 'linkedin_unlocked',
    kind: 'book',
    title: 'LinkedIn Unlocked',
    authors: ['Melonie Dodaro'],
    publicationYear: 2018,
    category: 'social_selling',
    coreConcept:
      'LinkedIn for B2B — optimized profiles, content, and social selling workflows for lead generation.',
    ironframeApplication:
      'Social touches supplement OSINT — connect after trigger event with insight comment, not pitch slap.',
    beachheadSectors: ALL,
    keyTactics: [
      'Engage on prospect compliance posts before connection request.',
      'Share dollar-denominated risk content — not product screenshots.',
      'Use Sales Navigator filters: title (CISO, CRO), industry, recent job change.',
    ],
    triggerSignals: ['NEW_CISO', 'COMPLIANCE_JOB_POST'],
    antiPatterns: ['Automated connection blasts without trigger context', 'Scraping LinkedIn at scale — ToS risk'],
  },

  social_selling_mastery: {
    id: 'social_selling_mastery',
    kind: 'book',
    title: 'Social Selling Mastery',
    authors: ['Koka Sexton', 'Doug Seidman'],
    publicationYear: 2014,
    category: 'social_selling',
    coreConcept:
      'Build credibility online, target buyers socially, and integrate social into multi-touch outbound.',
    ironframeApplication:
      'IronBoard agents draft insight-led social comments; humans approve before post.',
    beachheadSectors: ALL,
    keyTactics: [
      'Profile positions rep as GRC quantification expert.',
      'Monitor target account executive posts for engagement windows.',
      'Social proof: share anonymized board packet outcomes.',
    ],
    complementaryIronboardPlaybooks: ['influence_persuasion'],
  },

  abm_is_b2b: {
    id: 'abm_is_b2b',
    kind: 'book',
    title: 'ABM Is B2B',
    authors: ['Sangram Vajre', 'Gabe Larsen'],
    publicationYear: 2020,
    category: 'account_based_marketing',
    coreConcept:
      'Account-Based Marketing treats accounts as markets — marketing and sales unified on named target lists.',
    ironframeApplication:
      'Dream 100 per beachhead — one ABM tier-1 list per vertical with trigger monitoring on each account.',
    beachheadSectors: ALL,
    keyTactics: [
      'Tier 1: 25 accounts — custom insight + executive meeting goal.',
      'Tier 2: 75 accounts — sequenced outbound + webinar invite.',
      'Marketing air cover: vertical-specific compliance briefings.',
    ],
    complementaryIronboardPlaybooks: ['sales_machine', 'challenger_sale'],
  },

  to_sell_is_human: {
    id: 'to_sell_is_human',
    kind: 'book',
    title: 'To Sell Is Human',
    authors: ['Daniel H. Pink'],
    publicationYear: 2012,
    category: 'executive_selling',
    coreConcept:
      'Attunement, buoyancy, and clarity — modern selling is moving others through perspective and clear contrast.',
    ironframeApplication:
      'Discovery clarity: contrast spreadsheet board packs vs deterministic ALE command post.',
    beachheadSectors: ALL,
    keyTactics: [
      'Attune to buyer worldview — regulator-first vs board-first framing.',
      'Buoyancy: expect long cycles in regulated procurement.',
      'Clarity: one-sentence problem statement per outreach.',
    ],
    complementaryIronboardPlaybooks: ['spin_selling'],
  },

  mom_test: {
    id: 'mom_test',
    kind: 'book',
    title: 'The Mom Test',
    authors: ['Rob Fitzpatrick'],
    publicationYear: 2013,
    category: 'executive_selling',
    coreConcept:
      'Ask questions that even your mom cannot lie about — past behavior, not hypothetical praise.',
    ironframeApplication:
      'IronBoard discovery mandates past-tense questions — last board slide, last audit, last fine.',
    beachheadSectors: ALL,
    keyTactics: [
      'Ask about past behavior: "Walk me through the last board cyber slide…"',
      'Never ask "Would you buy a platform that…"',
      'Talk about their life, not your idea.',
    ],
    discoveryQuestions: [
      'Walk me through the last board cyber slide — where did each number come from?',
      'After SOC 2, where does GRC live day to day?',
      'How do you quantify cyber risk for the board today?',
    ],
    complementaryIronboardPlaybooks: ['spin_selling', 'gap_selling'],
  },

  ultimate_sales_machine: {
    id: 'ultimate_sales_machine',
    kind: 'book',
    title: 'The Ultimate Sales Machine',
    authors: ['Chet Holmes'],
    publicationYear: 2004,
    category: 'outbound_prospecting',
    coreConcept:
      'Piggybacking on Dream 100 — stadium pitch, time management, and education-based marketing to penetrate top accounts.',
    ironframeApplication:
      'Same author lineage as sales_machine playbook — Ironleads ranks Dream 100 from priorityScore + beachhead fit.',
    beachheadSectors: ALL,
    keyTactics: [
      'Dream 100 account list per rep per beachhead.',
      'Education-based marketing: executive briefing on dollar-denominated cyber risk.',
      'Touch every Dream 100 account monthly minimum.',
    ],
    complementaryIronboardPlaybooks: ['sales_machine'],
  },

  elite_sales_strategies: {
    id: 'elite_sales_strategies',
    kind: 'book',
    title: 'Elite Sales Strategies',
    authors: ['Jeb Blount'],
    publicationYear: 2021,
    category: 'outbound_prospecting',
    coreConcept:
      'Advanced prospecting — precision targeting, message-market fit, and psychological drivers in outbound.',
    ironframeApplication:
      'Pair trigger OSINT with precision messaging — REG_FINE accounts get enforcement-specific opener.',
    beachheadSectors: ALL,
    keyTactics: [
      'Message-market fit testing per beachhead vertical.',
      'Trigger-timed outreach within 72 hours of public signal.',
      'Executive-level brevity — 75 words max first email.',
    ],
    triggerSignals: ['REG_FINE', 'NEW_CISO', 'BREACH_DISCLOSURE'],
    complementaryIronboardPlaybooks: ['challenger_sale', 'sales_machine'],
  },

  never_eat_alone: {
    id: 'never_eat_alone',
    kind: 'book',
    title: 'Never Eat Alone',
    authors: ['Keith Ferrazzi'],
    publicationYear: 2005,
    category: 'partner_channel',
    coreConcept:
      'Relationship leverage through generosity, connectors, and systematic follow-up — network as pipeline.',
    ironframeApplication:
      'MSSP and vCISO channel — partner introductions beat cold outbound for multi-tenant enclave deals.',
    beachheadSectors: ['MSSP_ENCLAVE'],
    keyTactics: [
      'Map connectors: auditors, vCISOs, regional bank consultants.',
      'Give first: share compliance briefing relevant to their clients.',
      'Pinging system — never let a warm relationship go cold.',
    ],
    complementaryIronboardPlaybooks: ['influence_persuasion'],
  },

  // ——— Strategies & frameworks (Ironleads-operational) ———

  dream_100_concentration: {
    id: 'dream_100_concentration',
    kind: 'strategy',
    title: 'Dream 100 Account Concentration',
    authors: ['Chet Holmes', 'Ironleads GTM'],
    category: 'account_based_marketing',
    coreConcept:
      'Focus outbound on a fixed list of highest-value accounts — relentless touches until breakthrough or disqualification.',
    ironframeApplication:
      'Board seeds Dream 100 per beachhead; Ironleads monitors triggers only on list members to control OSINT scope.',
    beachheadSectors: ALL,
    keyTactics: [
      'Cap active Dream 100 at 100 accounts per tenant per beachhead.',
      'Monthly review: promote/demote based on priorityScore drift.',
      'No broad list buys — named strategic accounts only.',
    ],
    osintVectors: ['account_news_alerts', 'leadership_changes'],
    complementaryIronboardPlaybooks: ['sales_machine'],
  },

  trigger_event_selling: {
    id: 'trigger_event_selling',
    kind: 'strategy',
    title: 'Trigger Event Selling',
    authors: ['Ironleads GTM', 'Craig Elias'],
    category: 'trigger_intelligence',
    coreConcept:
      'Reach buyers when change creates urgency — leadership moves, fines, M&A, job posts, breaches.',
    ironframeApplication:
      'Core Ironleads SignalFilter mapping — detectedTrigger field drives outreach timing and opener.',
    beachheadSectors: ALL,
    keyTactics: [
      'Monitor REG_FINE, NEW_CISO, M_AND_A, COMPLIANCE_JOB_POST signals.',
      'First touch within 5 business days of trigger publication.',
      'Open with trigger reference + commercial insight — not product tour.',
    ],
    triggerSignals: ['REG_FINE', 'NEW_CISO', 'M_AND_A', 'COMPLIANCE_JOB_POST', 'BREACH_DISCLOSURE'],
    osintVectors: [
      'ffiec_enforcement_feeds',
      'nerc_compliance_postings',
      'ocr_breach_portal',
      'sec_8k_leadership',
      'linkedin_job_api_allowlist',
    ],
    discoveryQuestions: [
      'What changed in your environment in the last 90 days that elevated cyber risk on the board agenda?',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'spin_selling'],
  },

  regulatory_osint_harvesting: {
    id: 'regulatory_osint_harvesting',
    kind: 'strategy',
    title: 'Regulatory OSINT Harvesting',
    authors: ['Ironleads GTM'],
    category: 'trigger_intelligence',
    coreConcept:
      'Passive lead discovery from allowlisted public regulatory and enforcement sources — no dark scraping.',
    ironframeApplication:
      'LeadScout agent pulls FFIEC, NERC, OCR, SEC filings; LeadGatekeeper ships sanitized JSON to Irongate ingress.',
    beachheadSectors: ['REGIONAL_BHC', 'UTILITY_NERC', 'HEALTH_HIPAA'],
    keyTactics: [
      'Allowlist only official .gov and regulator domains.',
      'Map enforcement actions to beachhead sector enum.',
      'Store raw HTML in Ironleads scratch DB — never in Ironframe core.',
    ],
    osintVectors: [
      'cisa_kev_advisories',
      'ffiec_press_releases',
      'nerc_violation_notices',
      'hhs_ocr_resolution_agreements',
    ],
    triggerSignals: ['REG_FINE', 'AUDIT_FINDING'],
    antiPatterns: [
      'Scraping LinkedIn or private directories',
      'Autonomous crawl inside Ironframe tenant runtime',
      'Writing un-sanitized HTML to production CRM',
    ],
  },

  job_posting_intent: {
    id: 'job_posting_intent',
    kind: 'strategy',
    title: 'Compliance Job Posting Intent',
    authors: ['Ironleads GTM'],
    category: 'trigger_intelligence',
    coreConcept:
      'New GRC, NERC CIP, or cyber risk quantification roles signal budget and pain — high-intent lead indicator.',
    ironframeApplication:
      'SignalFilter tags COMPLIANCE_JOB_POST; elevates triggerScore in priority formula.',
    beachheadSectors: ALL,
    keyTactics: [
      'Keywords: GRC Analyst, NERC CIP, Cyber Risk Quantification, HIPAA Privacy Officer.',
      'Reach hiring manager + CISO within 2 weeks of post.',
      'Offer workforce benchmark content, not demo on first touch.',
    ],
    triggerSignals: ['COMPLIANCE_JOB_POST'],
    osintVectors: ['indeed_allowlist', 'company_careers_pages', 'usajobs_public_sector'],
    antiPatterns: ['Scraping job boards that prohibit automated access'],
  },

  board_slide_discovery_opener: {
    id: 'board_slide_discovery_opener',
    kind: 'framework',
    title: 'Board Cyber Slide Discovery Opener',
    authors: ['Ironframe Board GTM'],
    category: 'executive_selling',
    coreConcept:
      'Qualify vulnerability by exposing manual, stale, or un-sourced board cyber metrics — Ironframe wedge question.',
    ironframeApplication:
      'Mandatory discovery for priorityScore painMarkers.manualBoardReporting and noDollarRiskQuant.',
    beachheadSectors: ALL,
    keyTactics: [
      'Ask: "Walk me through the last board cyber slide — where did each number come from?"',
      'Follow-up: age of data, systems touched, re-keying steps.',
      'If Excel re-keying exposed — mark HIGH pain, advance from SUSPECT.',
    ],
    discoveryQuestions: [
      'Walk me through the last board cyber slide — where did each number come from, and how old was it when you presented?',
      'How do you quantify cyber risk for the board today?',
      'Who signs off on those figures before the board sees them?',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'spin_selling', 'gap_selling'],
  },

  mssp_partner_flywheel: {
    id: 'mssp_partner_flywheel',
    kind: 'strategy',
    title: 'MSSP / vCISO Partner Flywheel',
    authors: ['Ironleads GTM'],
    category: 'partner_channel',
    coreConcept:
      'Service providers need isolated client command posts — partner-sourced leads convert faster than cold enterprise outbound.',
    ironframeApplication:
      'Target Fractional CISO, MSSP, vCISO firms; pitch per-client tenant enclaves with cryptographic isolation proof.',
    beachheadSectors: ['MSSP_ENCLAVE'],
    keyTactics: [
      'Partner tier: certified Ironframe delivery partners per region.',
      'Co-sell: partner brings client pain, Ironframe brings platform.',
      'Lead share: partner submits inbound via INBOUND_PORTAL ingestion source.',
    ],
    discoveryQuestions: [
      'How do you deliver separate GRC command posts per client today?',
      'Where does evidence bleed risk show up in your audits?',
    ],
    complementaryIronboardPlaybooks: ['gap_selling', 'sales_enablement_board'],
  },

  inbound_compliance_pillar: {
    id: 'inbound_compliance_pillar',
    kind: 'strategy',
    title: 'Compliance Content Pillar Cluster',
    authors: ['Ironleads GTM', 'Brian Carroll'],
    category: 'inbound_demand_gen',
    coreConcept:
      'SEO + gated assets on vertical compliance pain — attract in-market buyers searching regulation-specific terms.',
    ironframeApplication:
      'Publish NERC CIP, FFIEC, HIPAA dollar-risk briefings; gate behind work email → INBOUND_PORTAL CRM source.',
    beachheadSectors: ALL,
    keyTactics: [
      'Pillar pages per beachhead: BHC board ALE, NERC evidence automation, MSSP multi-tenant.',
      'Gated calculator: cyber risk in cents vs peer benchmark.',
      'Retarget visitors with commercial insight emails.',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'complex_sale_lead_gen'],
  },

  executive_roundtable_capture: {
    id: 'executive_roundtable_capture',
    kind: 'strategy',
    title: 'Executive Roundtable Lead Capture',
    authors: ['Ironleads GTM'],
    category: 'executive_selling',
    coreConcept:
      'Intimate CFO/CISO roundtables on dollar-denominated cyber risk — peer learning generates qualified pipeline.',
    ironframeApplication:
      'Board hosts 8–12 person virtual roundtables per beachhead; attendees enter CRM as QUALIFIED with methodology flags.',
    beachheadSectors: ALL,
    keyTactics: [
      'Topic: "Beyond heatmaps — board-grade cyber risk in dollars."',
      'Invite-only from Dream 100 + trigger accounts.',
      'Follow-up within 48 hours with tailored gap analysis offer.',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'influence_persuasion'],
  },

  multi_threading_buying_committee: {
    id: 'multi_threading_buying_committee',
    kind: 'strategy',
    title: 'Multi-Threading the Buying Committee',
    authors: ['Ironleads GTM', 'Mark Roberge'],
    category: 'account_based_marketing',
    coreConcept:
      'Map and engage CISO, CRO, GC, and audit — parallel threads reduce single-champion deal risk.',
    ironframeApplication:
      'Log interactions per stakeholder in IronBoard CRM; require 3+ threads before PROPOSAL stage.',
    beachheadSectors: ALL,
    keyTactics: [
      'Stakeholder map: economic buyer, technical buyer, compliance owner.',
      'Tailor message: CISO=ALE, GC=audit defensibility, CFO=premium impact.',
      'Never advance stage with single-thread relationship.',
    ],
    complementaryIronboardPlaybooks: ['spin_selling', 'sales_enablement_board'],
  },

  commercial_insight_outbound: {
    id: 'commercial_insight_outbound',
    kind: 'framework',
    title: 'Commercial Insight Outbound (Challenger Tease)',
    authors: ['Matthew Dixon', 'Brent Adamson'],
    category: 'outbound_prospecting',
    coreConcept:
      'Lead with insight that reframes buyer thinking — teach before you pitch.',
    ironframeApplication:
      'First email shares non-obvious benchmark (peer ALE, regulatory trend) — methodologyCommercialInsight flag in CRM.',
    beachheadSectors: ALL,
    keyTactics: [
      'Subject line: insight, not product name.',
      'Body: one chart or stat + question — max 100 words.',
      'CTA: 15-minute diagnostic, not demo.',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale'],
    antiPatterns: ['Feature list emails', 'Generic "checking in" follow-ups'],
  },

  predictable_revenue_handoff: {
    id: 'predictable_revenue_handoff',
    kind: 'framework',
    title: 'SDR-to-AE Handoff SLA',
    authors: ['Aaron Ross', 'Ironleads GTM'],
    category: 'sales_development',
    coreConcept:
      'Defined criteria and SLA for when a lead moves from prospecting to closing — no gray zone.',
    ironframeApplication:
      'SUSPECT→PROSPECT requires human promote; PROSPECT→QUALIFIED requires discovery questions documented + priorityScore ≥ 50.',
    beachheadSectors: ALL,
    keyTactics: [
      'Handoff checklist: beachhead fit, trigger, pain in cents, stakeholders named.',
      'SLA: AE accepts or returns lead within 48 hours.',
      'CRM stage gates enforce checklist — no manual override without operator note.',
    ],
    complementaryIronboardPlaybooks: ['sales_acceleration_formula', 'spin_selling'],
  },

  building_a_storybrand: {
    id: 'building_a_storybrand',
    kind: 'book',
    title: 'Building a StoryBrand',
    authors: ['Donald Miller'],
    publicationYear: 2017,
    category: 'positioning_messaging',
    coreConcept:
      'SB7 framework — customer is hero, brand is guide; clarify problem, plan, stakes, and single CTA.',
    ironframeApplication:
      'board-marketing-mgr and website assets use BrandScript: regulated leader hero, heatmap-GRC problem, Ironframe guide, Irongate→Command Center→exports plan.',
    beachheadSectors: ALL,
    keyTactics: [
      'One-liner: problem + solution + result — no feature-first hero lines.',
      'Website wireframe: stakes, guide, plan, CTA; features in junk drawer.',
      'Email nurture: 3–5 emails following problem → insight → plan → proof → CTA.',
    ],
    discoveryQuestions: [
      'What does your board ask for that your current GRC stack cannot defend in dollars?',
      'Who owns the narrative before the next audit or regulator meeting?',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'gap_selling'],
    antiPatterns: ['Multiple CTAs above fold', 'Ironframe as hero', 'Jargon-heavy taglines'],
  },

  marketing_made_simple: {
    id: 'marketing_made_simple',
    kind: 'book',
    title: 'Marketing Made Simple',
    authors: ['Donald Miller'],
    publicationYear: 2020,
    category: 'inbound_demand_gen',
    coreConcept:
      'Five-part funnel: one-liner, lead generator, nurture emails, sales email, StoryBrand website.',
    ironframeApplication:
      'Gated ALE briefs and beachhead pillar PDFs feed INBOUND_PORTAL; nurture ties to IronBoard CRM source tags.',
    beachheadSectors: ALL,
    keyTactics: [
      'Lead magnet per vertical: BHC subsidiary isolation, NERC evidence, MSSP enclave checklist.',
      'Sales email prescribes pilot scope — reduces Jolt Effect indecision.',
      'Align webinar follow-up to single transitional CTA (diagnostic, not demo dump).',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'influence_persuasion'],
  },

  made_to_stick: {
    id: 'made_to_stick',
    kind: 'book',
    title: 'Made to Stick',
    authors: ['Chip Heath', 'Dan Heath'],
    publicationYear: 2007,
    category: 'positioning_messaging',
    coreConcept:
      'SUCCESs — Simple, Unexpected, Concrete, Credible, Emotional, Stories — for messages that persist.',
    ironframeApplication:
      'board-trainer and LinkedIn educational posts: concrete cents, named routes, release SHA proof — not superlatives.',
    beachheadSectors: ALL,
    keyTactics: [
      'Concrete: BigInt cent strings and physical ESG units in every proof post.',
      'Credible: cite test gates and TAS — label demo tenants illustrative.',
      'Stories: one agent solving one named failure mode per spotlight post.',
    ],
    complementaryIronboardPlaybooks: ['influence_persuasion'],
  },

  influence_cialdini: {
    id: 'influence_cialdini',
    kind: 'book',
    title: 'Influence',
    authors: ['Robert Cialdini'],
    publicationYear: 1984,
    category: 'positioning_messaging',
    coreConcept:
      'Six principles of ethical persuasion — reciprocity, commitment, social proof, authority, liking, scarcity.',
    ironframeApplication:
      'Outbound leads with insight (reciprocity); design-partner proof (social proof); TAS/release evidence (authority).',
    beachheadSectors: ALL,
    keyTactics: [
      'Reciprocity: free ALE explainer or regulatory trend insight before ask.',
      'Authority: link release evidence — never claim uncertified SOC2 completion.',
      'Forbidden: fabricated logos, false scarcity, or fake peer benchmarks.',
    ],
    complementaryIronboardPlaybooks: ['influence_persuasion', 'challenger_sale'],
  },

  they_ask_you_answer: {
    id: 'they_ask_you_answer',
    kind: 'book',
    title: 'They Ask, You Answer',
    authors: ['Marcus Sheridan'],
    publicationYear: 2017,
    category: 'inbound_demand_gen',
    coreConcept:
      'Answer every buyer question honestly on the website — comparisons, pricing scope, implementation reality.',
    ironframeApplication:
      'Docs hub and trust center address WORM status, agent maturity, and competitive comparisons with Shipped/Pilot/Roadmap labels.',
    beachheadSectors: ALL,
    keyTactics: [
      'Big Five: cost, problems, comparison, reviews, best-in-class — answered in docs.',
      'Assignment selling: technical evaluators consume architecture chapter before demo.',
      'No gated fluff — substantive answers build trust in regulated buyers.',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'complex_sale_lead_gen'],
  },

  this_is_marketing: {
    id: 'this_is_marketing',
    kind: 'book',
    title: 'This Is Marketing',
    authors: ['Seth Godin'],
    publicationYear: 2018,
    category: 'positioning_messaging',
    coreConcept:
      'Marketing is change for people you seek to serve; smallest viable audience; enrollment over hype.',
    ironframeApplication:
      'Design-partner motion for regulated mid-market — not mass-market self-serve until Phase 2 entitlements.',
    beachheadSectors: ALL,
    keyTactics: [
      'Name the smallest viable audience per beachhead before broadening.',
      'Enrollment: pilot program with explicit scope and human approval gates.',
      'Permission-based nurture — no purchased list blasts.',
    ],
    complementaryIronboardPlaybooks: ['gap_selling'],
  },

  hooked_product_habits: {
    id: 'hooked_product_habits',
    kind: 'book',
    title: 'Hooked',
    authors: ['Nir Eyal'],
    publicationYear: 2014,
    category: 'inbound_demand_gen',
    coreConcept:
      'Trigger → Action → Variable reward → Investment — habit-forming product loops.',
    ironframeApplication:
      'Operator workflows in Command Center (integrity checks, export cadence) — not consumer dark patterns.',
    beachheadSectors: ALL,
    keyTactics: [
      'Investment: completed labs and attestation in training track.',
      'Variable reward: integrity posture improvements after quarantine resolution.',
      'Avoid gamification that trivializes regulatory evidence.',
    ],
    complementaryIronboardPlaybooks: ['sales_enablement_board'],
  },

  positioning_battle_for_mind: {
    id: 'positioning_battle_for_mind',
    kind: 'book',
    title: 'Positioning',
    authors: ['Al Ries', 'Jack Trout'],
    publicationYear: 1981,
    category: 'positioning_messaging',
    coreConcept:
      'Own one word or idea in the prospect mind; simplicity beats feature breadth.',
    ironframeApplication:
      'Repeat "quantitative GRC command post" — resist parallel taglines that dilute category ownership.',
    beachheadSectors: ALL,
    keyTactics: [
      'One category phrase per campaign — align with Play Bigger and Obviously Awesome.',
      'Line extension guard: do not claim full enterprise IRM breadth prematurely.',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'gap_selling'],
  },

  design_partner_launch: {
    id: 'design_partner_launch',
    kind: 'strategy',
    title: 'Design Partner Launch — Multi-Channel Path B Cohort',
    authors: ['Ironframe GTM'],
    publicationYear: 2026,
    category: 'sales_development',
    coreConcept:
      'Cold-start design partners need volume selectivity (≈30 conversations → 3 signed) via multiple acquisition channels, but a single paid Path B program — never freemium beside cohort seats.',
    ironframeApplication:
      'Ironleads harvests SUSPECT on triggers (funding, NEW_CISO, AUDIT_FINDING, REG_FINE, compliance job posts) for regional BHC / NERC / MSSP / HIPAA beachheads; handoff to SalesTeam PROSPECT only with score + trigger. Warm and auditor intros outrank cold. Collaborate with board-marketing-mgr on blurbs; never invent company names; never mint workspaces.',
    beachheadSectors: ALL,
    keyTactics: [
      'Prioritize trigger-tagged SUSPECTs for design-partner ICP shortlist before broad spray.',
      'Pass to SalesTeam with beachhead sector + trigger + email or phone for HITL drafts.',
      'Support warm-network and auditor channel lists as RESEARCH stage accounts in CRM notes.',
      'Target pipeline math for 3–5 Path B seats at $' +
        DESIGN_PARTNER_PATH_B_USD +
        ' — not free pilots.',
    ],
    discoveryQuestions: [
      'Who owns spreadsheet or heatmap GRC evidence that still reaches the board?',
      'Is there an active audit, questionnaire surge, or first dedicated GRC hire?',
    ],
    triggerSignals: [
      'FUNDING_ROUND',
      'NEW_CISO',
      'COMPLIANCE_JOB_POST',
      'AUDIT_FINDING',
      'REG_FINE',
      'BOARD_MANDATE_DOLLAR_RISK',
    ],
    antiPatterns: [
      'Promoting free forever design partners',
      'Citing medshield/vaultbank/gridcore as live prospects',
      'Auto-sending outreach from Ironleads',
    ],
    complementaryIronboardPlaybooks: ['challenger_sale', 'gap_selling', 'sales_enablement_board'],
  },
};

export const LEAD_GEN_KNOWLEDGE_CATALOG = Object.values(LEAD_GEN_KNOWLEDGE_CORPUS);
