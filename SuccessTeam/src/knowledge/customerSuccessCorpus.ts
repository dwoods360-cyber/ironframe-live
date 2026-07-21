import type { CustomerSuccessKnowledgeEntry } from '../types/customerSuccessKnowledge.js';
import { DESIGN_PARTNER_PATH_B_USD } from '../../../lib/ironframeProductKnowledge/commercial.js';

const ALL = 'ALL' as const;

/**
 * IronSuccessTeam authoritative customer-success corpus — books, frameworks, and
 * post-sale strategies aligned to Ironframe beachheads and whole-cent ROI discipline.
 */
export const CUSTOMER_SUCCESS_KNOWLEDGE_CORPUS: Record<string, CustomerSuccessKnowledgeEntry> = {
  customer_success: {
    id: 'customer_success',
    kind: 'book',
    title: 'Customer Success',
    authors: ['Nick Mehta', 'Dan Steinman', 'Lincoln Murphy'],
    publicationYear: 2015,
    category: 'outcome_based_success',
    coreConcept:
      'Customer success is a company-wide philosophy: ensure customers achieve their desired outcomes — retention and expansion follow.',
    ironframeApplication:
      'Bind every CLOSED_WON account to a written success plan with three measurable GRC outcomes; healthAuditor tracks milestone drift.',
    beachheadSectors: ALL,
    keyTactics: [
      'Define success criteria at contract signature — not at renewal.',
      'Segment customers by outcome complexity (BHC vs NERC vs HIPAA).',
      'Escalate at-risk accounts before renewal window opens.',
      'Celebrate outcome milestones in CRM (FIRST_ACTION, COVERAGE_STARTED).',
    ],
    healthSignals: ['STALE_ENGAGEMENT', 'LOW_EVIDENCE_COMPLETENESS'],
    retentionPlays: ['Success plan reset call', 'Executive sponsor alignment'],
    expansionPlays: ['Module add-on after outcome proof'],
    antiPatterns: ['Vanity metrics without audit-ready evidence', 'CSM as unpaid support tier'],
    complementaryCorpusIds: ['customer_success_economy', 'land_adopt_expand'],
  },

  customer_success_economy: {
    id: 'customer_success_economy',
    kind: 'book',
    title: 'The Customer Success Economy',
    authors: ['Nick Mehta', 'David Cannan', 'Mikael Blaisdell'],
    publicationYear: 2022,
    category: 'cs_operations',
    coreConcept:
      'CS is a growth engine — recurring revenue requires systematic post-sale economics and board-level CS metrics.',
    ironframeApplication:
      'valueQuantifier reports net retention proxy using deal valueCents and expansion flags — BigInt only, no float ARR math in advisories.',
    beachheadSectors: ALL,
    keyTactics: [
      'Tie CS headcount to gross retention and expansion cents, not ticket volume.',
      'Instrument health scores for board reporting alongside NRR.',
      'Invest in digital CS for tier-2 accounts; high-touch for tier-1 regulated logos.',
    ],
    expansionPlays: ['Land-and-expand module map per beachhead'],
    complementaryCorpusIds: ['subscribed', 'measure_what_matters_cs'],
  },

  impossible_to_inevitable: {
    id: 'impossible_to_inevitable',
    kind: 'book',
    title: 'From Impossible to Inevitable',
    authors: ['Aaron Ross', 'Jason Lemkin'],
    publicationYear: 2016,
    category: 'expansion_upsell',
    coreConcept:
      'Hypergrowth comes from nailing a niche, building predictable pipeline, and making customers successful enough to expand.',
    ironframeApplication:
      'expansionFinder triggers only when health ≥ 80 and pilot gates pass — avoid premature upsell in regulated accounts.',
    beachheadSectors: ALL,
    keyTactics: [
      'Pick one beachhead and dominate before adjacent expansion.',
      'Processize onboarding — 90-day playbook with named milestones.',
      'Monitor leading indicators (first action, evidence %) not lagging churn.',
    ],
    expansionPlays: ['Seat expansion after 2 consecutive healthy poll cycles'],
    antiPatterns: ['Chasing every vertical simultaneously', 'Upsell during save plays'],
    complementaryCorpusIds: ['predictable_revenue_cs', 'rocket_ship_growth'],
  },

  subscribed: {
    id: 'subscribed',
    kind: 'book',
    title: 'Subscribed',
    authors: ['Tien Tzuo', 'Gabe Weisert'],
    publicationYear: 2018,
    category: 'outcome_based_success',
    coreConcept:
      'The world is moving to subscription relationships — success is continuous value delivery, not one-time implementation.',
    ironframeApplication:
      'Frame Ironframe as ongoing governance command post — renewal narrative emphasizes continuous attestation, not shelfware.',
    beachheadSectors: ALL,
    keyTactics: [
      'Price and package around outcomes (controls covered, evidence exports).',
      'Usage telemetry informs health — but GRC outcomes trump login counts.',
      'Design renewal as a value review, not a procurement fight.',
    ],
    healthSignals: ['DECLINING_LOGIN', 'STALE_ENGAGEMENT'],
    renewalPlays: ['Value review deck with ALE trend in cents'],
    complementaryCorpusIds: ['outcome_based_retention'],
  },

  gainsight_playbook: {
    id: 'gainsight_playbook',
    kind: 'framework',
    title: 'Gainsight Customer Success Methodology',
    authors: ['Gainsight'],
    category: 'health_scoring',
    coreConcept:
      'Combine product usage, relationship, and outcome data into health scores; automate plays by segment.',
    ironframeApplication:
      'healthAuditor implements deterministic health-score-framework.md; expansionFinder reads band + beachhead modifiers.',
    beachheadSectors: ALL,
    keyTactics: [
      'Health score = engagement + evidence + pilot gates (integer formula).',
      'Automate internal advisories — never automate client send.',
      'CTA playbooks mapped to health bands (healthy / watch / at-risk / critical).',
    ],
    healthSignals: ['STALE_ENGAGEMENT', 'LOW_EVIDENCE_COMPLETENESS', 'MISSED_PILOT_GATE'],
    complementaryCorpusIds: ['health_score_model', 'smile_chart'],
  },

  health_score_model: {
    id: 'health_score_model',
    kind: 'framework',
    title: 'SaaS Health Score Model',
    authors: ['Lincoln Murphy', 'Nick Mehta'],
    category: 'health_scoring',
    coreConcept:
      'Weighted composite of usage, support, sentiment, and outcomes predicts churn 60–90 days ahead.',
    ironframeApplication:
      'Poll worker computes 0–100 score without LLM; narrative nodes explain score to operators only.',
    beachheadSectors: ALL,
    keyTactics: [
      'Weight outcomes higher than logins for GRC buyers.',
      'Recalibrate weights quarterly per beachhead.',
      'Trigger retention play at score < 60 for two consecutive polls.',
    ],
    healthSignals: ['STALE_ENGAGEMENT', 'SUPPORT_ESCALATION', 'NEGATIVE_NPS'],
    retentionPlays: ['Executive business review', 'Remediation success plan'],
  },

  smile_chart: {
    id: 'smile_chart',
    kind: 'framework',
    title: 'SMILE Chart (Success Metrics)',
    authors: ['Gainsight'],
    category: 'health_scoring',
    coreConcept:
      'SMILE — Sentiment, Milestones, Interaction, License utilization, Engagement — structures health dimensions.',
    ironframeApplication:
      'Map Milestones to crmPilotTracking events; Interaction to CRM touch recency; Engagement to analyst workflows.',
    beachheadSectors: ALL,
    keyTactics: [
      'Milestones: FIRST_ACTION, COVERAGE_STARTED, OUTCOME_MILESTONE.',
      'Interaction decay drives retention advisories.',
      'License utilization secondary to evidence completeness in regulated sectors.',
    ],
  },

  land_adopt_expand: {
    id: 'land_adopt_expand',
    kind: 'strategy',
    title: 'Land-Adopt-Expand',
    authors: ['SaaS industry standard'],
    category: 'expansion_upsell',
    coreConcept:
      'Sequence growth: land with focused use case, drive adoption to outcome, expand wallet share with proof.',
    ironframeApplication:
      'onboarding-success-playbook.md gates expansion until day 90 or health ≥ 80; expansionFinder enforces.',
    beachheadSectors: ALL,
    keyTactics: [
      'Land: single beachhead module with success plan.',
      'Adopt: 90-day milestones with operator checkpoints.',
      'Expand: QBR-proposed add-on with cent-denominated ROI proof.',
    ],
    expansionPlays: ['Irontally pack', 'Additional enclave tenant', 'Board reporting module'],
    antiPatterns: ['Expand before first export hash captured'],
  },

  farm_dont_hunt: {
    id: 'farm_dont_hunt',
    kind: 'book',
    title: "Farm Don't Hunt",
    authors: ['Don Peppers', 'Martha Rogers'],
    publicationYear: 2013,
    category: 'customer_intimacy',
    coreConcept:
      'Maximize customer lifetime value through nurturing existing relationships — farming beats hunting for mature SaaS.',
    ironframeApplication:
      'Protect CSM calendar from new-logo fire drills; IronSuccessTeam automates watch-list triage for stale accounts.',
    beachheadSectors: ALL,
    keyTactics: [
      'Proactive outreach before renewal — not reactive at invoice.',
      'Personalize by beachhead regulatory calendar.',
      'Trust-based expansion — never surprise price increases.',
    ],
    retentionPlays: ['Proactive QBR', 'Success plan refresh'],
    complementaryCorpusIds: ['discipline_customer_intimacy'],
  },

  discipline_customer_intimacy: {
    id: 'discipline_customer_intimacy',
    kind: 'book',
    title: 'The Discipline of Market Leaders — Customer Intimacy',
    authors: ['Michael Treacy', 'Fred Wiersema'],
    publicationYear: 1995,
    category: 'customer_intimacy',
    coreConcept:
      'Customer intimacy value discipline: tailor offerings to each client — depth of relationship over lowest price.',
    ironframeApplication:
      'board-customer-success primary alignment; beachhead-specific playbooks (Medshield, Vaultbank, Gridcore).',
    beachheadSectors: ALL,
    keyTactics: [
      'Customize success plans per regulatory profile.',
      'Maintain threshold competence in ops excellence and product — do not neglect Irontally depth.',
      'Use tenant-scoped data — never cross-tenant benchmarking in client comms.',
    ],
    complementaryCorpusIds: ['farm_dont_hunt', 'customer_success'],
  },

  effortless_experience: {
    id: 'effortless_experience',
    kind: 'book',
    title: 'The Effortless Experience',
    authors: ['Matthew Dixon', 'Nick Toman', 'Rick DeLisi'],
    publicationYear: 2013,
    category: 'retention_churn',
    coreConcept:
      'Customer loyalty comes from reducing effort — not delight alone. Fix root causes of repeat contacts.',
    ironframeApplication:
      'Track support escalations as health signal; advisoryGatekeeper proposes effort-reduction plan (fewer re-keying steps).',
    beachheadSectors: ALL,
    keyTactics: [
      'Measure repeat tickets on same control family.',
      'Eliminate swivel-chair exports — Ironscribe one-click hashes.',
      'Do not ask customers to restate tenant context — Ironguard RLS preserves scope.',
    ],
    healthSignals: ['SUPPORT_ESCALATION'],
    retentionPlays: ['Effort audit workshop'],
    antiPatterns: ['Over-apologizing without process fix'],
  },

  chief_customer_officer: {
    id: 'chief_customer_officer',
    kind: 'book',
    title: 'Chief Customer Officer 2.0',
    authors: ['Nick Mehta', 'Peter Kriss', 'Dan Steinman'],
    publicationYear: 2018,
    category: 'cs_operations',
    coreConcept:
      'CCO function unifies success, support, and advocacy — metrics roll up to board-level retention and expansion.',
    ironframeApplication:
      'IronSuccessTeam advisories feed operator approval queue — CCO-equivalent human co-sign before client send.',
    beachheadSectors: ALL,
    keyTactics: [
      'Single view of account health in CRM poll snapshots.',
      'Voice-of-customer loops into product roadmap honesty (Shipped/Pilot/Roadmap).',
      'Advocacy only after documented outcome — labeled design partners.',
    ],
    complementaryCorpusIds: ['customer_success_economy'],
  },

  challenger_customer: {
    id: 'challenger_customer',
    kind: 'book',
    title: 'The Challenger Customer',
    authors: ['Matthew Dixon', 'Brent Adamson', 'Pat Saur', 'Nick Toman'],
    publicationYear: 2015,
    category: 'qbr_executive',
    coreConcept:
      'In complex B2B, mobilize the buying group with commercial insight — teach, tailor, take control in QBRs.',
    ironframeApplication:
      'qbr-expansion-framework.md uses Challenger teaching in section 3 — reframe heatmap GRC as dollar risk.',
    beachheadSectors: ALL,
    keyTactics: [
      'Teach: beyond-the-heatmap insight with ALE cents.',
      'Tailor: beachhead-specific compliance hook.',
      'Take control: mutual close plan with dates.',
    ],
    expansionPlays: ['Commercial insight QBR deck'],
    complementaryCorpusIds: ['they_ask_trust'],
  },

  they_ask_trust: {
    id: 'they_ask_trust',
    kind: 'book',
    title: 'They Ask, You Answer',
    authors: ['Marcus Sheridan'],
    publicationYear: 2017,
    category: 'voice_of_customer',
    coreConcept:
      'Answer buyer and customer questions transparently — build trust before and after the sale.',
    ironframeApplication:
      'Renewal conversations cite docs hub honesty — certification scope, Shipped vs Pilot labels.',
    beachheadSectors: ALL,
    keyTactics: [
      'Pre-empt renewal objections with evidence of value delivered.',
      'Publish comparison and limitation content — no hidden scope gaps.',
      'Use assignment selling for expansion — customer reads ROI brief before call.',
    ],
    complementaryCorpusIds: ['challenger_customer'],
  },

  measure_what_matters_cs: {
    id: 'measure_what_matters_cs',
    kind: 'book',
    title: 'Measure What Matters',
    authors: ['John Doerr'],
    publicationYear: 2018,
    category: 'cs_operations',
    coreConcept:
      'OKRs align teams to measurable outcomes — CS OKRs must be customer-outcome linked, not internal activity.',
    ironframeApplication:
      'Success plans use OKR triplets: Objective (board-ready GRC), Key Results (integer metrics), owner per KR.',
    beachheadSectors: ALL,
    keyTactics: [
      'KR examples: evidence completeness %, days to FIRST_ACTION, health score band.',
      'Weekly CS OKR check in operator standup — not auto-emailed to client.',
      'Stretch goals require operator approval before client commitment.',
    ],
    complementaryCorpusIds: ['customer_success_economy'],
  },

  crossing_chasm_expansion: {
    id: 'crossing_chasm_expansion',
    kind: 'book',
    title: 'Crossing the Chasm — Bowling Alley Expansion',
    authors: ['Geoffrey A. Moore'],
    publicationYear: 2014,
    category: 'expansion_upsell',
    coreConcept:
      'Expand within beachhead niche before adjacent segments — bowling pin strategy.',
    ironframeApplication:
      'Expand MSSP enclaves before pitching unrelated verticals; expansionFinder respects beachheadSector.',
    beachheadSectors: ALL,
    keyTactics: [
      'Reference customers within same beachhead only.',
      'Whole product gaps documented before expansion pitch.',
      'Adjacent sector (RING_2) only after core beachhead outcome proof.',
    ],
    expansionPlays: ['Same-beachhead reference call', 'Enclave tenant add-on'],
  },

  good_to_great_flywheel: {
    id: 'good_to_great_flywheel',
    kind: 'book',
    title: 'Good to Great — Flywheel Effect',
    authors: ['Jim Collins'],
    publicationYear: 2001,
    category: 'outcome_based_success',
    coreConcept:
      'Compounding momentum from disciplined execution — each success rotation makes the next easier.',
    ironframeApplication:
      'Document outcome milestones in CRM so each renewal cycle starts with proof — flywheel of evidence exports.',
    beachheadSectors: ALL,
    keyTactics: [
      'Hedgehog: passion for GRC + world-class attestation + economic engine in cents.',
      'Flywheel push: faster onboarding → higher health → more references.',
      'Avoid unrelated accelerators that dilute beachhead focus.',
    ],
  },

  outcome_based_retention: {
    id: 'outcome_based_retention',
    kind: 'strategy',
    title: 'Outcome-Based Customer Success',
    authors: ['TSIA', 'Nick Mehta'],
    category: 'outcome_based_success',
    coreConcept:
      'Contract and success metrics tied to customer business outcomes — not feature checklists.',
    ironframeApplication:
      'valueQuantifier binds ROI narrative to Irontrust ALE and deal valueCents — never fabricated savings.',
    beachheadSectors: ALL,
    keyTactics: [
      'Define outcome metrics in success plan at kickoff.',
      'Report outcomes in QBR with export hashes as proof.',
      'Renegotiate only with documented outcome delta.',
    ],
    retentionPlays: ['Outcome reset workshop'],
    expansionPlays: ['Outcome-tier upgrade'],
  },

  onboarding_playbook_90: {
    id: 'onboarding_playbook_90',
    kind: 'playbook',
    title: '90-Day Onboarding Success',
    authors: ['Ironframe CS'],
    category: 'onboarding_adoption',
    coreConcept:
      'Structured first 90 days: launch, first value, habit — mapped to crmPilotTracking milestones.',
    ironframeApplication:
      'docs/customer-success/onboarding-success-playbook.md; healthAuditor penalizes missing FIRST_ACTION.',
    beachheadSectors: ALL,
    keyTactics: [
      'Day 0–14: workspace + success plan.',
      'Day 15–45: FIRST_ACTION milestone.',
      'Day 46–90: COVERAGE_STARTED and health ≥ 60.',
    ],
    healthSignals: ['LOW_EVIDENCE_COMPLETENESS', 'MISSED_PILOT_GATE'],
    complementaryCorpusIds: ['customer_success', 'land_adopt_expand'],
  },

  retention_save_plays: {
    id: 'retention_save_plays',
    kind: 'playbook',
    title: 'Retention & Save Plays',
    authors: ['Ironframe CS'],
    category: 'retention_churn',
    coreConcept:
      'Tiered interventions by health band — re-engagement, save call, executive escalation.',
    ironframeApplication:
      'docs/customer-success/retention-playbook.md; advisoryGatekeeper selects play from corpus by health band.',
    beachheadSectors: ALL,
    keyTactics: [
      'Watch band: proactive check-in advisory.',
      'At-risk: retention playbook + evidence workshop.',
      'Critical: operator escalation — no auto-send.',
    ],
    healthSignals: ['STALE_ENGAGEMENT', 'SUPPORT_ESCALATION'],
    retentionPlays: ['Re-engagement email draft', 'Executive save call', 'Remediation plan'],
    antiPatterns: ['Expansion pitch while at-risk'],
  },

  qbr_expansion_framework: {
    id: 'qbr_expansion_framework',
    kind: 'playbook',
    title: 'QBR & Expansion Framework',
    authors: ['Ironframe CS'],
    category: 'qbr_executive',
    coreConcept:
      '60-minute QBR agenda with Challenger commercial insight and expansion gating.',
    ironframeApplication:
      'docs/customer-success/qbr-expansion-framework.md; expansionFinder eligible at health ≥ 80.',
    beachheadSectors: ALL,
    keyTactics: [
      'Pre-read 48 hours before QBR.',
      'Section 3: teach-tailor-take-control with ALE cents.',
      'Expansion only after two healthy poll cycles.',
    ],
    expansionPlays: ['Module map', 'Seat pack', 'Enclave tenant'],
    complementaryCorpusIds: ['challenger_customer', 'land_adopt_expand'],
  },

  nps_voice_of_customer: {
    id: 'nps_voice_of_customer',
    kind: 'framework',
    title: 'Net Promoter System',
    authors: ['Fred Reichheld', 'Bain & Company'],
    category: 'voice_of_customer',
    coreConcept:
      'NPS categorizes promoters, passives, detractors — close the loop on detractors within 48 hours.',
    ironframeApplication:
      'NEGATIVE_NPS health signal triggers retention play; never publish NPS without operator review.',
    beachheadSectors: ALL,
    keyTactics: [
      'Survey after OUTCOME_MILESTONE — not after every ticket.',
      'Detractor callback within 48 business hours.',
      'Promoter advocacy only with written approval.',
    ],
    healthSignals: ['NEGATIVE_NPS'],
    retentionPlays: ['Detractor callback script'],
  },

  renewal_negotiation_cs: {
    id: 'renewal_negotiation_cs',
    kind: 'strategy',
    title: 'Renewal Negotiation — Value First',
    authors: ['SaaS CS best practice'],
    category: 'renewal_negotiation',
    coreConcept:
      'Start renewal 120 days out with value summary — negotiate from proof, not discount reflex.',
    ironframeApplication:
      'RENEWAL_WINDOW signal at 120 days; valueQuantifier prepares cent-denominated value recap.',
    beachheadSectors: ALL,
    keyTactics: [
      '120-day renewal kickoff with health snapshot.',
      '90-day executive alignment on success plan completion.',
      '30-day procurement path — no surprise auto-renew without notice.',
    ],
    healthSignals: ['RENEWAL_WINDOW'],
    retentionPlays: ['Value recap deck', 'Success plan completion review'],
  },

  medshield_hipaa_cs: {
    id: 'medshield_hipaa_cs',
    kind: 'playbook',
    title: 'Medshield HIPAA Customer Success',
    authors: ['Ironframe CS'],
    category: 'onboarding_adoption',
    coreConcept:
      'HIPAA accounts weight evidence completeness and PHI masking discipline in health score.',
    ironframeApplication:
      'HEALTH_HIPAA beachhead modifier — −20 below 70% evidence; expansion to Irontally HIPAA controls pack.',
    beachheadSectors: ['HEALTH_HIPAA'],
    keyTactics: [
      'First action: PHI-safe evidence export demo.',
      'QBR: OCR enforcement context with ALE cents.',
      'Never cite HIPAA certification unless Shipped in docs hub.',
    ],
    expansionPlays: ['HIPAA control pack', 'BAA workflow module'],
  },

  vaultbank_bhc_cs: {
    id: 'vaultbank_bhc_cs',
    kind: 'playbook',
    title: 'Vaultbank BHC Customer Success',
    authors: ['Ironframe CS'],
    category: 'customer_intimacy',
    coreConcept:
      'Regional BHC success emphasizes FFIEC alignment, board packets, and config churn visibility.',
    ironframeApplication:
      'REGIONAL_BHC modifier weights LP-10 board prep signals; reference BHC peer outcomes only.',
    beachheadSectors: ['REGIONAL_BHC'],
    keyTactics: [
      'Board-report dry run by day 60.',
      'Config churn review in monthly check-in.',
      'ALE narrative for board risk committee.',
    ],
    expansionPlays: ['Enterprise seat pack', 'Additional business unit tenant'],
  },

  gridcore_nerc_cs: {
    id: 'gridcore_nerc_cs',
    kind: 'playbook',
    title: 'Gridcore NERC Customer Success',
    authors: ['Ironframe CS'],
    category: 'customer_intimacy',
    coreConcept:
      'Utility NERC accounts prioritize grid telemetry, sustainability reports, and NERC CIP evidence paths.',
    ironframeApplication:
      'UTILITY_NERC modifier weights Carbon Pulse and grid intensity samples for CSRD disclosures.',
    beachheadSectors: ['UTILITY_NERC'],
    keyTactics: [
      'NERC audit calendar mapped to success plan.',
      'Ironscribe sustainability achievement report in QBR.',
      'Config drift tied to critical cyber assets.',
    ],
    expansionPlays: ['NERC module expansion', 'Additional BA/substation scope'],
  },

  mssp_enclave_cs: {
    id: 'mssp_enclave_cs',
    kind: 'playbook',
    title: 'MSSP Enclave Customer Success',
    authors: ['Ironframe CS'],
    category: 'expansion_upsell',
    coreConcept:
      'MSSP success is multi-tenant evidence slot coverage — expand enclaves as health proves.',
    ironframeApplication:
      'MSSP_ENCLAVE expansionFinder suggests additional tenant enclave when parent health ≥ 80.',
    beachheadSectors: ['MSSP_ENCLAVE'],
    keyTactics: [
      'Per-enclave success plan with isolated Ironguard scope.',
      'Aggregate health rollup for MSSP program office.',
      'Expansion: new client enclave — not cross-client data blending.',
    ],
    expansionPlays: ['Additional enclave tenant', 'MSSP operator seat pack'],
  },

  predictable_revenue_cs: {
    id: 'predictable_revenue_cs',
    kind: 'book',
    title: 'Predictable Revenue — Customer Success Chapter',
    authors: ['Aaron Ross', 'Marylou Tyler'],
    publicationYear: 2011,
    category: 'cs_operations',
    coreConcept:
      'Separate new business from customer success — CSMs own retention and expansion, not prospecting.',
    ironframeApplication:
      'IronSuccessTeam handles post-CLOSED_WON only; SalesTeam owns PROSPECT — role boundary enforced.',
    beachheadSectors: ALL,
    keyTactics: [
      'CSM queue = CLOSED_WON accounts only.',
      'No CSM quota for new logos.',
      'Handoff document at close with success plan draft.',
    ],
    antiPatterns: ['CSM building prospect lists', 'AE owning onboarding'],
  },

  rocket_ship_growth: {
    id: 'rocket_ship_growth',
    kind: 'book',
    title: 'Rocket Ship Growth — Retention Chapter',
    authors: ['Dan Martell'],
    publicationYear: 2020,
    category: 'retention_churn',
    coreConcept:
      'SaaS growth levers include churn reduction and expansion — fix leaky bucket before pouring leads.',
    ironframeApplication:
      'Operator reviews health-critical accounts before increasing Ironleads harvest volume.',
    beachheadSectors: ALL,
    keyTactics: [
      'Monthly churn post-mortem on CLOSED_LOST.',
      'Activation metric = FIRST_ACTION within 45 days.',
      'Expansion ARR from healthy accounts only.',
    ],
    healthSignals: ['STALE_ENGAGEMENT', 'MISSED_PILOT_GATE'],
  },

  hooked_operator_habits: {
    id: 'hooked_operator_habits',
    kind: 'book',
    title: 'Hooked — Ethical Operator Habits',
    authors: ['Nir Eyal'],
    publicationYear: 2014,
    category: 'onboarding_adoption',
    coreConcept:
      'Habit loops: trigger, action, reward, investment — ethical use in professional workflows only.',
    ironframeApplication:
      'Command Center integrity refresh and board prep widgets as ethical habit triggers — no dark patterns.',
    beachheadSectors: ALL,
    keyTactics: [
      'Trigger: weekly integrity digest.',
      'Action: one-click evidence export.',
      'Reward: visible control coverage delta.',
      'Investment: custom dashboard layout saved per tenant.',
    ],
    antiPatterns: ['Consumer gamification', 'Fake notification badges'],
  },

  design_partner_path_b_onboarding: {
    id: 'design_partner_path_b_onboarding',
    kind: 'playbook',
    title: 'Design Partner Path B — First 90 Days',
    authors: ['Ironframe Customer Success'],
    publicationYear: 2026,
    category: 'onboarding_adoption',
    coreConcept:
      'Paying co-builders convert when order-form success criteria become the success plan, syncs stay capped, and convert-or-exit is explicit by day 90.',
    ironframeApplication:
      'After TenantBilling ACTIVE (Path B $' +
      DESIGN_PARTNER_PATH_B_USD +
      '): bind CS plan to the 2–3 Path B order-form criteria; hand partner /docs/user-manuals/design-partner-operator-packet + /docs/training/LEVEL1-PARTNER-INDEX and drive /get-started; weekly syncs only for first 4–6 weeks then async; queue HITL advisories — never auto-send; Approvals is send-queue only (not a training store); expansion deferred until criteria hit or day-90 review. Collaborate with Sales only at CLOSED_WON handoff; Support owns billing-hold/login breaks.',
    beachheadSectors: ALL,
    keyTactics: [
      'Day 0: confirm Path B payment ACTIVE + client-owned operator on /get-started.',
      'Hand Operator Packet + LEVEL1-PARTNER-INDEX — never claim Success Portal/Approvals stores manuals.',
      'Clone order-form success criteria into CRM success plan (exact-dollar outcomes where applicable).',
      'Cap eng syncs; protect Golden Path scope freeze outside criteria.',
      'By day 90: convert at planned GA list or clean exit — Path B fee non-refundable; no convert discount. Advocacy only after documented export/outcome.',
    ],
    healthSignals: ['MISSED_PILOT_GATE', 'STALE_ENGAGEMENT', 'LOW_EVIDENCE_COMPLETENESS'],
    retentionPlays: ['Success-plan reset against order-form criteria', 'Executive sponsor alignment on convert-or-exit'],
    expansionPlays: ['Module add-on only after criteria met and health ≥ 80'],
    antiPatterns: [
      'Treating Path B partners as free betas',
      'Open-ended weekly eng forever',
      'Using demo tenant names as customer references',
    ],
    complementaryCorpusIds: ['customer_success', 'land_adopt_expand', 'impossible_to_inevitable'],
  },
};

export const CUSTOMER_SUCCESS_CORPUS_MANIFEST = {
  manifestVersion: '1.0.0',
  corpusId: 'ironframe-customer-success-v1',
  title: 'IronSuccessTeam Knowledge Corpus',
  description:
    'Authoritative customer success books, frameworks, and beachhead playbooks for post-sale retention and expansion.',
  generatedAt: '2026-07-07T00:00:00.000Z',
  entryCount: Object.keys(CUSTOMER_SUCCESS_KNOWLEDGE_CORPUS).length,
  categories: [
    'retention_churn',
    'onboarding_adoption',
    'health_scoring',
    'expansion_upsell',
    'qbr_executive',
    'customer_intimacy',
    'outcome_based_success',
    'voice_of_customer',
    'renewal_negotiation',
    'cs_operations',
  ] as const,
};

export function listCorpusEntriesForSector(
  sector: string | null | undefined,
): CustomerSuccessKnowledgeEntry[] {
  const normalized = sector?.trim() || 'UNCLASSIFIED';
  return Object.values(CUSTOMER_SUCCESS_KNOWLEDGE_CORPUS).filter(
    (entry) =>
      entry.beachheadSectors === ALL ||
      (entry.beachheadSectors as readonly string[]).includes(normalized),
  );
}

export function resolveRetentionPlayIds(healthBand: 'healthy' | 'watch' | 'at_risk' | 'critical'): string[] {
  if (healthBand === 'healthy') return ['qbr_expansion_framework'];
  if (healthBand === 'watch') return ['customer_success', 'onboarding_playbook_90', 'design_partner_path_b_onboarding'];
  if (healthBand === 'at_risk') return ['retention_save_plays', 'effortless_experience'];
  return ['retention_save_plays', 'chief_customer_officer'];
}
