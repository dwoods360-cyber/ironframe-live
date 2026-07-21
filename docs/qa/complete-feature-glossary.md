# 📖 GRC Master Operations Manual & Technical Feature Glossary
## Standardized Sovereign Command Deck Training Playbook for Independent Learners
### Target Audience: High School Lab Technicians (Grade 11/12) & Independent Compliance Auditors
### System Architecture: Control-First Modular Agent Coordination Framework
### Operational Date: 2026-07-20
### Delta Source: `daily_code_diff.txt` (24-hour git window — Writer Narrative Architect mandate)

---

## 🕮 Chapter 1: Foundations of Enterprise GRC & Liability Mitigation

Welcome to the Ironframe Command Console. When multi-billion-dollar corporations operate global software networks, an untrained employee clicking the wrong button or entering unverified numbers can cause catastrophic real-world damage. A single mathematical error or security mistake can result in massive government fines, total network shutdowns, or devastating legal lawsuits.

This platform uses a structured architecture model called **Governance, Risk, and Compliance (GRC)** to prevent those disasters. Because you are training independently online without a live teacher, you must memorize the three core concepts of GRC and obey the safety limits written below to protect our system and client assets from harm:

```
              +----------------------------------------+
              |    GOVERNANCE (The Constitutional Law) |
              +-------------------+--------------------+
                                  |
                                  v
              +----------------------------------------+
              |    RISK MANAGEMENT (The Defense Deck)  |
              +-------------------+--------------------+
                                  |
                                  v
              +----------------------------------------+
              |    COMPLIANCE (The Bulletproof Proof)  |
              +-------------------+--------------------+
```

### 🏛️ 1. Governance (The Corporate Constitution)
* **Plain-English Definition:** Governance represents the unchangeable, absolute rules and system limits established by company executives or international law.
* **The App Reality:** In our platform, these rules are hardcoded into an electronic constitution known as the **TAS (Tenant Architecture Specifications)** file at `docs/TAS.md`. The software code is physically blocked from ever breaking these rules. Today's delta (2026-07-20) delivers **Ironleads SUSPECT location enrichment** — `ironleadsSuspectLocation.ts` resolves `websiteUrl`, postal `addressLine`, and optional `websiteContact` from contact `metadata` and deal `accountDomain`; `ironleadsIngressCore.ts` merges normalized HTTPS website URLs on every autonomous crawler upsert; Ops Hub CRM and Ironleads portal suspect rows expose `websiteUrl` and `addressLine`; per-contact forensic report at `/dashboard/operations/ironleads/suspects/[contactId]` via `buildIronleadsSuspectReport()` with blocker codes (`STAGE_SUSPECT`, `PLACEHOLDER_EMAIL`, `NO_PHONE`, `NOT_PROSPECT_POOL`, `MISSING_DOMAIN`, `OSINT_TITLE_NOISE`) and channel-readiness flags — **priorityScore is an integer ICP tier score, not USD cents**. **Tri-track HITL Approvals desk** — `approvalDraftKinds.ts` unifies SALES (amber), SUPPORT (emerald), and CUSTOMER_SUCCESS (violet) draft kinds on `/dashboard/admin/approvals` with `?kind=` filter chips; Ops Hub overview links to filtered queues via `snapshot.approvals.byKind`; DISPATCH remains human-only per Mandate 10. **Ops Calendar checklist expansion** — `seed-all-projects` action seeds summer editorial, video campaign, and ironframe rollout milestones from `allProjects2026SeedSpecs`; calendar cards carry P1–P3 priority ranks, clickable `href` deep links to briefing queue rows, inline `nextActions` checklists with `set-checklist-item`, and required outcome text when marking **Done** or **Cancelled**; deny/promote clears `briefing_queue_holds` on both paths. Prior-cycle (2026-07-19) **Governance Frame Publication Desk** — six quarantine-only desk agents (`gf-researcher`, `gf-editor`, `gf-verifier`, `gf-regulatory-reviewer`, `gf-product-boundary`, `gf-operator`) orchestrated by `runGovernanceFramePublicationDesk()` in `governanceFramePublicationDeskCore.ts`; **`POST /api/admin/operations-hub/briefings/desk-run`** with `mode: author|review` stages markdown into `docs/briefing-queue/` and writes advisory `.desk-reviews/{filename}.desk.json` sidecars — desk agents **never** call promote, deny, or syndicate; human Publisher/Founder alone approves via Ops Hub **Approve**. Ops Hub briefings desk shows **DeskReviewBadges** (`desk ready` / `desk revise` plus per-agent pass/warn/fail/advisory chips). **IronBoard perimeter fleet health** — `isPerimeterWorkforceHealthQuery()` routes red/HIGH workforce dots to `buildProductMatrixHealthSnapshot()` + `formatPerimeterWorkforceHealthAnswer()` (product-matrix health probes on ports **8082–8086**) — explicitly **not** U.S. labor-market statistics or CRM pipeline health; blocks labor-market web prefetch when operators paste Ops matrix rows. **`BOARD_OPERATOR_PROSE_MANDATE`** in `boardroomSystemPrompt.ts` forbids inventing product surfaces and mandates plain prose for docs/training location answers. Prior-cycle (2026-07-18) **Governance Frame Research Publication** at `https://research.ironframegrc.com` — canonical public origin replacing legacy `brief.ironframegrc.com`; `config/governanceFramePublic.ts` defines `governanceFrameBriefingPath()` as `/briefings/[slug]`; middleware on `research.ironframegrc.com` and `brief.ironframegrc.com` rewrites pretty paths into `/gf-research/*` and **308**-redirects legacy `/governance-frame/*` to `/briefings/*`; `deploymentQuarantine.ts` whitelists research publication hosts so the encyclopedia renders on cloud without full ingress opt-in. **`app/gf-research/*`** renders briefings, research papers (`GF-2026-001`), briefing series (`control-first-grc`), newsletters, methodology, editorial standards, sources-and-corrections, and about pages from `docs/governance-frame/` and `docs/published-briefings/` via `researchCatalog.ts` — only manuscripts with `status: PUBLISHED` render full text. **`lib/governanceFrame/publishedResearchKnowledge.ts`** federates published GF encyclopedia into IronBoard docs matrix for READ-only agent citation; dual-location matrix now marks WRITE vs READ access and forbids ingesting `docs/briefing-queue/` drafts. **IronBoard boardroom** adds client-side markdown rendering (`formatModelHtml`) with **HTML** and **PDF** export buttons for conversation transcripts. **Ops Hub Calendar** tab (`?tab=calendar`, bookmark alias `schedule`) tracks `OpsActivity` Postgres rows with T-3/T-2/T-1/T-0 idempotent reminder ledger; `/api/cron/ops-schedule-reminders` runs daily at **13:15 UTC** per `vercel.json`. **Promote hardening** removes queue filesystem drafts on successful approve, clears `briefing_queue_holds`, and hides already-promoted slugs from the Approve desk. **Marketing funnel expansion**: `/product-demo` guided seven-step workflow (`GuidedWorkflowDemoClient`), `/solutions/*`, `/trust-center`, `/tools/*`; homepage redesigned around workflow outcomes and spine-driven CTAs from `lib/ironframeProductKnowledge/commercial.ts` — Path B **499900** cents (**$4,999**), planned GA Command **3500000** cents/yr (**$35,000**/yr). **`BLOCK_DEMO_SANDBOX_WHEN_REGISTRATION_DISABLED=false`** restores client-only `/demo/*` sandbox when registration disabled — `/register/demo` remains available for mock-auth product demos without tenant provisioning. **Ironintel July 17 OSINT** refresh (`ironintel-osint-2026-07-17-live`): FCEB deadline-day SonicWall SMA1000 CVE-2026-15409/15410 and SharePoint CVE-2026-56164 machine-key theft; FortiSandbox triple-CVE (FCEB deadline July 19); Coca-Cola fairlife OT ransomware halting US production; CMMC Phase II C3PAO suspension day four; Manufacturing industry profile added; July 17 `riskMetricsCents`: median annual GRC program **4580000000**, audit remediation lag **1015000000**, SaaS consolidation savings **762000000**, board reporting overhead **143000000** cents. **CI** runs `npm run knowledge:check` and `npm run test:product-knowledge` before Postgres bootstrap. Prior-cycle product knowledge spine, briefing hold/resume/read gates, anti-hallucination mandates, marketing briefings archive, editorial section synonyms, and Google Docs GF-2026-001 utility remain locked from 2026-07-15 through 2026-07-17 governance cycles.

### ⚠️ 2. Risk Management (The Defense System)
* **Plain-English Definition:** Identifying potential technology failures or external hacks before they happen, and calculating exactly how much cash the company would lose (the **Asset Loss Expectancy** or **ALE**).
* **The App Reality:** Our system uses automated security monitors to calculate these risks instantly, displaying them as a **System Maturity Score** out of ten. The **Irontrust** math engine (Agent 3) stores all ALE baselines as **BigInt integer cents** — never floating-point dollars.

### 📜 3. Compliance (The Verifiable Proof)
* **Plain-English Definition:** Providing 100% accurate, un-tamperable data records to an independent government inspector to prove your business has never broken a law.
* **The App Reality:** Every mouse click, system test, and transaction you perform is logged into a locked, cryptographically signed ledger file that cannot be erased or edited by anyone. Shadow-plane diagnostics (`SimulationDiagnosticLog`) remain isolated from production `AuditLog` per TAS Section 4.3.

---

## 🛑 Chapter 2: Core Regulatory Guardrails & Forbidden Actions

To completely eliminate operational risk, protect multi-tenant cloud client assets, and shield your training program from liability, you must strictly adhere to the following **Four Corporate Compliance Mandates**. Any violation will automatically cause the security tracking systems to flag your active session context and quarantine your workspace:

* **Mandate 1: Strict Whole-Integer Financial Integrity:** All monetary paths must use a variable type called **`BigInt` (Big Integer)** representing raw cents exclusively. One United States dollar equals **100** cents. Decimals and floating-point values are completely forbidden in financial modules to eliminate computational rounding drift during audits. Constitutionally frozen ALE baselines per `docs/TAS.md`:
  * **Medshield:** **1110000000** cents (eleven million one hundred thousand United States dollars)
  * **Vaultbank NA:** **590000000** cents (five million nine hundred thousand United States dollars)
  * **Gridcore Infrastructure:** **470000000** cents (four million seven hundred thousand United States dollars)
  * **Defense (CMMC L3 anchor):** **1600000000** cents (sixteen million United States dollars)
  * **Display conversion only:** `const dollars = Number(aleBaselineCents) / 100` — never persist floats.
  * **Today's de-classification mandate:** IronBoard public briefing synthesis must never emit raw BigInt cent integers in Governance Frame copy. Internal storage remains BIGINT cents exclusively; external-facing text uses Ironframe-precomputed `financials.display.sovereignPool.*.baselineFormatted` and `currentExposureFormatted` strings. Grounded sales outreach (`generateGroundedPitch`) may cite **BigInt numeric precision** as a value proposition in engineer-to-engineer copy — that is marketing language, not a persistence path. Market prospect `aiFitnessScore` is an integer ICP tier score (region + compliance pressure + funding + compliance-hire signals) — not USD cents.
  * **In-tenant support telemetry display (2026-07-06, retained):** `InTenantSupportContextPanel` renders `profileScope.aleBaselineCents` as a stringified BigInt cent value in the diagnostics envelope — this is operator-facing forensic context inside authenticated tenant scope, not public Governance Frame copy. CRM ticket summaries via `formatInTenantSupportTelemetryForCrm` embed `ALE=${telemetry.profileScope.aleBaselineCents}` for engineering triage. `WorkspaceSettingsClient` displays current ALE using `formatCentsToAccountingUSD(BigInt(aleBaseline))` with explicit copy **stored as BigInt cents**; draft input accepts USD display strings but `updateWorkspaceAleBaselineSettingsAction` persists integer cents only.
  * **Design-partner commercial lock (2026-07-16):** Path B Command Tier on-ramp persists at **499900** cents (**$4,999**) — `DESIGN_PARTNER_PATH_B_CENTS` in `lib/ironframeProductKnowledge/commercial.ts` is the single code truth; `DESIGN_PARTNER_PATH_B_USD` and worker re-exports are display constants only; Stripe checkout and tenant `ale_baseline BIGINT` must receive integer cents from `amountTotalCents` metadata, never float. Planned GA Command annual list price is **3500000** cents (**$35,000**/yr) via `PLANNED_GA_COMMAND_CENTS` — always say **planned GA** in external copy until `IRONFRAME_COMMERCIAL_GA=1`. Planned GA Growth (Sustainability track) is **7500000** cents (**$75,000**/yr) via `PLANNED_GA_GROWTH_CENTS`. `scripts/check-no-float-decimal.mjs` now scopes Prisma schema scans to money-hint lines only — physical ESG Float fields (kWh, liters) are not false-positive failures. SalesTeam `outboundDraftsman.ts` formats prospect `valueCents` via `formatCentsDisplay` using `BigInt(valueCents)` division — Vaultbank sample prospect **590000000** cents displays as **$5900000.00** in email body. FORBIDDEN: citing medshield, vaultbank, or gridcore as customer logos; seat/month pricing; fabricated free-forever design-partner programs; stale Path B literals outside `lib/ironframeProductKnowledge/commercial.ts`.
  * **Ironbloom physical telemetry gate (2026-06-19, unchanged):** `recordSustainabilityImpact` no longer assigns synthetic kWh from severity tiers (`isHighSeverity` removed). Mitigated value cents derive exclusively from `parseThreatIngestionTelemetry(threat.ingestionDetails)` — unresolved physical payloads return `no_physical_telemetry` without persisting float or guessed kWh. `resolveDashboardMitigatedValueCents` removed `IRONBLOOM_PULSE_REFERENCE_KWH` forensic fallback — dashboard hero reads sealed tenant physical ledger via `aggregateTenantKwhAverted` and `findLatestThreatPhysicalTelemetry` before reporting **0** cents.
  * **Constitutional seed baselines unchanged:** Medshield **1110000000**, Vaultbank **590000000**, Gridcore **470000000**, Defense **1600000000** cents remain the Irontrust verification anchors in `financialIngressInvariant.test.ts` and `verifyCanonicalEnterpriseBaseline`.

* **Mandate 2: Controlled Structural Amendments:** You are strictly forbidden from modifying layout parameters, data ingestion targets, or background agent structures silently. Any alteration requires a formal **TAS Amendment Proposal** routed to the Product Owner. The **Dynamic Discovery Mandate** on IronBoard now permits only **registered canonical responses** in `orchestrator/routing.ts` (for example sales-lead domain boundary text). All other boardroom answers must cite tool receipts.

* **Mandate 3: Verifiable Sustainability Unit Ingress:** Environmental footprint data must be logged using raw, physical units exclusively (such as kWh electricity, Liters water, or Kilometers logistics transport). The platform automatically rejects any sustainability telemetry packets containing purely monetary approximations to protect audit validity. `Ironwatch` system health columns (`sustainability_live_api_degraded`, `sustainability_api_heartbeat_failures`) now use `IF NOT EXISTS` guards for shadow-database replay safety.

* **Mandate 4: Absolute Tenant Isolation Enforcement:** Cross-tenant memory bleed is a critical security failure. Row-Level Security (RLS) constraints strictly isolate customer boundaries. You are completely forbidden from attempting to extract database rows from a separate company profile while logged into another. The dashboard gate (`resolveDashboardAccess`) binds workspace UUIDs exclusively from cookie scope or the operator's own `user_role_assignments` row — never from guessed tenant IDs.

* **Mandate 5: Public Conversion Perimeter & Customer Service Documentation Grounding:** All unauthenticated landing traffic (sales slide-over gateway, `/sales-agent-portal`, `POST /api/agents/sales`) must route to the prospect pool tenant UUID via `process.env.IRONFRAME_PROSPECT_POOL_TENANT_UUID` or fallback **`tenant_prospect_pool_01`** — never into authenticated customer workspaces. The customer service agent (`POST /api/agents/customer-service`) must ground exclusively against `app_documents` rows where `readingLevel: "LEVEL_1"`. Ironguard tenant validation runs before any documentation pull; fail closed with HTTP **403** when perimeter validation drops. All automated GRC reasoning nodes, sales plays, and customer service workers run at **`temperature: 0.0`** with no emojis or creative flourishes in production copy.

* **Mandate 6: In-Tenant Support Forensic Attachment & Urgency Gates:** Authenticated support tickets dispatched through `POST /api/support/in-tenant-ticket` must capture tenant-scoped telemetry via `buildInTenantSupportTelemetry` when `attachTelemetry` is true. Urgency levels **`AUDIT_BLOCKER`** and **`DATA_INTEGRITY`** require diagnostic attachment — API returns HTTP **400** with **Diagnostic telemetry attachment is required for this urgency level** when `attachTelemetry` is false. Telemetry includes `aleBaselineCents` as stringified BigInt, billing export entitlement, Ironquery export scope readiness, 24-hour Ironguard violation count, and diagnostic abort count — never cross-tenant bleed. Shadow-plane self-test diagnostics remain in `SimulationDiagnosticLog` only per TAS Section 4.3; production support telemetry reads production tables exclusively.

* **Mandate 7: Workspace Profile Edit RBAC:** ALE baseline and primary company profile mutations require **`GRC_MANAGER`** or **`CISO`** role on the active tenant via `canEditWorkspaceProfile`. Read-only operators may view `/settings/workspace` but cannot invoke `updateWorkspaceAleBaselineSettingsAction` or `syncCompanyProfileSettingsAction`. All successful edits write production `AuditLog` rows with `isSimulation: false` through `logWorkspaceProfileAudit` — never `SimulationDiagnosticLog`.

* **Mandate 8: Design Partner Launch Message Lock & RACI:** A single paid co-builder program recruits **3–5** paying design partners via Command Tier Path B (**499900** cents per `DESIGN_PARTNER_PATH_B_CENTS`). Commercial truth lives in `lib/ironframeProductKnowledge/commercial.ts` — not duplicated in worker configs. Ironleads harvests SUSPECT triggers only; board-marketing-mgr owns category message; board-sales-lead and SalesTeam draft PROSPECT email/SMS to HITL Approvals only — never auto-send. Operator owns DISPATCH plus Path B provision with **client-owned operator email** (`validateClientOwnedOperatorEmail` rejects `@ironframegrc.com`). board-writer and board-trainer author docs-plane packets only — not cold send. CTA is a **10–15 minute workflow review** on evidence or board-report pain — never **Request Demo** as primary ask. PENDING tenants receive tenant-scoped Path B activation links only — never generic `/pricing`. Public contact form records sales lead or design-partner inquiry only — no workspace mint. FORBIDDEN: telling operators to paste templates into a SalesTeam :8084 **Message Constitution** portal — that UI does not exist; SalesTeam exposes `/health` and `/poll` only. Beachhead drafting authority: `docs/sales-enablement/message-constitution.md` federated via IronBoard docs matrix.

* **Mandate 9: GTM Briefing Queue Quarantine — Never Auto-Publish:** Autonomous weekday cron (`/api/cron/gtm-briefing-queue`), Ops Hub briefing request (`POST /api/admin/operations-hub/briefings/request`), and newsletter request (`POST /api/admin/operations-hub/newsletters/request`) stage markdown into `docs/briefing-queue/` exclusively. Nothing publishes to `https://research.ironframegrc.com/briefings/[slug]`, `PublishedBriefing`, Ironcast syndication, or RSS until an operator clicks **Approve** (promote) in Ops Hub. **Hold** (`POST /api/admin/operations-hub/briefings/hold`) parks a draft in `briefing_queue_holds` for later reading — neither approve nor deny, file remains in queue. **Deny** (`POST /api/admin/operations-hub/briefings/deny`) persists `briefing_queue_denials`, clears any hold via `clearBriefingQueueHold`, and best-effort unlinks the filesystem draft. Promote also clears hold metadata and best-effort removes queue filesystem draft. Already-promoted slugs are hidden from the active Approve desk even if queue files remain on disk. `publishState: QUARANTINED_AWAITING_OPERATOR` is written to `cronJobArtifact` payload on autonomous runs.

* **Mandate 10: Sales SMS HITL Dispatch Only:** SalesTeam poll cycle and `smsGateway.ts` queue drafts only — live SMS sends exclusively after GLOBAL_ADMIN **DISPATCH** on `/api/admin/approvals/[id]` when `isSalesSmsDraft` returns true. Contact phone must normalize to E.164 via `normalizeE164Phone`; email fallback is disabled for SMS drafts. Provider selection: `SMS_PROVIDER=textbelt` when `TEXTBELT_API_KEY` set, else Twilio with `TWILIO_SMS_FROM_NUMBER` or `SALESTEAM_SMS_FROM` (Twilio-owned E.164 — Google Voice cannot be From). Branded body appends **Ironframe GRC** prefix and **Reply STOP to opt out** when missing.

* **Mandate 11: Product Knowledge Spine Integrity — Single Commercial Truth:** All Path B, planned GA Command, planned GA Growth, beachhead sector keys, and product-fact blurbs must originate from `lib/ironframeProductKnowledge/` (`commercial.ts`, `beachheads.ts`, `productFacts.ts`, `boardBinding.ts`). `scripts/sync-product-knowledge.ts` (`npm run knowledge:check` / `knowledge:sync`) diffs `commercial.ts` SHA-256 fingerprint against `.fingerprint.json`, mirrors `docs/sales/` narratives into `docs/sales-enablement/` ACTIVE docs, and scans for stale Path B literals. Pre-commit `scripts/pre-commit-knowledge-check.mjs` hard-blocks when blast-radius paths are staged with drift — never auto-syncs staged files. CI runs `knowledge:check` and `test:product-knowledge` before Postgres bootstrap. Ops Hub **Sync product knowledge** apply is disabled on Vercel (`VERCEL=1`) — operators run `npm run knowledge:sync` locally, commit git diff, then manually restart/redeploy blast-radius targets listed in `syncManifest.ts`. Drift latch `.drift-notice.json` is gitignored and surfaces the floating Ops Hub amber banner.

* **Mandate 12: Governance Frame Research Publication — Quarantine vs Encyclopedia:** Autonomous GTM authorship and Ops Hub requests write **`docs/briefing-queue/`** exclusively — never to agent corpora, `/docs`, or public research routes until operator **Approve**. Published briefings render at **`https://research.ironframegrc.com/briefings/[slug]`** (internal preview prefix `/gf-research/briefings/[slug]`). Agents MAY **READ** published GF research (`publishedResearchKnowledge.ts`, `researchCatalog.ts`) for citation; agents MUST NEVER ingest briefing-queue drafts. **`board-trainer`** and **`board-writer`** remain forbidden from writing the EXTERNAL_GTM_INTELLIGENCE plane. Marketing archive cards at `/resources/briefings` link to `governanceFrameBriefingUrl(slug)` — not duplicate article bodies on the marketing apex. Legacy `brief.ironframegrc.com` and `/governance-frame/*` on research hosts redirect to canonical `/briefings/*` paths.

* **Mandate 13: Ops Schedule Reminder Idempotency:** `OpsActivity.remindersSent` JSON ledger records T-3, T-2, T-1, and T-0 milestone timestamps idempotently — cron must not double-fire webhook or email reminders for the same activity and milestone. Schedule mutations require GLOBAL_ADMIN Ops Hub perimeter gate. Multi-project seed is operator-triggered only via `POST /api/admin/operations-hub/schedule` with `{ action: "seed-all-projects" }` (or legacy `{ action: "seed-summer-2026" }`) — never auto-seeds on deploy. Marking activities **Done** or **Cancelled** requires operator outcome text stored in `ops_activities.outcome`.

* **Mandate 14: GF Publication Desk — Quarantine-Only, Never Auto-Promote:** The Governance Frame publication desk (GF-OPS-001) may **author** (`mode: author`, min **40** char `requestPrompt`) or **review** (`mode: review`, existing `filename`) quarantined manuscripts only. Desk roster in `lib/governanceFrame/publicationDesk/agents.ts`: **gf-researcher** (may stage queue + desk review), **gf-editor** (structure/tone), **gf-verifier** (citation map — automated pass cannot open URLs), **gf-regulatory-reviewer** (law vs guidance precision), **gf-product-boundary** (blocks sales language and unsupported certifications), **gf-operator** (advisory ready-for-human status). Sidecars live at `docs/briefing-queue/.desk-reviews/{base}.desk.json` with `schemaVersion: 1`, `findings[]`, and `readyForHumanOperator` computed by `computeReadyForHumanOperator()`. **`readyForHumanOperator: true` is advisory only** — automated validation ≠ editorial approval (GF-STANDARDS-001 §18). Desk run intentionally does **not** import `promoteBriefingDraftCore`, deny, or syndicate modules. Operator **Run desk review** on existing drafts and **Author via GF desk** on briefings tab post to `POST /api/admin/operations-hub/briefings/desk-run` with `tenantSlug: ironframe-sandbox` frontmatter binding. Human **Approve** / **Hold** / **Deny** remain the only publication gates.

* **Mandate 15: Ironleads SUSPECT Location Integrity & Prospect-Pool Gate:** SUSPECT contacts store website and postal enrichment on `contact.metadata` only — never as float financial fields. `websiteUrlFromDomainOrUrl()` normalizes bare domains to `https://` URLs; `resolveSuspectLocationFields()` prefers explicit metadata over deal `accountDomain`. Ironleads ingress must merge website metadata on deduped upserts via `mergeWebsiteIntoMetadata()`. SUSPECT forensic reports (`ironleadsSuspectReportCore.ts`) require `prospect-pool` tenant slug before SalesTeam handoff — `@ironleads.local` placeholder emails, missing phone, OSINT article-title company names, and non-SUSPECT stages surface as explicit blockers with remediation steps. Operators review reports at `/dashboard/operations/ironleads/suspects/[contactId]` — not generic CRM edit forms. FORBIDDEN: treating `priorityScore` as USD cents; auto-promoting SUSPECT to PROSPECT without clearing blockers and human SalesTeam poll cycle.

---

## 🎨 Chapter 3: True Screen Grid Coordinates & Panel Layout Proportions

The platform interface scales fluidly in sync with your window size using a fixed fractional grid. It divides your display monitor into **three permanent vertical panel columns**, each operating with independent vertical scrolling:

* **The Left Panel (Data Deck) [22% Screen Width]:** Houses active system security metric graphs, system maturity nodes, target asset profiles, and framework selection matrices.
* **The Center Panel (Workspace Canvas) [48% Screen Width]:** Contains the primary navigation path tabs, the horizontal GRC metric rows, and the large workflow control blocks.
* **The Right Panel (Audit Column) [30% Screen Width]:** Houses the **Sustainability Pulse** panel widget and the long, vertically extending **Live Audit Ledger Stream** terminal layout box.

### Layout Refactor Notes (2026-07-20 Delta)

Today's delta delivers **Ironleads SUSPECT location enrichment**, **tri-track HITL Approvals desk**, and **Ops Calendar checklist expansion** without altering the constitutional 22/48/30 tripane geometry on authenticated cockpit routes:

* **Suspect location core:** `app/lib/server/ironleadsSuspectLocation.ts` — `websiteUrlFromDomainOrUrl()`, `resolveSuspectAddress()`, `formatSuspectAddressLine()`, `resolveSuspectWebsiteContact()`, `resolveSuspectLocationFields()`; metadata keys `websiteUrl`, `address.{street,city,state,zip,country}`, `websiteContact.{phone,email,contactPageUrl,note}`.
* **Suspect report core:** `app/lib/server/ironleadsSuspectReportCore.ts` — `buildIronleadsSuspectReport(contactId)` returns `whyInSuspectQueue`, `whyNotProspectQueue`, `blockers[]`, `channelReadiness`, `nextActions[]`; `looksLikeOsintTitleNoise()` flags agency-page titles ingested as company names.
* **Suspect report page:** `/dashboard/operations/ironleads/suspects/[contactId]` — server-rendered forensic report with real-email / phone / reachable / suspect flags; links back to Ironleads portal and Ops Hub CRM tab; requires `canUsePerimeterWorkforceFromSession()`.
* **Ingress merge:** `ironleadsIngressCore.ts` — `mergeWebsiteIntoMetadata()` on create and deduped update paths; account domain normalized via `normalizeAccountDomain()`.
* **Ops Hub CRM enrichment:** `operationsHubCore.ts` and `operationsTeamPortalsCore.ts` — suspect rows include `websiteUrl` and `addressLine` from `resolveSuspectLocationFields()` with primary SUSPECT deal `accountDomain`.
* **Tri-track approvals:** `app/lib/approvalDraftKinds.ts` — `APPROVAL_DRAFT_KINDS`, `APPROVAL_KIND_META`, `parseApprovalKindFilter()`, `approvalsHref()`; `AdminApprovalDashboardClient.tsx` wraps inner desk in `Suspense`, filters queue by `?kind=SALES|SUPPORT|CUSTOMER_SUCCESS|ALL`, sorts SALES → SUPPORT → CS, shows per-kind dispatch banner and hue-coded cards.
* **Ops Hub overview links:** `OperationsHubClient.tsx` — **Sales outreach**, **Support replies**, **CS advisories** quick links with `snapshot.approvals.byKind` counts; **All approvals** aggregate link retained.
* **Calendar checklist:** `opsScheduleCore.ts` — `allProjects2026SeedSpecs`, priority rank on cards, `set-checklist-item` and `set-status` with required outcome prompt on DONE/CANCELLED; `seed-all-projects` replaces summer-only seed; calendar search filters title, synopsis, notes, outcome, nextActions, P-rank, kind, status, owner, sourceRef, href, due date.
* **Deny/promote hold clear:** `denyBriefingQueueDraftCore.ts` and `promoteBriefingDraftCore.ts` — both call `clearBriefingQueueHold()`; promote returns `removedFromQueue` boolean from best-effort filesystem unlink.
* **Unit tests:** `tests/unit/ironleadsSuspectLocation.test.ts`, `tests/unit/ironleadsSuspectReportCore.test.ts` — domain normalization, blocker matrix, OSINT title noise heuristics.

### Layout Refactor Notes (2026-07-19 Delta)

Prior-cycle delta delivered the **Governance Frame Publication Desk**, **IronBoard product-matrix perimeter health routing**, and **desk-review sidecar badges** on the Ops Hub briefings desk without altering the constitutional 22/48/30 tripane geometry on authenticated cockpit routes:

* **GF publication desk core:** `app/lib/server/governanceFramePublicationDeskCore.ts` — `runGovernanceFramePublicationDesk()` with `DeskRunMode: author|review`; gf-researcher drafts via Gemini Flash at `temperature: 0` with institutional editorial hard rules; stages via `stageBriefingQueueDraftCore`; runs verifier/editor/regulatory/product-boundary/operator heuristic passes from `lib/governanceFrame/publicationDesk/heuristics.ts`; writes `DeskReviewChecklist` via `writeDeskReview()`.
* **Desk-run API:** `POST /api/admin/operations-hub/briefings/desk-run` — `requirePerimeterWorkforceOperator`; `maxDuration: 120`; resolves tenant from `tenantSlug` for frontmatter `tenantId`/`tenantSlug`; returns `{ ok, filename, staged, review, readyForHumanOperator, humanPublisherRequired, pipelineLog }`; HTTP **201** on author success, **200** on review success.
* **Desk review I/O:** `lib/governanceFrame/publicationDesk/deskReviewIo.ts` — `DESK_REVIEW_DIRNAME = ".desk-reviews"`; `deskReviewFilenameForDraft()` maps `{date}-draft-*.md` → `{base}.desk.json`; `readDeskReview()` returns null on parse failure.
* **Ops Hub desk UI:** `OperationsHubClient.tsx` — **GF publication desk** panel with title + research brief textarea; **Run desk review** per queue row; **DeskReviewBadges** component renders `desk ready`/`desk revise` and `gf-{agent}:{status}` chips with finding summary tooltips; `?draft=` URL deep-link scrolls to focused queue row and pre-selects promote slug.
* **Snapshot enrichment:** `operationsHubCore.ts` — `BriefingQueueDraftSummary.deskReview` populated via `readDeskReview()` for each queue file.
* **Product matrix health answer:** `Ironboard/src/services/productMatrixHealth.ts` — `formatPerimeterWorkforceHealthAnswer()` explains red dots as unreachable health probes (not labor stats); HIGH priority labels are static ops priority, not severity of outage.
* **Boardroom query routing:** `boardroomQueryIntent.ts` — `isPerimeterWorkforceHealthQuery()` returns false for explicit labor-market macro queries; blocks `shouldPrefetchWeb`, `shouldPrefetchProspects`, and `requiresCrmDiscovery` when perimeter health intent detected; `boardSynthesizer.ts` and `Ironboard/src/index.ts` `/api/query` short-circuit to health snapshot before dynamic discovery.
* **Operator prose mandate:** `boardroomSystemPrompt.ts` — `BOARD_OPERATOR_PROSE_MANDATE` injected into hardened governance layers — ground claims in product spine, tool receipts, or live telemetry; no invented UI.
* **Design partner briefing spine bind:** `designPartnerLaunchBriefing.ts` imports `DESIGN_PARTNER_PATH_B_CENTS`, `DESIGN_PARTNER_COHORT_SEATS`, `WORKFLOW_REVIEW_CTA_MINUTES`, `BEACHHEAD_SECTORS` from `lib/ironframeProductKnowledge/` — no hardcoded Path B literals in static context.
* **Multi-line citation parser:** `parseBriefingCitations.ts` — parses `* **[N] label**` bullet blocks with indented URLs and notes for SOX/SEC research citations.
* **Marketing proof captures:** `public/marketing/proof/` — Playwright screenshot artifacts for `/marketing`, `/product-demo`, `/trust-center` (product UI captures, not customer case studies).
* **E2E contact CTA:** `tests/e2e/ingestionPipeline.spec.ts` — contact button matches `/workflow review/i`; success copy matches `/inquiry is recorded in the executive lead ledger/i`.

### Layout Refactor Notes (2026-07-18 Delta)

Today's delta delivers the **Governance Frame Research Publication site**, **Ops Hub Calendar**, **IronBoard transcript export**, **marketing funnel expansion**, and **promote-desk hardening** without altering the constitutional 22/48/30 tripane geometry on authenticated cockpit routes:

* **Research publication origin:** Default `GOVERNANCE_FRAME_PUBLIC_ORIGIN=https://research.ironframegrc.com`; override via `GOVERNANCE_FRAME_PUBLIC_FEED_ORIGIN`; extra hosts via comma-separated `GOVERNANCE_FRAME_PUBLIC_HOSTS`. Legacy `GOVERNANCE_FRAME_LEGACY_BRIEF_ORIGIN=https://brief.ironframegrc.com` retained for redirect continuity.
* **Host routing:** `middleware.ts` `governanceFrameResearchHostResponse()` — research/brief hosts rewrite `/` → `/gf-research`, `/briefings/[slug]` → `/gf-research/briefings/[slug]`, `/research-papers/[slug]` → internal tree; legacy `/governance-frame/*` **308**-redirects to `/briefings/*`; `/_next`, `/api`, `/rss.xml`, `/robots.txt`, `/sitemap.xml` pass through unchanged.
* **Internal preview:** Local and apex hosts use `/gf-research/*` prefix via `GOVERNANCE_FRAME_RESEARCH_INTERNAL_PREFIX`; `researchLinks.ts` `researchBasePath()` returns empty string on public hosts, `/gf-research` elsewhere.
* **Research catalog:** `researchCatalog.ts` — `listResearchPapers()`, `listResearchSeries()`, `listEditorialPolicyDocs()`, `getResearchPaperManuscript()`; PUBLISHED/PUBLIC status gate for full manuscript render; PLACEHOLDER docs excluded.
* **Research site chrome:** `ResearchSiteChrome.tsx`, `ResearchBasePath.tsx`, `BriefingMarkdown.tsx` — shared navigation across gf-research pages; series index at `/gf-research/series/control-first-grc`.
* **Agent READ federation:** `buildPublishedGovernanceFrameFederationBlock()` injected into IronBoard `buildDocsFederationMatrix()` — published briefings index + GF research catalog for citation; NEVER reads `briefing-queue/`.
* **Dual-location matrix:** `dualLocationOutputMatrix.ts` — primary target `https://research.ironframegrc.com/briefings/[slug]`; WRITE authors listed separately from READ access (all board personas + perimeter workers may cite published encyclopedia).
* **Ops Calendar tab:** `/dashboard/operations?tab=calendar` (alias `?tab=schedule`); Kanban columns PLANNED / IN_PROGRESS / IN_REVIEW; `OpsActivity` Prisma model with `OpsActivityKind` and `OpsActivityStatus` enums; seed summer 2026 editorial milestones via schedule API; reminder cron `/api/cron/ops-schedule-reminders` at **13:15 UTC** daily.
* **Briefing desk hardening:** Promoted slugs filtered from active desk even if queue file remains; promote clears hold and best-effort unlinks queue draft; validation hint on missing `IRONFRAME_BRIEFING_DATA_TEST_ACK=1`.
* **IronBoard boardroom UX:** Streaming and historical model turns render markdown HTML (`msg-body`); `#export-html-btn` downloads transcript; `#export-pdf-btn` opens print dialog for Save as PDF.
* **Marketing homepage redesign:** Seven-step `WORKFLOW_STEPS` grid; outcomes section cites integer-cent exposure language; primary CTA **Request a {N} min workflow review** from spine; secondary **Open guided demonstration** → `/product-demo`; solutions grid from `SOLUTION_PAGES`; published briefing teaser via `BriefingsArchive variant="teaser"`.
* **Public funnel paths:** `/solutions`, `/product-demo`, `/trust-center`, `/tools`, `/gf-research` added to `grcRouteMatch.ts`, `publicFunnelShell.ts`, and narrow cloud ingress; `/governance-frame` moved from authenticated-only to public route class (research publication).
* **Demo sandbox reopening:** `BLOCK_DEMO_SANDBOX_WHEN_REGISTRATION_DISABLED=false` — `/demo/*` and `/register/demo` available when public registration disabled; self-serve `/register/setup` remains blocked.
* **Reserved subdomains:** `brief` and `research` added to `RESERVED_SUBDOMAINS` in `tenantSubdomain.ts` — never interpreted as tenant workspace slugs.
* **RSS and Ironcast:** `compile-rss.ts` and `governanceFrameEmail.ts` emit canonical `governanceFrameBriefingUrl(slug)` links on research origin.
* **next.config.ts output tracing:** `/gf-research/**` routes declare `docs/governance-frame/**/*` and `docs/published-briefings/**/*` file dependencies for Vercel fs reads.

### Layout Refactor Notes (2026-07-17 Delta)

Today's delta adds **marketing briefings archive**, **Governance Frame slug continuity**, **editorial section synonyms**, and **Ops Worker anti-hallucination mandates** without altering the constitutional 22/48/30 tripane geometry on authenticated cockpit routes:

* **Resources briefings archive:** `/resources/briefings` — `BriefingsArchive` component with `variant="archive"`; `listPublishedBriefingCards()` from published filesystem ledger only; cards link to `governanceFrameBriefingUrl(slug)` (`https://research.ironframegrc.com/briefings/[slug]`) — no duplicate marketing body copy; `FORBIDDEN_CARD_CTA` strips Path B / sales phrases from one-liners.
* **Homepage teaser:** `MarketingHomepage` receives `publishedBriefingCards={listPublishedBriefingCards(4)}` — teaser variant with **View full briefings archive →** link to `/resources/briefings`.
* **PublicApexNav:** **Resources** nav link to `/resources/briefings`; `PublicApexNav` mounted on archive page.
* **Slug redirects:** `app/governance-frame/[slug]/page.tsx` and IronBoard `router.ts` issue **301** permanent redirects when `PUBLISHED_BRIEFING_SLUG_REDIRECTS` maps legacy slug (e.g. `2026-07-15-auto-briefing-tenant-sovereignty` → `2026-05-14-connector-count-sovereign-enclaves`); `briefingLoader.ts` and `briefingFilesystemLedger.ts` resolve slugs before lookup.
* **Section synonym parser:** `parseBriefingSections.ts` and IronBoard `renderBlog.ts` classify II as Calculated Quantitative Impact | Quantitative Context | Quantitative Impact | Economic Context; III as Machine-Rule Technical Translation | What Modern GRC Must Enforce | Architectural Implications | Control-System Requirements — public research prose no longer forced into compiler-doc phrasing.
* **Briefing hold resume:** Ops Hub **Resume** / **Resume from hold** buttons call `POST /api/admin/operations-hub/briefings/resume`; held drafts split into `heldBriefingQueueDrafts` vs `activeBriefingQueueDrafts` memo partitions; modal and promote confirm paths expose resume when draft is on hold.
* **Ops Worker Chat spine:** `opsWorkerChatCore.ts` injects `buildAntiHallucinationMandate()` plus per-target mandates (`buildIronleadsMandate`, `buildSalesTeamLaunchMandate`, `buildSuccessTeamMandate`, `buildSupportTeamMandate`); location answers forbid markdown chapter scaffolding and false tripane claims for `/docs`.
* **IronBoard canonical routing:** `isDocsHubLocationQuery`, `isTrainingDocsLocationQuery`, `resolveCanonicalBoardResponse` — deterministic prose for docs hub and partner training location questions; `docsLocationCanonicalRouting.test.ts` validates no `#` markdown headers and no **22%** tripane bleed.
* **SuccessTeam onboarding advisories:** `advisoryGatekeeper.ts` links partner learning to `PARTNER_OPERATOR_PACKET_HREF`, `PARTNER_TRAINING_INDEX_HREF`, `PARTNER_GET_STARTED_HREF` from product spine — never claims Success Portal stores training manuals.
* **Google Docs utility:** `scripts/governance-frame/google-docs/` — OAuth desktop sync for GF-2026-001 research paper; `.state/` and OAuth JSON gitignored; `.env.example` adds `GOOGLE_OAUTH_CLIENT_FILE` and `GOOGLE_OAUTH_TOKEN_FILE`.
* **Public funnel:** `grcRouteMatch.ts` and `publicFunnelShell.ts` allow `/resources` and `/resources/*` on narrow cloud ingress alongside `/marketing`, `/pricing`, `/docs`.
* **App docs navigation:** `appDocsNavigation.ts` — `root-hub` section for README; reading level badges on nav labels; `DocsChrome` / `DocsSidebar` consume sorted section order.

### Layout Refactor Notes (2026-07-16 Delta)

Today's delta adds the **product knowledge spine**, **briefing hold/draft reader**, and **unified workforce voice** without altering the constitutional 22/48/30 tripane geometry:

* **Product knowledge desk:** Ops Hub overview tab mounts **Product knowledge** section with **Check drift** (`GET /api/admin/operations-hub/product-knowledge`) and **Sync product knowledge** (`POST` with `{ apply: true }`); one-shot auto-check on overview tab load via `knowledgeAutoChecked` ref; blast-radius list shows restart/redeploy targets after spine or mirror change.
* **Knowledge drift banner:** Fixed amber `role="alert"` bar at viewport top when `showKnowledgeFloat` — **Sync now**, **Recheck**, **Dismiss**; content area receives `pt-24 sm:pt-20` offset when banner visible.
* **Briefing hold gate:** Per-row and modal **Hold** / **Hold for later** buttons call `POST /api/admin/operations-hub/briefings/hold`; `onHold` badge on quarantined draft rows; held drafts disable duplicate hold; promote/deny clear hold via `clearBriefingQueueHold`.
* **Quarantined draft reader:** **Read** button opens fixed modal (`z-[60]`) with full markdown `pre`, validation ok/needs review badge, and inline Approve/Hold/Deny actions; `GET /api/admin/operations-hub/briefings/draft?filename=` via `readBriefingQueueDraftCore`.
* **Ops Worker Chat voice module:** `app/lib/operations/opsWorkerSpeech.ts` — shares `ironboard_voice_speed` / `ironboard_voice_pitch` localStorage keys with IronBoard; `OPS_UNIFIED_VOICE_ROLE = CEO` for all workers; Jenny/Aria voice prefs identical to boardroom TTS; `prepareOpsWorkerSpeechText` strips markdown identically to IronBoard.
* **IronBoard voice unification:** `Ironboard/src/index.ts` `pickVoice` no longer switches to David/Mark for CFO/CTO/Technical roles — shared executive voice pack with Ops Hub.
* **Beachhead spine:** `SalesTeam/src/config/beachheadPrompts.ts` imports `BEACHHEAD_SECTORS` and `resolveBeachheadSector` from `lib/ironframeProductKnowledge/beachheads.ts`; sector keys `REGIONAL_BHC`, `UTILITY_NERC`, `MSSP_ENCLAVE`, `HEALTH_HIPAA`.
* **Docs matrix ingress:** `docsQueryIntent.ts` routes **message constitution** and **beachhead drafting** queries to `sales-enablement` category.
* **Orientation audio regeneration:** `orientationAudioScriptGenerator.ts` adds `partnerPacketMarkdown` corpus; retimed sections through **3:55** close; export path spoken as `/exports` not Dashboard Exports; synthesized MP3 binaries refreshed under `public/training-audio/`.
* **App docs seed exclusions:** `scripts/seed-app-documents.ts` excludes operator-only audio script paths from partner-facing `app_documents` plane.

### Layout Refactor Notes (2026-07-15 Delta)

Today's delta expands the **Operations Hub command plane** and **Get Started design-partner orientation** without altering the constitutional 22/48/30 tripane geometry on authenticated cockpit routes:

* **Operations Hub tabs:** `/dashboard/operations?tab=overview|workforce|crm|briefings|newsletters|teams` — `OperationsHubClient.tsx` mounts `OpsWorkerChatPanel` on all loaded tabs; briefing and newsletter desks split queue drafts via `isStrictNewsletterQueueDraft` and `isNewslettersDeskDraft` filters.
* **Briefings desk:** Quarantined governance drafts (excludes strict Ironcast newsletter filenames) show per-row **Approve** and **Deny** buttons; autonomous weekday runs land as `*-draft-auto-briefing-*` filenames; manual request prompt posts to `/api/admin/operations-hub/briefings/request` with `tenantSlug: ironframe-sandbox`.
* **Newsletters desk:** Ironcast and `*-draft-market-grc-*` drafts show Approve/Deny; request prompt posts to `/api/admin/operations-hub/newsletters/request`; syndicate remains separate via `/api/admin/operations-hub/newsletters/syndicate`.
* **Ops Worker Chat panel:** Single conversation target selector among IronBoard, Ironleads, SalesTeam, IronSuccessTeam, IronSupportTeam; PTT records via `MediaRecorder`, transcribes through `POST /api/admin/operations-hub/worker-voice/transcribe`, speaks replies via `speakOpsWorkerReply` with mute/rate/pitch controls; history capped at **8** turns per worker thread.
* **IronBoard ops portal embed:** `resolveBoardroomEmbedUrl` prefers public HTTPS Cloud Run upstream for iframe Query SSE; `ironboardConsoleBaseHref` injects `<base href>` and `window.__IRONBOARD_API_ROOT__` for relative API resolution inside ops-portal proxy; trailing-slash proxy paths avoided to prevent 308 baseURI races.
* **IronBoard console PTT:** Native boardroom dashboard at port **8082** adds `#ptt-row` with microphone selector and Gemini STT push-to-talk — click to record, click again to transcribe and submit Query; no wake-word listening.
* **Get Started quickstart step:** `GET_STARTED_QUICKSTART_GUIDE_HREF` now points to `/docs/user-manuals/design-partner-operator-packet` instead of quickstart; partner training index at `/docs/training/LEVEL1-PARTNER-INDEX` replaces full `LEVEL1-STUDENT-INDEX` in checklist copy.
* **Orientation audio cues:** `GET_STARTED_ORIENTATION_CUES` timestamps retimed (55s checklist → 235s next steps); labels renamed to **Workspace orientation**, **Partner training track**, **Exports console**; screenshot alts reference Design Partner Operator Packet.
* **Pilot surface banner:** `PilotSurfaceBanner.tsx` copy aligns pilot vs preview semantics with `docs/user-manuals/pilot-vs-preview.md`.
* **Public pricing page:** `/pricing` reflects Path B co-builder positioning and planned GA language — no free-forever pilot CTA.
* **Sales contact form:** `SalesContactClient.tsx` states form records **sales lead / design-partner inquiry only** — workspace minted later via sales-assisted Path B activation.

### Layout Refactor Notes (2026-07-06 Delta — Retained Baseline)

Today's delta introduces the **in-tenant support drawer plane** and **workspace settings surface** without altering the constitutional 22/48/30 tripane geometry:

* **TopNav Support trigger:** `InTenantSupportTopNavTrigger` renders a **Support** button (min-height **2.75rem** / 44px touch target) to the left of `TrainerAgentTopNavTrigger` when the operator is authenticated, not a guest, and not on auth public paths. Clicking toggles `InTenantSupportDrawer` via `useInTenantSupportDrawerStore`.
* **Global support drawer:** `InTenantSupportDrawer` portals to `document.body` with fixed right panel width `min(100vw, 420px)`, slide-in animation, Escape key dismiss, and backdrop click close. Top offset adapts for demo sandbox, simulation mode, and Get Started orientation reader states using `LAYOUT_AGENT_INSPECT_DRAWER_TOP_CLASS` constants.
* **Contextual CTAs:** `RequestEngineeringHelpTrigger` opens the drawer with optional preset urgency (`ROUTINE`, `AUDIT_BLOCKER`, `DATA_INTEGRITY`) and surface string (for example `export-scope` on Ironquery export failures).
* **Support route simplification:** `/dashboard/support` no longer hosts inline chat — it renders `InTenantSupportModal` with instructional copy directing operators to use TopNav **Support** from any cockpit route.
* **Workspace settings route:** `/settings/workspace` — standalone scroll page inside dashboard chrome; linked from `TopNavUserProfileMenu` under **Workspace settings** with Settings icon.
* **AppShell mount order:** `InTenantSupportDrawer` mounts alongside `AgentInspectShell`, `TrainerAgentDrawer`, and `VendorHeaderToolbarBridge` on both tripane and standalone scroll layouts.
* **Get Started welcome audio guard:** `welcomePhaseDone` defaults to **`false`** (was `true`) — step audio autoplay waits until welcome phase completes; additional guard skips step audio when `welcomeAudioSrc` exists and `hasPlayedGetStartedWelcome()` returns false.

### Layout Refactor Notes (2026-06-19 Delta — Retained Baseline)

Today's delta consolidates role-based dashboards under `app/(dashboard)/dashboard/*` — the legacy `app/roles/*` tree is deleted. Configuration moves from `/config` to `/settings/config`. Tenant topology and logs placeholder pages (`app/*/topology`, `app/*/logs`) are removed. Public `/docs` renders from PostgreSQL `app_documents` via `CompilationIngressPortal` when slug resolution fails — filesystem-only `generateStaticParams` removed; `/docs/hub` redirects to `/docs/README`; `/docs/user-guide` redirects to `/docs/user-manuals/user-guide`. Trust Center procurement pages mount at `/trust/*` inside the dashboard route group. **Registration surface deletion:** `app/(marketing)/register/setup/page.tsx` removed entirely; `/register/demo` server-redirects to `/register/contact?reason=sales_assisted_only`. **Training screenshot corpus:** twenty-four PNG assets land under `public/docs/training/assets/` (Level 1 chapters 01–12, Level 2 chapters 01–12 including `level-2-11-bigint-financial-integrity.png`) for Trainer corpus publisher embedding. **WCAG touch targets:** `app/globals.css` adds `ironframe-interactive` rules — coarse pointer devices enforce **2.75rem** (44px) minimum height on buttons and rounded anchors per dark cockpit aesthetic mandate.

**Narrow public ingress funnel (2026-07-18):** Cloud hosts without `IRONFRAME_ALLOW_PUBLIC_INGRESS=1` permit only the narrow public funnel — not a full-host **403** on every path. Allowed cloud paths include `/`, `/terms`, `/privacy`, `/pricing`, `/marketing`, `/resources`, `/resources/briefings`, `/solutions`, `/product-demo`, `/trust-center`, `/tools`, `/register/*`, `/sales-agent-portal`, `/governance-frame`, `/gf-research`, auth surfaces, `/account/billing-hold`, `/docs`, and `/api/auth/callback`. **`research.ironframegrc.com`** and **`brief.ironframegrc.com`** bypass production quarantine entirely via `isGovernanceFramePublicHost()` — they serve the GF research publication, not tenant workspaces. Private workspace surfaces (`/integrity`, `/dashboard/*`, `/cockpit`) remain **403** blocked until full ingress opt-in. Dual Stripe webhooks bypass quarantine: `/api/webhooks/stripe` and `/api/billing/webhook`. Token-gated API paths bypass quarantine — route handlers enforce Bearer secrets. **Staging apex:** `IRONFRAME_STAGING_APEX_DOMAIN` in `tenantSubdomain.ts` resolves tenant slug from staging Vercel host patterns.

| Surface | Route examples | Chrome mounted | Scroll behavior |
|---------|----------------|----------------|-----------------|
| Public marketing landing | `/` (guest), `/marketing`, `/resources/briefings`, `/product-demo`, `/solutions/*` | `MarketingHomepage` / `BriefingsArchive` / `GuidedWorkflowDemoClient` — `PublicApexNav` | Full-page vertical scroll |
| Public legal and pricing | `/terms`, `/privacy`, `/pricing`, `/register/contact` | Theme tokens only | Full-page scroll |
| Public trust and tools | `/trust-center`, `/tools/*` | Trust procurement chrome / `ControlToolPage` | Full-page scroll |
| Sales agent portal | `/sales-agent-portal` | `MarketingSalesPortalTrigger` + `SalesAgentSlideOver` | Full-page scroll |
| App docs reader | `/docs`, `/docs/[slug]` | `DocsChrome` — DB-backed `AppDocument` | Full-page scroll |
| Governance Frame research publication | `research.ironframegrc.com/briefings/[slug]`, `/gf-research/*` (preview), legacy `/governance-frame/*` (redirect) | `ResearchSiteChrome` / `GovernanceFrameLayout` | Full-page scroll; public hosts indexed |
| Auth public paths | `/login`, `/forgot-password`, `/reset-password`, `/unauthorized`, `/legal/accept` | Themed forms | Full-page scroll |
| Dashboard command center | `/`, `/integrity` (authenticated), `/dashboard/*` | `DashboardCommandCenterLayout` → `AppShell` → `TopNav` | Tripane columns scroll independently |
| Trust Center (authenticated) | `/trust`, `/trust/dpa`, `/trust/subprocessors`, `/trust/data-residency` | Dashboard chrome — `TrustProcurementDocument` | Standalone scroll |
| Tenant subdomain workspace | `http://{slug}.lvh.me:3000/integrity` | Host-bound tenant switcher lock | Tripane or standalone |
| Platform admin onboarding | `/admin/onboarding` | `AdminOnboardingDeployments` panel | Standalone scroll within gate |
| Standalone dashboard pages | `/evidence`, `/board-report`, `/reports/audit-trail` | TopNav chrome | `standaloneScroll` on AppShell |
| Workspace settings | `/settings/workspace` | TopNav profile menu → Workspace settings | Standalone scroll; ALE + company profile forms |
| In-tenant support drawer | TopNav **Support** button (all authenticated cockpit routes) | `InTenantSupportDrawer` portal | Overlay drawer; does not alter tripane geometry |
| Support console (legacy route) | `/dashboard/support` | Instructional shell + embedded `InTenantSupportModal` | Standalone scroll |
| Operations Hub | `/dashboard/operations`, `?tab=overview|calendar|briefings|newsletters|workforce|crm|teams` | `OperationsHubClient` + `OpsWorkerChatPanel` | Standalone scroll; GLOBAL_ADMIN perimeter workforce gate |
| Perimeter worker portals | `/dashboard/operations/ironboard`, `ironleads`, `salesteam`, `success-team`, `support-intake` | Portal clients with `fetchOpsPortalJson` redaction | Standalone scroll within operations chrome |

**Layout separation mandate (2026-06-18):** Root `app/layout.tsx` mounts `IronframeThemeProvider` only — it does **not** mount `AppShell` or TopNav. Authenticated workspace chrome is confined to `app/(dashboard)/layout.tsx`, which calls `ensureDashboardTenantSession`, resolves billing entitlement, wraps children in `DashboardCommandCenterLayout` → `DashboardGroupShell` → `DashboardBillingGate`. Public `/login`, `/pricing`, `/register/contact`, `/docs`, and `/governance-frame` never inherit command-center chrome. `AppShellRouter` and `ConditionalAppShell` route chrome by pathname class. Tenant subdomain hosts receive host-bound scope via `applySubdomainTenancy` on every middleware response.

The `DashboardGroupShell` component writes `data-dashboard-left-rail`, `data-dashboard-right-rail`, and `data-dashboard-rail-floor-lock` attributes so CSS enforces the constitutional 22/48/30 geometry on tripane routes only. When `initialTenantUuid` arrives from the server RBAC gate and no client cookie exists, the shell writes `ironframe-tenant` (180-day max-age, SameSite=Lax) and dispatches `ironframe-tenant-changed`.

## ⚙️ Chapter 4: Component-by-Component GRC Feature Dictionary

Every visible component on your monitor screen is mapped below using industry-standard GRC nomenclature. Use this glossary to cross-reference elements during your self-paced online laboratories. Each entry cites the agent boundary implicated by today's code delta.

---

<a id="ingress-001"></a>

### 🚧 Feature 0: Production Deployment Quarantine Perimeter (Narrow Public Funnel)
* **GRC Function ID:** `INGRESS-001`
* **Exact Screen Coordinates:** No visible UI on blocked responses — browser displays monospace **IRONFRAME SYSTEM ARCHITECTURE** 403 page with message **LOCAL DEVELOPMENT ONLY · Public ingress is disabled.** Public funnel routes (`/terms`, `/docs`, `/marketing`, etc.) render normally on cloud hosts without full ingress opt-in.
* **Operational Purpose:** Blocks **private workspace** HTTP ingress to Ironframe on cloud-hosted domains (Vercel preview, production apex, tenant subdomains) during closed Phase 1 development while preserving a **narrow public funnel** for legal, marketing, registration, documentation, Governance Frame, and sales-agent surfaces. Forces operators to bind dev servers to **127.0.0.1** and use **localhost**, **127.0.0.1**, or **\*.lvh.me** tenant workspaces locally. Stripe signed webhooks and token-gated cron/API paths remain reachable so commerce provisioning and headless automation can run while the command center stays dark on cloud hosts.
* **Technical Mechanics:** Implemented in `app/lib/security/deploymentQuarantine.ts` and `app/utils/grcRouteMatch.ts`, invoked as **middleware step 1** before Supabase session refresh. Middleware executes ordered phases:
  1. **Production quarantine perimeter** — `shouldBlockProductionIngress` (local dev hosts always continue)
  2. **Prospect ingress gate** — `shouldBlockProspectIngress` redirects self-serve registration to `/register/contact` when `IRONFRAME_PUBLIC_REGISTRATION_ENABLED` is false
  3. **Supabase session + platform gates** — `updateSession`, tenant isolation, stale lockdown
  4. **Auth entrance codes** — Rule A0 (`assertGlobalAdminForOnboarding` for `/admin/onboarding` GLOBAL_ADMIN), Rule A (unauthenticated `/integrity` → `/login`), Rule B (authenticated `/login` → tenant Command Post or Integrity Hub via `resolvePostAuthLandingPath`), public marketing/legal/pricing/demo passthrough for guests
  5. **Subdomain tenancy finish** — `applySubdomainTenancy` stamps host-bound tenant headers and cookies on every response

`shouldBlockProductionIngress` returns true when:
  1. Hostname is **not** a local development host (`localhost`, `127.0.0.1`, `[::1]`, `*.localhost`, `*.lvh.me`, `*.localtest.me`)
  2. Pathname is **not** a Stripe webhook (`/api/webhooks/stripe` or `/api/billing/webhook` per `STRIPE_WEBHOOK_PATHS` in `config/stripe.ts`)
  3. Pathname is **not** token-gated API ingress (`isTokenGatedApiIngressPath`: `/api/internal/cron/*`, `/api/cron/narrate`, `/api/board/feed`, `/api/internal/ironquery/export`)
  4. Pathname is **not** a narrow public funnel path (`isPublicCloudIngressPath`: `/`, `/terms`, `/privacy`, `/pricing`, `/marketing`, `/resources`, `/resources/*`, `/sales-agent-portal`, `/register/*`, auth surfaces, `/legal/accept`, `/account/billing-hold`, `/docs`, `/governance-frame`, `/api/auth/callback`)
  5. `IRONFRAME_ALLOW_PUBLIC_INGRESS` is not set to `1`, `true`, or `yes`

`isPrivateWorkspaceIngressPath` classifies `/integrity`, `/dashboard/*`, `/cockpit`, and other command-center surfaces as blocked on cloud hosts until full ingress opt-in. Local development whitelist includes **vaultbank.lvh.me** and **acmecorp.lvh.me** style tenant subdomains — wildcard `*.lvh.me` resolves to **127.0.0.1** without OS hosts file edits. IronBoard engine binds `127.0.0.1` only (not `0.0.0.0`) — startup log reads `http://127.0.0.1:8082/`.
* **Agent Boundary:** **Ironguard** (Agent 12) perimeter enforcement; **Ironlock** (Agent 6) coordinates with constitutional freeze when combined with stale lockdown.
* **Step-by-Step Lab Validation:**
  1. Deploy to `ironframegrc.com` or a Vercel preview host without `IRONFRAME_ALLOW_PUBLIC_INGRESS=1`.
  2. Navigate to `/terms`, `/privacy`, `/marketing`, `/docs`, `/pricing`, `/sales-agent-portal`, and `/governance-frame` — verify HTTP **200** (narrow funnel allowed).
  3. Navigate to `/integrity`, `/dashboard/cfo`, and authenticated tripane `/` — verify HTTP **403** monospace quarantine page.
  4. POST to `/api/webhooks/stripe` and `/api/billing/webhook` on the same cloud host — verify requests are **not** quarantined.
  5. POST to `/api/internal/cron/industry-scout` with valid `IRONFRAME_CRON_SECRET` Bearer — verify route handler executes (middleware passthrough).
  6. On `http://127.0.0.1:3000` and `http://vaultbank.lvh.me:3000`, confirm all dashboard routes remain accessible.
  7. Set `IRONFRAME_ALLOW_PUBLIC_INGRESS=1` in environment — confirm cloud preview allows full workspace ingress for stakeholder demos.
  8. Run `tests/unit/deploymentQuarantine.test.ts` — verify narrow funnel paths, localhost whitelist, dual Stripe webhook bypass, token-gated API bypass, and private workspace block semantics.

---

<a id="auth-001"></a>

### 🔐 Feature 0b: Zero-Trust Dashboard RBAC Gate
* **GRC Function ID:** `AUTH-001`
* **Exact Screen Coordinates:** Invisible server gate — manifests as redirect to `/login` or `/unauthorized` before any dashboard chrome paints.
* **Operational Purpose:** Ensures authenticated Supabase users without a matching `user_role_assignments` row cannot mount workspace shells, preventing privilege escalation into tenant telemetry grids.
* **Technical Mechanics:** `app/(dashboard)/layout.tsx` calls `ensureDashboardTenantSession(await resolveDashboardAccess())`:
  * `unauthenticated` → `redirect("/login")`
  * `pending` (no valid assignment) → `redirect("/unauthorized")`
  * `allowed` → passes `tenantUuid` into `DashboardGroupShell`
* **Constitutional authority bypass:** Dev constitutional authority users may fall back to Medshield UUID `5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01` when no assignment exists — logged as `tenantFallbackApplied: true`.
* **Agent Boundary:** **Ironguard** (Agent 12) token and context validation.
* **Step-by-Step Lab Validation:**
  1. Sign in with a Supabase user that has **no** `user_role_assignments` row.
  2. Attempt `/integrity` — verify redirect to `/unauthorized` and `AccessPending` surface.
  3. Assign a role row for Medshield tenant — reload — verify dashboard chrome mounts with tenant cookie written.
  4. Trigger digest `1041080224` class server error — verify `app/(dashboard)/error.tsx` renders `AccessPending` instead of blank error page.

---

<a id="auth-002"></a>

### 🔑 Feature 0c: Public Homepage vs Command Center Split
* **GRC Function ID:** `AUTH-002`
* **Exact Screen Coordinates:** Root URL `/` — marketing hero for guests; tripane Command Center for authenticated operators with RBAC clearance.
* **Operational Purpose:** Exposes a **Seed-to-Series-A** marketing narrative to prospects while preserving the full 19-agent workforce grid for credentialed operators on the same route.
* **Technical Mechanics:** `app/page.tsx` resolves `resolveDashboardAccess()`:
  * Guest → `MarketingHomepage` with regulatory brief cards (DORA, EU AI Act, NIS2) and **CONSOLE INGRESS ──►** link to `/login`
  * Allowed → `DashboardHomeClient` inside `DashboardGroupShell` with `carbonMitigatedValueCents` passed as **BigInt** from `resolveDashboardMitigatedValueCents`
* **Agent Boundary:** **Ironcore** orchestration; **Ironbloom** (Agent 17) supplies mitigated value cents; **Irontrust** (Agent 3) validates financial display via `formatCentsToUSD`.
* **Step-by-Step Lab Validation:**
  1. Open `/` in a private browser window — verify marketing hero title **Ironframe: The Immutable Standard for AI-Driven GRC**.
  2. Click **CONSOLE INGRESS** — verify navigation to `/login`.
  3. Sign in with RBAC-cleared operator — verify tripane Command Center replaces marketing layout on `/`.
  4. Inspect network payload for mitigated value — confirm raw cents integer, not float.

---

<a id="theme-001"></a>

### 🎨 Feature 0d: Ironframe UI Theme Palette Selector
* **GRC Function ID:** `THEME-001`
* **Exact Screen Coordinates:** TopNav master header — operator profile dropdown (`TopNavUserProfileMenu`) → **Appearance** section.
* **Operational Purpose:** Allows operators to select a visual palette without altering tenant data context — UI-only scope per TAS.
* **Technical Mechanics:** Three registered themes in `app/lib/ironframeTheme.ts`:
  1. **Standard System** — follows OS light/dark via `next-themes` value `system`
  2. **Executive Light** — high-contrast paper palette (`data-ironframe-palette="executive-light"`)
  3. **Cyber Command Dark** — midnight command deck (`data-ironframe-palette="cyber-command-dark"`)
  Persistence key: `ironframe-ui-theme`. Body attributes: `data-ironframe-theme` and `data-ironframe-palette` synced by `IronframeThemeBodySync`.
* **Agent Boundary:** None — pure presentation layer; does not touch LangGraph state or financial stores.
* **Step-by-Step Lab Validation:**
  1. Open profile menu in TopNav — verify email and role label render.
  2. Select **Executive Light** — verify `document.body` gains `data-ironframe-theme="executive-light"`.
  3. Navigate to `/login` — verify login page respects `--bg-primary` and `--login-border` CSS variables.
  4. Select **Cyber Command Dark** — verify TopNav classes `ironframe-topnav-master` and `ironframe-topnav-subnav` pick up dark palette tokens.
  5. Reload browser — verify theme persists from `localStorage` via `next-themes`.

---

<a id="auth-003"></a>

### 📧 Feature 0e: Corporate B2B Tenant Invite Provisioning
* **GRC Function ID:** `AUTH-003`
* **Exact Screen Coordinates:** Admin server action — no default UI chip; invoked from platform administrator tooling.
* **Operational Purpose:** Provisions corporate users into Medshield, Vaultbank, Gridcore, or Defense tenants via Supabase Admin invite API with tenant-scoped metadata.
* **Technical Mechanics:** `app/actions/admin/inviteCorporateTenantUser.ts` delegates to `inviteCorporateTenantUserCore` in `corporateTenantProvisionCore.ts` after `requirePlatformAdministrator()`:
  * Requires GLOBAL_ADMIN role, constitutional authority, or remote-access toggle per `platformAdminAccess.ts`
  * Uses `SUPABASE_SERVICE_ROLE_KEY` (server-only — documented in `.env.example`)
  * Redirect URL built from `resolveTenantAuthRedirectOrigin` and `buildAuthCallbackUrl` — may target tenant subdomain after invite
  * Supports role selection: GRC_MANAGER or CISO on invite form
  * Writes `auditLogCreateLoose` receipt on success
* **Agent Boundary:** **Ironguard** (Agent 12) identity; **Ironwatch** (Agent 13) audit trail.
* **Step-by-Step Lab Validation:**
  1. As GLOBAL_ADMIN, submit invite form with email and `tenantSlug=medshield`.
  2. Verify Supabase invite email contains callback to `NEXT_PUBLIC_APP_URL`.
  3. Confirm `user_role_assignments` row created for target tenant UUID.
  4. Attempt invite as non-admin — verify error **GLOBAL_ADMIN role required**.

---

<a id="tenant-001"></a>

### 🔄 Feature 1: Multi-Tenant Context Switcher
* **GRC Function ID:** `TENANT-001`
* **Exact Screen Coordinates:** Pinned to the far left edge of the global sub-header toolline (TopNav subnav row), sitting directly above the Left Panel.
* **Operational Purpose:** Swaps your complete display dashboard between separate corporate profiles. On apex hosts, **GLOBAL_ADMIN** operators see every provisioned tenant plus the aggregate Global Command Center lane. Non-admin operators see only tenants bound to their `user_role_assignments` rows. On tenant subdomain hosts (e.g. `vaultbank.lvh.me:3000` or `vaultbank.ironframegrc.com`), the switcher locks to the host-bound workspace — cross-tenant switching is forbidden to prevent subdomain scope bleed.
* **Technical Mechanics:** `app/lib/auth/commandCenterTenantAccess.ts` exports `resolveCommandCenterTenantScope()` — RBAC-scoped tenant listing replaces the prior unscoped `prisma.tenant.findMany`. `TenantSwitcher` consumes `listCommandCenterTenantScope()` server action. `DashboardGroupShell` seeds `ironframe-tenant` cookie from server-resolved `initialTenantUuid` when client cookie is missing, then calls `setIronguardEffectiveTenant`. `applySubdomainTenancy` in middleware stamps `x-ironframe-host-tenant-slug` and `x-ironframe-host-tenant-uuid` headers and rewrites conflicting path-prefix tenant slugs. Dynamic tenant slugs resolve via internal gate `/api/internal/tenant-slug-resolve` when not in seed `TENANT_UUIDS` map.
* **Financial Baselines on Switch (BigInt cents only):**
  * Medshield → **1110000000**
  * Vaultbank → **590000000**
  * Gridcore → **470000000**
  * Defense → **1600000000**
  * Dynamically provisioned tenants → `tenants.ale_baseline BIGINT` set at provision time (Stripe checkout passes `amountTotalCents` as BigInt)
* **Step-by-Step Lab Validation:**
  1. Sign in as GRC_MANAGER assigned to Vaultbank only — verify switcher lists Vaultbank row exclusively.
  2. Sign in as GLOBAL_ADMIN on apex host — verify all seed tenants plus any provisioned corporate tenants appear; Global lane permitted.
  3. Open `http://vaultbank.lvh.me:3000/integrity` — verify switcher shows Vaultbank only and `canAccessGlobal` is false.
  4. Click tenant dropdown — observe ECG progress sweep until financial cells paint.
  5. Open browser cookies — verify `ironframe-tenant` matches host-bound UUID on subdomain routes.

---

<a id="ux-005"></a>

### 📊 Feature 2: Operational Maturity Tracker
* **GRC Function ID:** `UX-005`
* **Exact Screen Coordinates:** Positioned inside the upper section of the **Center Panel (48% Screen Width)**, sitting right next to the active operational tabs.
* **Operational Purpose:** Provides an absolute, real-time numeric grade of the selected corporate entity's cybersecurity health and regulatory posture.
* **Technical Mechanics:** Calculated dynamically by the `Irontrust` math engine (Agent 3) based on passed vulnerability scans, unpatched dependencies, and active compliance metrics. `/api/grc/tas-integrity` now returns `systemMaturityScore` from `readGovernanceMaturityState` inside a consolidated `buildIntegrityPayload` helper that survives partial subsystem failures.
* **Step-by-Step Lab Validation:**
  1. Look at the **Operational Maturity Tracker** block located at the crown of your center console canvas.
  2. Read the white numeric fraction value outputting the current grade (e.g., **`4.5 / 10`**).
  3. **Verify the Trend Metric:** Locate and verify the small green trend indicator text tracking your Month-Over-Month performance curve (**`+1.2 MoM`**).
  4. Change corporate profile using the tenant switcher — observe the 8-second EKG sweep until new tenant scores paint.
  5. Call `GET /api/grc/tas-integrity` — verify JSON includes `systemMaturityScore`, `chaosSimulationActive`, and `sha256Short` without 500 error when Prisma slice read fails (degraded mode).

---

<a id="sim-001"></a>

### 🕹️ Feature 3: Chaos Engineering Simulation Injector
* **GRC Function ID:** `SIM-001`
* **Exact Screen Coordinates:** Positioned directly within the middle section of the **Left Panel (22% Screen Width)**.
* **Operational Purpose:** Injects simulated infrastructure disasters and security threats to validate background agent detection, boundary isolation, and self-healing response playbooks without risking production infrastructure.
* **Technical Mechanics:** Simulates distinct cyber-threat profiles by triggering temporary network or state disruptions, forcing monitoring agents like `Ironlock` (Agent 6) or `Ironwatch` (Agent 13) to execute automated containment and quarantine playbooks. Shadow-plane rows land in **`SimThreatEvent`** with `mitigated_value_cents BIGINT` — never production `ThreatEvent` for self-test noise.

> ⚠️ **CRITICAL CYBERSECURITY TAXONOMY NOTE FOR AUDITORS:**
> **Cloud Exfiltration** and **Ransomware** are two entirely distinct cybersecurity threats that require completely different mitigation strategies.
> - **Ransomware** is a malicious payload that encrypts local or network files to break resource *availability* in exchange for an extortion payment.
> - **Cloud Exfiltration** is the unauthorized, often silent transfer of sensitive datasets outside of an organization's cloud perimeter, targeting a breach of data *confidentiality*.

* **Step-by-Step Lab Validation:**
  1. Enable simulation mode (`ironframe-simulation-mode=1` cookie) — verify self-test bar renders per TAS 4.3.
  2. Locate the Chaos Engineering Simulation Injector block inside the middle tier of the **Left Panel (22% screen width)**.
  3. Click the simulation scenario selector dropdown menu, which reads **`SELECT IRONTECH CHAOS DRILL...`**.
  4. **Select the Ransomware Drill Scenario:** Scroll down and click **`6 — IRONTECH CHAOS L6 · CRYPTOGRAPHIC RANSOMWARE (EXTORTION)`**.
  5. Click **`GENERATE CHAOS THREAT`**.
  6. Observe the Right Panel audit logs — verify `Irongate` signature interception through `Irontrust` zero-variance math verification without BigInt drift on mitigated cents columns.

---

<a id="sim-002"></a>

### 🕹️ Feature 3b: Chaos Engineering Simulation — Ransomware Protocol Addendum
* **GRC Function ID:** `SIM-002`
* **Exact Screen Coordinates:** Triggered via the **Chaos Drill Selector Dropdown** inside the middle tier of the **Left Panel (22% Screen Width)**.
* **Operational Purpose:** Simulates a localized cryptographic extortion attack to explicitly validate the multi-agent detection, mitigation, and recovery speed of the 19-agent workforce without introducing technical risk or financial calculation errors to the environment.
* **Technical Mechanics:** Mimics a high-volume encryption hazard. The system proves operational resilience by forcing a hardware state freeze, isolating the tenant perimeter, and testing the `Irontrust` whole-integer asset verification engine. `tenants.is_under_targeted_siege` and `quarantine_ledger.primary_target_tenant_uuid` columns support forensic targeting per migration `20260516120000_tenant_siege_quarantine_target`.
* **Step-by-Step Lab Validation:**
  1. Access the dropdown titled **`SELECT IRONTECH CHAOS DRILL...`** in the Left Panel.
  2. Select **`6 — IRONTECH CHAOS L6 · CRYPTOGRAPHIC RANSOMWARE (EXTORTION)`**.
  3. Click **`GENERATE CHAOS THREAT`**.
  4. **Verify System Feedback Lifecycle:**
     - Confirm emerald EKG line sweeps for the full 8-second processing block.
     - Verify Center Panel status **`ALL MODULES SECURE · STATE FROZEN`**.
     - Review Live Audit Ledger Feed — confirm six tracking steps print without execution failures.
     - Query `SimThreatEvent.mitigated_value_cents` — confirm BIGINT type, never float.

---

<a id="sync-001"></a>

### ⚡ Feature 4: Core Architecture Alignment Synchronizer
* **GRC Function ID:** `SYNC-001`
* **Exact Screen Coordinates:** Pinned inside the top horizontal container of the **Center Panel (48% Screen Width)**, reading **`ALL MODULES SECURE · ZERO DRIFT ENFORCED`**.
* **Operational Purpose:** Gives compliance inspectors instantaneous visual validation that zero unauthorized file mutations have occurred across the codebase.
* **Technical Mechanics:** Continuously computed by the `Ironwatch` shadow tracking agent (Agent 13), which validates real-time system file snapshots against a cryptographically secured master repository hash. `system_health_log` table records service heartbeat rows with `service_key` indexing per migration `20260515220000_ironwatch_system_health`.
* **Step-by-Step Lab Validation:**
  1. Locate the horizontal synchronizer bar resting above your center workspace.
  2. Confirm that the status indicator circle is glowing bright teal, giving visual proof that all 19 micro-agents are checking in securely without system drift.
  3. Inspect `system_health_log` for recent `service_key` entries after sustainability API heartbeat.

---

<a id="grc-002"></a>

### 🕵️ Feature 5: Automated Compliance Workforce Grid Array
* **GRC Function ID:** `GRC-002`
* **Exact Screen Coordinates:** Stretched across the middle tier of your **Center Panel (48% Screen Width)**, sitting directly beneath the horizontal metric rows.
* **Operational Purpose:** Provides a centralized management dashboard to monitor, audit, and trace the live operational states of your 19 specialized background automation agents.
* **Technical Mechanics:** Displays check-in times and statuses of specialized micro-workers. Today's delta explicitly documents the **platform application boundary** in `lib/platformApplicationBoundary.ts`:
  * **Ironframe** (default port 3000) — security, risk, and technical compliance engine hosting the 19-agent GRC production workforce (Ironcore, Irongate, Irontally, Ironlogic, etc.)
  * **IronBoard** (default port **8082**) — executive boardroom conversation plane with CRM discovery tools; zero cross-contamination with Ironframe port **3000** per `ZERO_CROSS_CONTAMINATION_DIRECTIVE`
* **Step-by-Step Lab Validation:**
  1. Scan the automated workforce table grid rows to verify all agents output green **`ACTIVE`** status lights.
  2. Left-click directly on any specific agent row (such as **`Ironlock`** or **`Ironguard`**).
  3. Verify that the **GRC Meta Specification Drawer** slides open from the right side, displaying that agent's core unchangeable technical directives.
  4. Run `tests/unit/platformApplicationBoundary.test.ts` — confirm port constants match environment documentation.

---

<a id="log-001"></a>

### 📋 Feature 6: Immutable Audit Ledger Feed
* **GRC Function ID:** `LOG-001`
* **Exact Screen Coordinates:** Placed inside the **Right Panel (30% Screen Width)** column track, extending directly beneath the base of the Sustainability Pulse widget down to the bottom monitor frame. Standalone mode available on `/reports/audit-trail` via `AuditIntelligence layout="standalone"`.
* **Operational Purpose:** Serves as a transparent, cryptographically signed, and append-only execution log tracking every system call, user access check, and automated policy remediation for external compliance inspectors.
* **Technical Mechanics:** Implements a strict append-only format within the data tier. `quarantine_ledger` now includes `forensic_justification TEXT` and `primary_target_tenant_uuid UUID` with idempotent migration guards for shadow DB replay order.
* **Step-by-Step Lab Validation:**
  1. Scroll the right-hand logging panel independently through historical entries.
  2. Verify every logged event contains an absolute timestamp and a distinct cryptographic validation string (e.g., `[AGENT-14] SANITIZATION PURGE RESOLVED`).
  3. Navigate to `/reports/audit-trail` — verify standalone layout scrolls within AppShell main track without tripane overflow clipping.

---

<a id="carbon-001"></a>

### 🔋 Feature 7: Sustainability Pulse Widget
* **GRC Function ID:** `CARBON-001`
* **Exact Screen Coordinates:** Positioned inside the upper half section of the **Right Panel (30% Screen Width)** column track, marked by a green leaf icon.
* **Operational Purpose:** Tracks real-time emissions intensity and hardware consumption data to fulfill global climate reporting requirements (such as Europe's **CSRD** or US **SEC Climate Disclosures**).
* **Technical Mechanics:** Powered by the `Ironbloom` agent (Agent 17), which mandates physical hardware metrics (kWh electricity, Liters water, Kilometers logistics transport) and completely rejects flat monetary data. Today's delta hardens the physical ingress path in `lib/sustainability/ironbloomDashboardTelemetry.ts`:
  * `parseThreatIngestionTelemetry` — extracts kWh or alternate physical units from `ThreatEvent.ingestionDetails` JSON
  * `buildCarbonTraceFromStream` — computes `carbonGramsCo2e` and routes `mitigatedValueCents` as **BigInt** through `computeSustainabilityAleForTenantUuid` (kWh path) or `mitigatedValueCentsFromCarbonTrace` (non-kWh path)
  * `recordSustainabilityImpact` — returns `{ reason: "no_physical_telemetry" }` when ingestionDetails lacks sealed physical payload (severity-based 2500/500 kWh fallback **removed**)
  * `productionCarbonLedger.ts` — priority chain: (1) aggregate production ledger cents, (2) `aggregateTenantKwhAverted` physical aggregate, (3) `findLatestThreatPhysicalTelemetry` stream trace, (4) **0** cents with forensic intensity flag — **no** reference kWh env fallback
  * `sustainabilityAnalyticsActions.ts` — `physicalKwhLabel` replaces `referenceKwhLabel`; displays `"No sealed physical kWh yet — ingest utility telemetry on resolved threats"` when aggregate is zero
  * `tenantPhysicalTelemetry.ts` — tenant-scoped kWh aggregation for dashboard and analytics plane
  * `kwhAverted` persisted as **BigInt** on `SustainabilityMetric` upsert — never JavaScript float
* **Step-by-Step Lab Validation:**
  1. Read the active footprint calculation line (e.g., **`382 gCO₂eq/kWh`**) and confirm the orange **`FALLBACK ACTIVE`** badge when Electricity Maps API offline.
  2. Resolve a threat with kWh in `ingestionDetails` — verify `mitigated_value_cents` BIGINT row and dashboard hero updates.
  3. Resolve a threat without physical telemetry — verify `no_physical_telemetry` reason and hero remains **0** cents (not synthetic reference kWh).
  4. Swap tenant context from Vaultbank (**590000000** cent baseline) to Gridcore (**470000000** cent baseline) — verify graph cache flush.
  5. Run `lib/sustainability/ironbloomDashboardTelemetry.test.ts` — kWh parse and cent output pass.

---

<a id="export-001"></a>

### 💰 Feature 8: Whole-Integer Financial Integrity Ledger Matrix
* **GRC Function ID:** `EXPORT-001`
* **Exact Screen Coordinates:** Placed inside the upper section of the **Center Panel (48% Screen Width)**, positioned side-by-side as three distinct horizontal card components directly beneath your primary workspace tabs.
* **Operational Purpose:** Displays critical financial metrics and houses tabular data extraction tools required to lock in corporate insurance premium discounts.
* **Technical Mechanics:** Integrates with the `Irontrust` math engine (Agent 3), pulling whole numbers stored as raw cents from the data tier. Migration `20260515180000_ale_mitigated_value_bigint` adds `mitigated_value_cents BIGINT` to `ThreatEvent` (production) and `SimThreatEvent` (shadow), backfilling from `SustainabilityMetric` and legacy JSON without precision loss.
* **Step-by-Step Lab Validation:**
  1. Verify uniform alignment and identical border heights across the three metric containers.
  2. Click **`Export Tabular Ledger Data (CSV)`**.
  3. Open the downloaded CSV — confirm all financial numbers display as raw whole integers with **zero decimal places** (e.g., **500000** cents for five thousand dollars display).
  4. Run Irontrust unit tests — confirm Medshield **1110000000**, Vaultbank **590000000**, Gridcore **470000000** cent baselines match snapshots.

---

<a id="board-001"></a>

### 🏛️ Feature 9: IronBoard Executive Boardroom Plane
* **GRC Function ID:** `BOARD-001`
* **Exact Screen Coordinates:** Accessed via IronBoard dashboard at `http://127.0.0.1:8082/` (center pane board chat) and `POST /api/query` API ingress on port **8082**.
* **Operational Purpose:** Provides C-suite persona routing (CEO, CFO, CISO, Sales Lead) with mandatory dynamic discovery before synthesis — no invented CRM metrics. Every boardroom turn now requires live Ironframe telemetry hydration before Gemini synthesis begins.
* **Technical Mechanics:** Conversation plane header `x-ironframe-conversation-plane: ironboard-boardroom` gates boardroom-specific orchestration on IronBoard port **8082**. `POST /api/query` execution order (2026-06-19):
  1. **Core telemetry bridge prefetch** — `fetchIronframeSharedContext({ incomingRequest, tenantId })` performs server-to-server `GET {IRONFRAME_CORE_ORIGIN}/api/board/shared-context` with forwarded `ironframe-tenant` cookie or injected tenant UUID/slug headers (`x-ironboard-telemetry-bridge: 1`). Timeout **12000** ms. On failure → HTTP **502** JSON `{ ok: false, error: "CORE_TELEMETRY_DISCONNECTED", detail }` — no LLM stream starts.
  2. **SSE tool receipt** — `coreTelemetryBridge` complete with byte count logged before link scraper phase.
  3. **Hardened governance layers** — `buildHardenedGovernanceLayers(liveSystemTelemetryJson)` prepended to system instruction via `buildBoardroomSystemInstruction`. Layers include unidirectional diode, live metric hydration JSON block, de-classification matrix, Governance Frame triad scaffold, executive persona ratios, mandatory Sources & Citations, **`BOARD_DOCUMENTATION_AUTHORSHIP_MANDATE`**, and **`BOARD_GTM_MARKET_AUTHENTICITY_MANDATE`** (synthetic `{Region} Ledger` / `{Region} Vault` scaffolding must never be cited as live market research).
  4. **Multi-region workspace prefetch** — when `shouldPrefetchProspects(query)` matches (including new `GTM_MARKET_SIGNAL` regex for "target market", "go-to-market", "who are our potential customers"), `inferRegionsFromQuery` resolves countries; `verifyAndOptimizeMarketData` runs per region before flywheel context assembly.
  5. **Founding agent LLM path** — CEO/CFO/Compliance/Legal in `founding.ts` call `generateBoardAgentAssessment` with `formatBoardStateSummary` including `financialProjectionsCents` whole-integer cent string and constitutional baseline anchors.
  6. **Panel routing** — `routeExecutivePanel` attaches a `BoardroomOrchestrationReceipt`:
  * `linkScraperComplete`, `linkScraperOk`, `linkScraperTraceId`
  * `videoTimelineInjected`, `telemetryVerified`
  * `blocksExtractedUnits` (BigInt string)
  * `crmTelemetryInteractionId`
  * `preRoutingValidation`: `PASSED` | `SKIPPED` | `FAILED`
* **Agent Boundary:** **Ironlogic** (Agent 4) synthesis; **Irontally** (Agent 5) governance memo cron phase; **Ironwatch** (Agent 13) receives shared-context telemetry; board personas are advisory only — Layer 1 diode forbids direct DB writes without human operator execution on port 3000.
* **Step-by-Step Lab Validation:**
  1. Start Ironframe on `http://127.0.0.1:3000` and IronBoard on `http://127.0.0.1:8082`.
  2. Submit boardroom query without Ironframe running — verify HTTP **502** and `CORE_TELEMETRY_DISCONNECTED` in response body.
  3. With both engines running, submit CRM intent query ("show deal pipeline") — verify SSE shows `coreTelemetryBridge` complete before synthesis tokens.
  4. Set target countries to `Germany, Australia` in flywheel input, ask "Are there companies in Germany that fit our ICP criteria?" — verify `queryLocalWorkspace` prefetch uses `regions: ["Germany"]` or multi-region args per query inference.
  5. Poll `GET /api/board/shared-context` — verify JSON includes `documentationBrief` with dual-plane matrix and Trainer/Writer placement targets.
  6. Ask **"Why are Ironleads and SalesTeam showing red HIGH on the workforce panel?"** — verify SSE shows `productMatrixHealth` tool receipt (not labor-market web search) and answer cites port health probes with `checkedAt` timestamp.
  7. Inspect server logs for `[LAYER 2: LIVE METRIC HYDRATION]` block presence in system instruction assembly.
  8. Run `Ironboard/src/services/coreTelemetryBridge.test.ts` and `Ironboard/src/services/boardroomQueryIntent.test.ts` — all pass including perimeter health intent detection.

---

<a id="board-002"></a>

### 🎬 Feature 10: Irongate Video Intelligence Ingress (Agent 14)
* **GRC Function ID:** `BOARD-002`
* **Exact Screen Coordinates:** No direct UI — API endpoint `POST /api/ingress/video` on IronBoard service (port **8082** default).
* **Operational Purpose:** Sanitizes external video transcripts and asset links through the **Level 2 DMZ air-gap** before persisting markdown intelligence documents into `ironboard_crm_interactions` with `metricTag=video_intelligence`.
* **Technical Mechanics:** Pipeline stages:
  1. `processVideoIrongateIngress` — Zod schema validation (`irongateVideoEnvelopeSchema`), injection vector stripping via `stripIrongateInjectionVectors`
  2. Quarantine path returns HTTP **422** with `agent: 'Irongate-Agent-14'`
  3. `parseVideoIntelligencePayload` — multimodal parse (`transcript_direct`, `asset_link_gemini`, or `asset_link_skeleton`)
  4. `persistVideoIntelligenceDocument` — CRM envelope with `sanitizedBy: 'Irongate-Agent-14'`
  5. `linkScraper.ts` `STREAMING_MEDIA_URL_PATTERN` now matches **YouTube Shorts** (`youtube.com/shorts/`) and uses `[A-Za-z0-9_-]{11}` video ID capture
  6. `boardResponseLibrary.ts` exports `YOUTUBE_URL_SIGNAL`, `YOUTUBE_VIDEO_DENIAL_REWRITE`, and expanded `BANNED_CAPABILITY_DENIAL_PATTERNS` — when a video-linked query triggers denial stripping and response length < 160 chars, `finalizeSanitizedBoardCompletion(accumulatedText, sanitizeDenials, { query })` appends the canonical rewrite instructing the board to cite VIDEO INTELLIGENCE timeline blocks
  7. `boardroomQueryIntent.ts` `shouldPrefetchWeb` returns false when `payloadSignalsVideoIntelligence(query)` — video links skip live web grounding to preserve timeline injection path
* **Environment Variables (`.env.example`):**
  * `IRONBOARD_BOARD_ORG_TENANT_UUID` — defaults to Medshield seed `5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01`
  * `IRONBOARD_GRC_ANALYST_VIDEO_URL` — canonical YouTube URL for GRC Analyst day-in-the-life briefings
* **Agent Boundary:** **Irongate** (Agent 14) exclusive perimeter — bypass forbidden per TAS DMZ mandate.
* **Step-by-Step Lab Validation:**
  1. POST valid payload with `tenant_id` UUID and transcript array — expect HTTP **201** `status: CLEAN` with `blockCount`, `durationMs`, `parserMode`.
  2. POST payload with script injection in transcript text — verify stripping and CLEAN or QUARANTINED outcome.
  3. POST without `asset_link` or transcript — expect QUARANTINED **422**.
  4. Run `tests/unit/videoIngress.test.ts`, `tests/unit/videoBoardPrefetch.test.ts`, and `tests/unit/linkScraper.test.ts` — all pass including Shorts URL extraction.
  5. Confirm CRM row `metricTag` equals `video_intelligence`.

---

<a id="board-003"></a>

### 📚 Feature 11: Strategic Intel Research Ingress
* **GRC Function ID:** `BOARD-003`
* **Exact Screen Coordinates:** IronBoard Strategic Intel dashboard view (populated from `ironboard_crm_interactions` research rows).
* **Operational Purpose:** Ingests external GRC research artifacts (manifest-driven) into tenant-scoped CRM interactions for board briefings, with mandatory Agent 14 sanitization before persistence.
* **Technical Mechanics:** Modules added in today's delta:
  * `strategicIntelIngress.ts` — DMZ persistence path
  * `strategicIntelSanitizer.ts` — `stripIrongateInjectionVectors` for research JSON
  * `strategicIntelManifestLoader.ts` — loads `grcProfessionalResearch.manifest.json`
  * `strategicIntelResearchQuery.ts` — query binding for board prefetch
  * `docsMatrixIngress.ts` — documentation matrix rows with `docsMatchedUnits` as **BigInt**
  * `linkScraper.ts` middleware — URL extraction with `linksMatchedUnits` and `pipelineDurationMsUnits` as **BigInt**
* **Manifest Entry Example:** *"Enterprise buyers require Irongate DMZ sanitization on all external research ingress. Strategic Intel updates must pass Agent 14 schema validation before CRM persistence."*
* **Agent Boundary:** **Irongate** (Agent 14) sanitization; **Ironintel** (Agent 16) OSINT cron phase consumes refreshed intel.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/strategicIntelIngress.test.ts` — verify sanitization and tenant binding.
  2. Run `tests/unit/docsMatrixIngress.test.ts` — verify BigInt unit counters in pipeline statistics.
  3. Trigger link scraper with known Ironframe docs URL — verify `blocksExtractedUnits` increments as BigInt string in orchestration receipt.
  4. Confirm `ironboard_crm_rls.sql` script enforces tenant isolation on CRM interaction reads.

---

<a id="board-004"></a>

### 📖 Feature 12: GRC Analyst Day-in-the-Life Video Seed
* **GRC Function ID:** `BOARD-004`
* **Exact Screen Coordinates:** Board knowledge context — injected into IronBoard static knowledge vault.
* **Operational Purpose:** Seeds the canonical **"Cybersecurity Reality: A Day in the Life of a GRC Analyst"** video briefing for executive education tracks.
* **Technical Mechanics:** `Ironboard/src/knowledge/grcAnalystDayVideoSeed.ts` exports structured transcript cues compatible with `TranscriptCueInput` from `videoIngress.ts`. Board prefetch (`videoBoardPrefetch.ts`) can hydrate timeline blocks before panel routing.
* **Step-by-Step Lab Validation:**
  1. Set `IRONBOARD_GRC_ANALYST_VIDEO_URL` in environment to a valid YouTube URL.
  2. Invoke boardroom query referencing GRC analyst video — verify timeline injection flag `videoTimelineInjected: true` on orchestration receipt.
  3. Verify markdown document output contains timecoded speaker blocks.

---

<a id="integrity-001"></a>

### 🛡️ Feature 13: Integrity Hub Resilience Fallback
* **GRC Function ID:** `INTEGRITY-001`
* **Exact Screen Coordinates:** `/integrity` route — Integrity Hub center canvas with ALE hero card and chaos ledger panel.
* **Operational Purpose:** Provides workforce registry verification and chaos ledger forensics even when the expanded registry read path fails.
* **Technical Mechanics:** `app/(dashboard)/integrity/page.tsx` wraps `readIntegrityVaultSnapshotWithRegistry()` in try/catch — on failure, falls back to `readIntegrityVaultSnapshot()` with `ok: false` and `error: "Workforce registry unavailable"` rather than throwing a blank 500 page.
* **Agent Boundary:** **Irontrust** (Agent 3) ALE hero; **Ironwatch** (Agent 13) registry manifest; **Irontech** (Agent 19) repair priority when `healthBarPercent` < 50%.
* **Step-by-Step Lab Validation:**
  1. Navigate to `/integrity` as authenticated operator — verify page renders even if registry endpoint degrades.
  2. Confirm ALE hero displays cents-derived values for active tenant baseline.
  3. Authenticated user visiting `/login` — verify middleware redirect to `/integrity` (Rule B).
  4. Unauthenticated user visiting `/integrity` — verify redirect to `/login` (Rule A).

---

<a id="constitution-001"></a>

### 📜 Feature 14: Constitutional Rebaseline Operator Script
* **GRC Function ID:** `CONSTITUTION-001`
* **Exact Screen Coordinates:** No UI — DBA/operator script execution against preview or production Postgres.
* **Operational Purpose:** Clears stuck **Ironlock** latch fields on `SystemConfig` when `TAS.md` is valid but UI still shows **CONSTITUTIONAL VOID**.
* **Technical Mechanics:** `prisma/scripts/constitutional_rebaseline_reset.sql` — safe to re-run; does not delete `security_posture`. Complements `app/lib/constitutionalRebaseline.ts` API route at `/api/grc/constitutional-restoration` (now traced in `next.config.ts` with `docs/TAS.md` and `storage/constitutional/TAS.md.gold`).
* **Agent Boundary:** **Ironlock** (Agent 6) freeze latch; **Ironlogic** (Agent 4) constitutional parsing.
* **Step-by-Step Lab Validation:**
  1. Induce constitutional void display in staging environment.
  2. Execute rebaseline SQL script against `SystemConfig`.
  3. Poll `/api/grc/tas-integrity` — verify `constitutionalRebaselinePending` clears and `ironlockFreezeApplied` reflects true state.
  4. Confirm `ironlockFreezeApplied` and `chaosSimulationActive` fields present in integrity payload.

---

<a id="nav-001"></a>

### 🧭 Feature 15: Unified Header Route Matrix
* **GRC Function ID:** `NAV-001`
* **Exact Screen Coordinates:** TopNav master header and HeaderTwo sub-navigation strip.
* **Operational Purpose:** Eliminates divergent route-matching logic between HeaderOne and HeaderTwo — single `buildHeaderRouteMatrix(pathname)` pass per navigation event.
* **Technical Mechanics:** `app/utils/grcRouteMatch.ts` exports:
  * `HEADER_TENANT_SLUGS`: medshield, vaultbank, gridcore, defense
  * `HeaderRouteMatrix` flags: `isAuditTrailRoute`, `isEvidenceRoute`, `isFrameworksRoute`, `isIntegrityHubRoute`, `isBoardReportRoute`, `isOpSupportRoute`, `isPlaybookRoute`, `playbookEntity`
  * `isAuthPublicPath` — classifies routes that must not mount workspace chrome
  * `isPublicCloudIngressPath` — narrow cloud funnel paths bypass production quarantine
  * `isPrivateWorkspaceIngressPath` — command-center surfaces blocked on cloud until full ingress
  * `isPublicProspectOnboardingPath` — includes `/sales-agent-portal` and `/api/agents/sales`
  * `isScrollableStandalonePath` — drives `DashboardGroupShell` overflow behavior; includes `/docs`, `/settings/config`, `/settings/workspace`
* **Step-by-Step Lab Validation:**
  1. Navigate to `/medshield/playbooks` — verify `playbookEntity` equals `MEDSHIELD` and playbook tab highlights.
  2. Navigate to `/reports/audit-trail` — verify audit trail route flag true with standalone scroll.
  3. Run `tests/unit/grcRouteMatch.test.ts` — all matrix combinations pass.
  4. Confirm `/login` returns true for `isAuthPublicPath` — no TopNav tenant switcher on login page.

---

<a id="auth-004"></a>

### 🔒 Feature 16: Hardened Login & Password Recovery Surfaces
* **GRC Function ID:** `AUTH-004`
* **Exact Screen Coordinates:** `/login`, `/forgot-password`, `/reset-password` — full-page themed forms outside dashboard chrome.
* **Operational Purpose:** Provides accessible authentication with project-ref-aware error messages and password visibility toggle, routing successful sign-in to Integrity Hub.
* **Technical Mechanics:**
  * Login normalizes email to lowercase before `signInWithPassword`
  * Invalid credentials message includes Supabase project ref from `supabaseProjectRefFromUrl`
  * `ResetPasswordForm.tsx` calls `updateUserPasswordAction` server action
  * `requestResetPassword.ts` uses `resolvePublicAppUrl()` for redirect links to `https://ironframegrc.com`
* **Agent Boundary:** **Ironguard** (Agent 12) session cookies merged on redirect via `redirectWithSupabaseCookies` in middleware.
* **Step-by-Step Lab Validation:**
  1. Submit wrong password — verify error cites Supabase project ref and suggests forgot-password path.
  2. Toggle password visibility icon — verify `Eye` / `EyeOff` state changes input type.
  3. Successful login — verify `router.replace("/integrity")` not deprecated dashboard-only path.
  4. Request password reset — verify email link targets `NEXT_PUBLIC_APP_URL/reset-password`.

---

<a id="ops-001"></a>

### 🛠️ Feature 17: Operator Identity Context Provider
* **GRC Function ID:** `OPS-001`
* **Exact Screen Coordinates:** React context consumed by TopNav, permissions hooks, and profile menu — no standalone panel.
* **Operational Purpose:** Centralizes Supabase operator profile resolution so TopNav does not duplicate auth subscription logic.
* **Technical Mechanics:** `app/context/OperatorContext.tsx` pairs with `useOperatorIdentity` hook. `TopNav` removed inline `supabase.auth.getUser` polling — now reads `isGuest` and loading state from hooks. `OperatorContext` supplies `profile.email`, `profile.displayRole` to `TopNavUserProfileMenu`.
* **Step-by-Step Lab Validation:**
  1. Load dashboard — verify TopNav shows "Resolving operator…" then email address.
  2. Sign out via profile menu — verify redirect through `/api/auth/session-logout?next=%2Flogin` and guest state on return; confirm `ironframe-tenant` and `ironframe-simulation-mode` cookies cleared.
  3. Confirm no duplicate auth listeners in TopNav (network tab — single session refresh path).

---

<a id="cron-001"></a>

### 🌙 Feature 18: 03:00 Documentation Engine (Cron Narrate)
* **GRC Function ID:** `CRON-001`
* **Exact Screen Coordinates:** No UI — scheduled Windows Task Scheduler or headless PowerShell invocation at 03:00 local.
* **Operational Purpose:** Executes three Cursor CLI agent phases nightly: Writer (this glossary), Ironintel OSINT sweep, and Ironlogic/Irontally governance memo. **2026-07-15 addition:** `scripts/register-nightly-cron-tasks.ps1` also registers Windows Task `\Ironframe GTM Briefing Queue` for weekday autonomous quarantine authorship via `scripts/cron_gtm_briefing_queue_scheduled.ps1` — distinct from 03:00 Writer narrate; GTM queue never auto-publishes.
* **Technical Mechanics:** `.cursorrules` compacted to 43-line auto-completion constraint sheet (legacy 204-line governance protocol retired from repo). Writer/Trainer mandates live in project rules, `boardroomSystemPrompt.ts`, and this glossary. `scripts/cron_narrate.ps1` delta improvements:
  * `Import-ProjectDotEnv` loads `.env.local` and `.env` for `CURSOR_API_KEY`
  * `Resolve-CursorAgentLauncher` prefers direct `node.exe` + `index.js` over failing `agent.ps1` shim
  * `Invoke-CursorAgentCli` passes `--trust` flag for headless execution
  * Auth preflight via `agent status` before diff extraction
  * Git delta: `git diff $BaseCommit` → `daily_code_diff.txt` (docs/ excluded)
* **Agent Boundary:** Writer persona → **Ironcore** documentation; Intel phase → **Ironintel** (Agent 16) + **Irongate** (Agent 14) sanitization; Board phase → **Ironlogic** (Agent 4) + **Irontally** (Agent 5) with BigInt ALE evaluation (**1110000000**, **590000000**, **470000000** cent baselines).
* **Step-by-Step Lab Validation:**
  1. Set `CURSOR_API_KEY` in user environment or `.env.local`.
  2. Run `scripts/cron_narrate.ps1` manually — verify log file records launcher mode (node vs shim).
  3. Confirm `daily_code_diff.txt` regenerated from last 24-hour commit window.
  4. Verify Writer phase updates `docs/qa/complete-feature-glossary.md` without placeholder tokens.
  5. Confirm exit code non-zero when API key missing — script refuses silent no-op.

---

<a id="layout-002"></a>

### 🏗️ Feature 19: Dashboard Command Center Layout Isolation
* **GRC Function ID:** `LAYOUT-002`
* **Exact Screen Coordinates:** Wraps every route under `app/(dashboard)/` — invisible structural frame between dashboard layout and page content.
* **Operational Purpose:** Keeps TopNav, airlock banner, and telemetry polling hooks out of the root layout so public marketing and auth surfaces never mount workspace chrome accidentally.
* **Technical Mechanics:** `app/(dashboard)/DashboardCommandCenterLayout.tsx` renders a flex column with `AppShell` as the sole child. `AppShell` mounts `TopNav`, `InTenantSupportDrawer`, `AgentInspectShell`, `TrainerAgentDrawer`, and `VendorHeaderToolbarBridge`. Root `app/layout.tsx` provides fonts, `IronframeThemeProvider`, and global CSS only. This satisfies TAS UI separation: presentation tokens are global; tenant-scoped navigation is dashboard-group only.
* **Agent Boundary:** **Ironcore** (Agent 1) orchestration shell; no financial or ingestion side effects.
* **Step-by-Step Lab Validation:**
  1. Open `/login` in a private window — verify no TopNav tenant switcher or tripane rails appear.
  2. Sign in and land on `/integrity` — verify TopNav mounts with subnav toolline.
  3. Inspect React component tree — confirm `DashboardCommandCenterLayout` wraps dashboard routes only.

---

<a id="auth-005"></a>

### 🍪 Feature 20: Dashboard Tenant Session Cookie Hydration
* **GRC Function ID:** `AUTH-005`
* **Exact Screen Coordinates:** Invisible server-side cookie write — no UI chip.
* **Operational Purpose:** When RBAC resolves a workspace UUID but the browser lacks a scoped `ironframe-tenant` cookie, the server persists the assignment before dashboard chrome paints — preventing orphan sessions from guessing tenant scope.
* **Technical Mechanics:** `app/lib/auth/dashboardTenantSession.ts` and `app/lib/auth/workspaceSessionCookies.ts`:
  * `IRONFRAME_TENANT_COOKIE` = `ironframe-tenant`; `IRONFRAME_SIMULATION_MODE_COOKIE` = `ironframe-simulation-mode`
  * `WORKSPACE_SCOPE_COOKIE_NAMES` — both cleared on logout via `stampWorkspaceCookieClears` and client `clearWorkspaceScopeCookiesClient`
  * `tenantCookieValueForUuid` — resolves canonical slug via `tenantKeyFromUuid` or Prisma `tenant.slug` lookup
  * `applyDashboardTenantSessionCookie` — sets secure cookie in production (`sameSite: lax`, 180-day max-age)
  * `ensureDashboardTenantSession` in `dashboardRoleAccess.ts` — calls apply only when `tenantFallbackApplied: true`
  * `resolveDashboardActiveTenantUuid` — React `cache()` wrapper; cookie scope first, then RBAC assignment, Medshield UUID fallback
  * **Post-logout guard (2026-07-06):** `applySubdomainTenancy` realigns stale cookies only when cookie **exists** — absent cookie on subdomain `/login` after logout is not re-stamped
* **Agent Boundary:** **Ironguard** (Agent 12) tenant isolation; never accepts guessed tenant IDs from client payloads.
* **Step-by-Step Lab Validation:**
  1. Clear `ironframe-tenant` cookie after successful login.
  2. Navigate to `/integrity` — verify cookie re-written with slug or UUID matching RBAC assignment.
  3. Confirm `access-status` API returns tenant scope aligned with cookie value.

---

<a id="auth-006"></a>

### ⏳ Feature 21: Access Pending & Dashboard Error Boundary
* **GRC Function ID:** `AUTH-006`
* **Exact Screen Coordinates:** Full-page center canvas on `/unauthorized` and on dashboard route errors matching digest `1041080224`.
* **Operational Purpose:** Replaces blank Next.js error pages with actionable access-pending guidance when RBAC gaps cause server errors during dashboard mount.
* **Operational Mechanics:** `app/(dashboard)/error.tsx` inspects `error.digest` and message text — when digest equals **`1041080224`** or message matches role-assignment patterns, renders `AccessPending` instead of generic failure UI. Non-RBAC errors show Retry, **Command Post** link to `/`, access-status, and sign-in links.
* **Agent Boundary:** **Ironguard** (Agent 12) access enforcement UX.
* **Step-by-Step Lab Validation:**
  1. Sign in with user lacking `user_role_assignments` — verify `/unauthorized` shows AccessPending copy.
  2. Simulate digest `1041080224` class error on dashboard route — verify same AccessPending surface.
  3. Trigger unrelated server error — verify generic dashboard unavailable panel with Retry button.

---

<a id="board-005"></a>

### 📜 Feature 22: Board Conversational Boundary & Canonical Response Registry
* **GRC Function ID:** `BOARD-005`
* **Exact Screen Coordinates:** IronBoard orchestration plane — no direct UI; governs `POST /api/boardroom/query` synthesis behavior.
* **Operational Purpose:** Prevents LLM hallucination on CRM capability, video intelligence, and sales-lead discovery questions by routing matched queries to deterministic canonical text backed by tool receipts.
* **Technical Mechanics:** `Ironboard/src/orchestrator/routing.ts` exports:
  * `BOARD_CONVERSATIONAL_BOUNDARY` / `IRONBOARD_DOMAIN_BOUNDARY` — zero cross-contamination with Ironframe port 3000
  * `BOARD_CRM_TOOL_MANDATE` — requires `manageCrmPipeline` tool execution before CRM claims
  * `BOARD_VIDEO_INTELLIGENCE_MANDATE` — forbids "cannot watch video" responses when `[LINK SCRAPER]` timeline tag present
  * `BOARD_EXECUTION_LAYER_PERSONA` — bans first-person AI disclaimer language
  * `CANONICAL_SALES_LEADS_RESPONSE` — registered answer for passive lead-generation queries via `isSalesLeadDiscoveryQuery`
  * `CANONICAL_DOCS_HUB_LOCATION_RESPONSE` / `CANONICAL_TRAINING_DOCS_LOCATION_RESPONSE` — deterministic prose from `buildDocsHubLocationAnswer()` and `buildTrainingDocsLocationAnswer()` in `productFacts.ts`; matched by `isDocsHubLocationQuery` and `isTrainingDocsLocationQuery` (2026-07-17)
  * `buildCanonicalGrcVideoBriefingResponse` — timecoded transcript from `grcAnalystDayVideoSeed.ts`
  * `resolveCanonicalBoardResponse` — deterministic bypass before LLM synthesis
  * **Anti-hallucination preamble (2026-07-17):** forbids inventing SaaS routes, portals, Knowledge Bases, layouts, certifications, customers, or pricing outside product spine
  * `boardroomQueryIntent.ts` (2026-06-18): `inferRegionsFromQuery` returns country array from `matchCountriesInQuery`, query London/Singapore tokens, or `parseActiveTargetCountries(activeHub)`; `shouldPrefetchProspects` matches Germany/Australia/Canada ICP questions; `shouldPrefetchWeb` skips when `payloadSignalsVideoIntelligence(query)`
  * **Gemini 3 stream hardening (2026-07-15):** `resolveBoardroomToolMode` uses combined googleSearch+functions only when `needsWeb && !hasWorkspacePrefetch`; `BOARDROOM_STREAM_ROUND_TIMEOUT_MS = 55000`; GRC prefetch capped at **2** regions; `thoughtSignature` preserved on tool history rounds; `withGeminiRateLimitRetry` max **4** attempts
* **Agent Boundary:** **Ironlogic** (Agent 4) synthesis guardrails; **Ironquery** (Agent 15) discovery receipts required for non-canonical paths.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/boardroomOrchestrator.test.ts` — verify sales-lead canonical match and video briefing builder.
  2. Submit boardroom query "Do you actively look for sales leads?" — verify canonical CRM engine response, not external crawl claim.
  3. Submit GRC analyst video reference — verify timecoded findings without AI limitation disclaimer.
  4. Submit "where is the docs hub?" — verify canonical prose cites `/docs` reader shell without tripane percentages.
  5. Run `Ironboard/src/tests/docsLocationCanonicalRouting.test.ts` — all canonical location matchers pass.

---

<a id="board-006"></a>

### ✍️ Feature 23: Ironscribe Markdown Outline Parser (Agent 05)
* **GRC Function ID:** `BOARD-006`
* **Exact Screen Coordinates:** Backend-only — feeds docs matrix ingress and board knowledge vault parsing.
* **Operational Purpose:** Strips YAML metadata headers and structures markdown outlines into board-safe knowledge blocks with immutable parse attribution.
* **Technical Mechanics:** `Ironboard/src/services/ironscribe/markdownOutlineParser.ts`:
  * Parses markdown headings into outline nodes
  * Stamps `parsedBy: 'Ironscribe-Agent-05'` on output envelope
  * Consumed by `docsMatrixIngress.ts` alongside Irongate sanitization
* **Agent Boundary:** **Ironscribe** (Agent 05) export hash and audit citation lineage.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/docsMatrixIngress.test.ts` — verify outline blocks ingest with Ironscribe attribution.
  2. Ingest markdown document with YAML front matter — verify header stripped from persisted CRM envelope.

---

<a id="board-007"></a>

### 🤝 Feature 24: CRM Deal ownerAgentId Attribution
* **GRC Function ID:** `BOARD-007`
* **Exact Screen Coordinates:** IronBoard CRM pipeline — `DealRecord` rows in board tooling (no Ironframe dashboard chip).
* **Operational Purpose:** Binds each deal stage vector to the responsible boardroom agent ID for workforce accountability in commercial orchestration.
* **Technical Mechanics:** `Ironboard/src/services/crm/crmService.ts` delta adds optional `ownerAgentId` on deal create/update paths — trimmed string persisted on `DealRecord`. Enables board reports to cite which agent owns pipeline progression without cross-tenant agent memory bleed.
* **Agent Boundary:** IronBoard commercial plane only — Ironframe 19-agent GRC workforce remains on port 3000.
* **Step-by-Step Lab Validation:**
  1. Create deal via `manageCrmPipeline` with `ownerAgentId` set — verify persistence round-trip.
  2. Confirm tenant isolation — deal query scoped to board org tenant UUID from `crmTenantContext.ts`.

---

<a id="intel-001"></a>

### 🛰️ Feature 25: June 18 Live Strategic Intel OSINT Manifest
* **GRC Function ID:** `INTEL-001`
* **Exact Screen Coordinates:** IronBoard Strategic Intel dashboard — rows in `ironboard_crm_interactions` with manifest `ironintel-osint-2026-06-18-live`.
* **Operational Purpose:** Delivers fresh external OSINT for June 18, 2026 through Irongate-sanitized CRM persistence for board briefings. Operational date **2026-06-19** carries two live BOD 26-04 KEV remediation deadlines from this manifest: **CVE-2026-48907** (Joomla Content Editor, CVSS 9.8, CISA KEV June 16, FCEB deadline **June 18, 2026**) and **CVE-2026-54420** (LiteSpeed cPanel symlink root escalation, CISA KEV June 16, FCEB deadline **June 19, 2026**). Primary active threat vectors ingested in today's delta refresh:
  * **FortiBleed credential harvesting (June 17–18, 2026):** Hudson Rock and SOCRadar confirm **73932** unique Fortinet firewall URLs with verified working admin credentials across **21632** domains and **194** countries — **1160000000** credential-stuffing attempts; no zero-day required; perimeter trust structurally broken.
  * **CVE-2026-35273 (CVSS 9.8):** Oracle PeopleSoft Environment Management Hub missing authentication — KEV June 12; ShinyHunters UNC6240 notified **100** plus orgs (**68** percent higher-education); ransomware campaign linkage active.
  * **CVE-2026-50751 (CVSS 9.3):** Check Point Remote Access VPN IKEv1 authentication bypass — Qilin affiliates exploiting since May 7, 2026; assume breach on unpatched gateways.
  * **CVE-2026-50656:** Microsoft RoguePlanet privilege escalation zero-day in Defender under active investigation (June 2026).
  * **Mastra npm supply chain (June 2026):** **140** plus packages compromised via malicious `easy-day-js` dependency targeting crypto wallet credentials — Technology profile continuous-audit **CRITICAL**.
  * **DragonForce Backdoor.Turn (June 16 disclosure):** Microsoft Teams TURN relay QUIC C2 persists as trusted-SaaS egress threat — domain allowlists structurally insufficient.
  * **CISA BOD 26-04 (June 10, 2026):** four-variable risk matrix (asset exposure, KEV status, exploit automation, technical impact) operational; forensic triage before patch is baseline for tier-1 KEV flaws.
  * **CMMC Phase 2:** mandatory Level 2 C3PAO certification **145** days away (November 10, 2026); assessments locked to NIST SP 800-171 Revision 2 per DoD class deviation **2024-O0013**; C3PAO scheduling lead times **6** to **18** months.
* **Technical Mechanics:** `Ironboard/src/knowledge/grcProfessionalResearch.manifest.json`:
  * `manifestId`: `ironintel-osint-2026-06-18-live`
  * `generatedAt`: `2026-06-18T18:00:00.000Z`
  * RAG chunks renamed in delta: `osint-02-fortibleed`, `osint-03-joomla-litespeed`, `osint-07-mastra-npm`, plus retained Check Point, PeopleSoft, DragonForce, BOD 26-04, CMMC chunks
  * Ingestion script: `npx tsx scripts/ingest-strategic-intel-manifest.ts`
  * `priorityAgents` schema includes **Ironwatch** alongside Ironintel and Ironscribe
  * All industry `peerAleBaselineCents` and `riskMetricsCents` values are **string-encoded BigInt integers** — never floats
* **Industry Profile Peer ALE Baselines (BigInt cents only):**
  * Finance: **1800000000** cents — `regulatoryPressureIndex` **93**, `saasDisruptionExposureIndex` **79**
  * Healthcare: **1210000000** cents — `regulatoryPressureIndex` **96**, `saasDisruptionExposureIndex` **72**
  * Technology: **950000000** cents — `regulatoryPressureIndex` **84**, `saasDisruptionExposureIndex` **98**, `continuousAuditPriority` **CRITICAL**
  * Defense: **2500000000** cents — `regulatoryPressureIndex` **99**, `saasDisruptionExposureIndex` **62**
  * Public Sector: **1500000000** cents — `regulatoryPressureIndex` **92**, `saasDisruptionExposureIndex` **67**, `continuousAuditPriority` **ELEVATED**
* **Manifest Risk Metrics (BigInt cents only — workday analysis document):**
  * `medianAnnualGrcProgramCents`: **4200000000**
  * `medianAuditRemediationLagCents`: **890000000**
  * `saasConsolidationSavingsOpportunityCents`: **680000000**
  * `boardReportingOverheadCents`: **125000000**
* **SaaS disruption memorandum risk metrics (BigInt cents only):**
  * `medianAnnualGrcProgramCents`: **3850000000**
  * `medianAuditRemediationLagCents`: **935000000**
  * `saasConsolidationSavingsOpportunityCents`: **1120000000**
  * `boardReportingOverheadCents`: **98000000**
* **Constitutional tenant ALE baselines (Ironframe seed tenants — unchanged):** Medshield **1110000000**, Vaultbank **590000000**, Gridcore **470000000**, Defense **1600000000** cents.
* **Agent Boundary:** **Ironintel** (Agent 16) OSINT correlation; **Ironwatch** (Agent 13) FortiBleed perimeter credential telemetry and KEV deadline tracking; **Irongate** (Agent 14) DMZ sanitization via `validateStrategicIntelManifest` before `ingestGrcProfessionalResearchCorpus`.
* **Step-by-Step Lab Validation:**
  1. Run ingest script — verify manifest schema validation passes BIGINT-cent gate for `ironintel-osint-2026-06-18-live`.
  2. Re-run ingest — verify `skippedDuplicate` when manifest already persisted.
  3. Query Strategic Intel dashboard — confirm FortiBleed, Joomla CVE-2026-48907, LiteSpeed CVE-2026-54420, Mastra npm supply chain, and CMMC Phase 2 countdown visible under tenant scope.
  4. Run `tests/unit/strategicIntelIngress.test.ts` — all pass.
  5. Verify boardroom flywheel context cites `Market authenticity audit:` line with `authentic=` / `synthetic=` / `polluted=` counts — never template Ledger/Vault names as real companies.

---

<a id="ops-002"></a>

### 🔧 Feature 26: Operator CLI Provisioning Scripts
* **GRC Function ID:** `OPS-002`
* **Exact Screen Coordinates:** Terminal-only — no UI.
* **Operational Purpose:** Gives platform administrators safe, auditable CLI paths for password operations and strategic intel ingestion without bypassing Supabase Auth or Irongate DMZ.
* **Technical Mechanics:**
  * `scripts/admin-set-password.mjs` — Supabase Admin API password set; requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`; minimum 8 characters
  * `scripts/send-password-reset.mjs` — triggers reset email via public auth API with `NEXT_PUBLIC_APP_URL` redirect
  * `scripts/ingest-strategic-intel-manifest.ts` — Irongate pre-flight + CRM persistence for OSINT manifest
* **Agent Boundary:** **Ironguard** (Agent 12) identity; **Irongate** (Agent 14) on intel ingress only.
* **Step-by-Step Lab Validation:**
  1. Run admin-set-password with test user — verify login succeeds with new password.
  2. Run send-password-reset — verify email link targets `https://ironframegrc.com/reset-password`.
  3. Never commit `.env.local` service role key to repository.

---

<a id="cron-002"></a>

### ⏰ Feature 27: Windows Task Scheduler Cron Wrapper
* **GRC Function ID:** `CRON-002`
* **Exact Screen Coordinates:** No UI — `scripts/cron_narrate_scheduled.ps1` invoked by Task Scheduler at 03:00.
* **Operational Purpose:** Normalizes PATH, working directory, and Cursor agent root before delegating to `cron_narrate.ps1` for unattended nightly documentation and OSINT phases.
* **Technical Mechanics:** Sets `$ProjectRoot = C:\Users\Dereck\ironframe-live`, prepends `%LOCALAPPDATA%\cursor-agent` to PATH, invokes `cron_narrate.ps1` with `-NoProfile -ExecutionPolicy Bypass`, propagates exit code.
* **Step-by-Step Lab Validation:**
  1. Register scheduled task pointing at `cron_narrate_scheduled.ps1`.
  2. Run wrapper manually — verify same log output as direct `cron_narrate.ps1` invocation.
  3. Confirm task exit code non-zero when `CURSOR_API_KEY` missing.

---

<a id="supabase-001"></a>

### 🔗 Feature 28: Shared Supabase Public Env Normalization
* **GRC Function ID:** `SUPABASE-001`
* **Exact Screen Coordinates:** Invisible — shared by browser client, middleware, and login error surfaces.
* **Operational Purpose:** Eliminates duplicated env parsing logic that caused mismatched Supabase project refs between client and middleware session refresh paths.
* **Technical Mechanics:** `lib/supabase/envPublic.ts` exports:
  * `envPublicSupabaseUrl()` — trims quotes and trailing slashes from `NEXT_PUBLIC_SUPABASE_URL`
  * `envSupabaseAnonKey()` — normalizes anon key quoting
  * `supabaseProjectRefFromUrl()` — extracts project ref for login error diagnostics
  * Consumed by `lib/supabase/client.ts`, `lib/supabase/middleware.ts`, and `app/login/page.tsx`
* **Agent Boundary:** **Ironguard** (Agent 12) session infrastructure.
* **Step-by-Step Lab Validation:**
  1. Set quoted URL in `.env.local` — verify client and middleware both connect.
  2. Submit invalid login — verify error message includes correct project ref substring.

---

<a id="integrity-002"></a>

### 🛡️ Feature 29: Constitutional Integrity Sentinel Degraded Payload
* **GRC Function ID:** `INTEGRITY-002`
* **Exact Screen Coordinates:** Polled by TopNav airlock banner and Integrity Hub — API route `/api/grc/tas-integrity`.
* **Operational Purpose:** Returns partial telemetry when ancillary subsystems fail instead of HTTP 500 — preserving Ironwatch and Ironlock polling during Prisma slice outages.
* **Technical Mechanics:** Refactored `app/api/grc/tas-integrity/route.ts`:
  * `buildIntegrityPayload` consolidates fingerprint, dead-man switch, governance maturity, sustainability stale lockdown fields
  * `readSystemConfigStaleLockdownSliceSafe` replaces direct Prisma read for degraded-path safety
  * `assessTasMdIntegritySync` participates in TAS read validation
  * On ancillary failure, response includes `ancillaryWarning` string while core `sha256Short`, `ironlockFreezeApplied`, and `chaosSimulationActive` still return
  * `next.config.ts` adds `outputFileTracingIncludes` for `docs/TAS.md` and `storage/constitutional/TAS.md.gold` on constitutional API routes
* **Agent Boundary:** **Ironlock** (Agent 6) freeze state; **Ironwatch** (Agent 13) maturity score; **Ironlogic** (Agent 4) TAS fingerprint.
* **Step-by-Step Lab Validation:**
  1. Poll `GET /api/grc/tas-integrity` — verify JSON includes `systemMaturityScore`, `chaosSimulationActive`, `sha256Short`.
  2. Simulate SystemConfig read failure in staging — verify HTTP 200 with `ancillaryWarning` rather than 500.
  3. Confirm Vercel deployment traces TAS.md for fingerprint routes.

---

<a id="monetization-001"></a>

### 💳 Feature 30: Phase 1 Monetization Mandate (Sales-Assisted + Stripe)
* **GRC Function ID:** `MONETIZATION-001`
* **Exact Screen Coordinates:** IronBoard static context bundle; `/pricing` public page; `/admin/onboarding` platform console; Stripe webhooks at `/api/webhooks/stripe` (instant checkout) and `/api/billing/webhook` (payment_intent.succeeded billing activation).
* **Operational Purpose:** Establishes Phase 1 revenue architecture: **sales-assisted invite only** for first design-partner revenue, with Stripe instant-checkout as the async self-serve provisioning tunnel. Public self-serve multi-subdomain provisioning is hardcoded **OFF** in `config/registration.ts` — not env-driven. **2026-07-15:** Single paid Path B co-builder program — Command Tier on-ramp **499900** cents (**$4,999**); planned GA Ironframe Command ~**3500000** cents/yr until `IRONFRAME_COMMERCIAL_GA=1`; draft commercial SKUs in `config/commercialSkus.ts` remain inactive until GA gate.
* **Technical Mechanics:** `Ironboard/src/staticContext.ts` exports `PHASE1_MONETIZATION_BOARD_MANDATE` federated at board startup alongside TAS.md, technical-requirements.md, hub.md, and `docs/stakeholder-deck/ironframe-monetization-market-blueprint-2026-q2.md`. IronBoard `buildDocsFederationMatrix` loads the monetization blueprint as **BOARD PRIORITY** context. Revenue wire path:
  1. `provisionCorporateTenantCore` — creates tenant with `ale_baseline BIGINT` cents, calls `ensureTenantBillingPending`
  2. `inviteCorporateTenantUserCore` — Supabase Admin `inviteUserByEmail` with tenant-scoped metadata
  3. Stripe Checkout metadata requires `slug`, `companyName`, plus customer email from Stripe session
  4. `fulfillStripeInstantCheckout` in `stripeInstantProvisionCore.ts` — provisions tenant, upserts `TenantBilling.status ACTIVE`, invites GRC_MANAGER, records prospect in `prospects` ledger with `reported_ale BIGINT`
  5. `config/stripe.ts` — `resolveStripeCredentialMode()` reads `STRIPE_CREDENTIAL_MODE` (`test` | `live`) or infers from `sk_live_` prefix; `resolveStripeBillingWebhookSecret()` and `resolveStripeInstantCheckoutWebhookSecret()` support split webhook secrets
* **Agent Boundary:** **Ironlogic** (Agent 4) board monetization mandate; **Ironguard** (Agent 12) invite identity; **Ironwatch** (Agent 13) audit receipts on provision and invite actions.
* **Step-by-Step Lab Validation:**
  1. Read `PHASE1_MONETIZATION_BOARD_MANDATE` in IronBoard startup logs — verify monetization blueprint loaded count is 4 federation files.
  2. Navigate to `/pricing` on local host — verify static Stripe Payment Link outbound URL from `NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL`.
  3. Forward Stripe webhooks locally: `stripe listen --forward-to http://127.0.0.1:3000/api/webhooks/stripe` for checkout.session.completed; separate listener or `--events payment_intent.succeeded` to `/api/billing/webhook`.
  4. Complete test checkout — verify `tenant_billing.status` becomes **ACTIVE** and invite email issued.
  5. Run `tests/unit/phase1Commercial.test.ts` and `tests/unit/stripeCheckoutParse.test.ts` — all pass.

---

<a id="billing-001"></a>

### 🚫 Feature 31: Dashboard Billing Suspension Gate
* **GRC Function ID:** `BILLING-001`
* **Exact Screen Coordinates:** Full-page overlay inside dashboard route group when billing status is **PENDING** or **PAST_DUE** — renders `BillingSuspensionNotice` instead of tripane workspace.
* **Operational Purpose:** Blocks command-center telemetry access for tenants with unpaid or lapsed Stripe subscriptions while preserving platform-admin and billing-hold remediation paths.
* **Technical Mechanics:** `app/(dashboard)/layout.tsx` resolves `resolveTenantBillingEntitlementByUuid(access.tenantUuid)` and wraps children in `DashboardBillingGate`. Gate is active when `billing.blocked === true` and operator is not `canUsePlatformAdminTools()`. Exempt paths: `/admin/onboarding`, `/account/billing-hold`. Prisma model `TenantBilling` maps `tenant_slug`, `stripe_customer_id`, `status` (**PENDING**, **ACTIVE**, **PAST_DUE**). `isBillingGateActiveStatus` returns true for PENDING and PAST_DUE only.
* **Agent Boundary:** **Irontrust** (Agent 3) financial entitlement enforcement — no float billing amounts; Stripe `amountTotalCents` stored as BigInt at provision.
* **Step-by-Step Lab Validation:**
  1. Set tenant billing status to **PENDING** via `setTenantBillingStatus` admin action.
  2. Sign in as GRC_MANAGER for that tenant — verify suspension notice renders instead of Integrity Hub.
  3. Sign in as GLOBAL_ADMIN — verify dashboard content renders (platform admin bypass).
  4. Navigate to `/admin/onboarding` while billing blocked — verify exempt path renders onboarding console.

---

<a id="subdomain-001"></a>

### 🌐 Feature 32: Multi-Tenant Subdomain Routing Envelope
* **GRC Function ID:** `SUBDOMAIN-001`
* **Exact Screen Coordinates:** Invisible middleware envelope — manifests as host-scoped workspace URLs like `https://vaultbank.ironframegrc.com/integrity` or `http://acmecorp.lvh.me:3000/`.
* **Operational Purpose:** Binds HTTP host to tenant workspace scope so operators land on tenant-branded subdomains after corporate invite or Stripe checkout without manually selecting tenant from switcher.
* **Technical Mechanics:** `app/lib/tenantSubdomain.ts` and `app/lib/middlewareSubdomainTenancy.ts`:
  * `IRONFRAME_SUBDOMAIN_TENANCY` enabled by default — set `0` to disable
  * `IRONFRAME_TENANT_APEX_DOMAIN` defaults from `NEXT_PUBLIC_APP_URL` hostname (`ironframegrc.com`)
  * `NEXT_PUBLIC_DEVELOPMENT_DOMAIN` defaults to `lvh.me:3000` for local wildcard tenant hosts
  * Reserved labels blocked: `www`, `api`, `app`, `admin`, `staging`, `preview`, `docs`, `login`
  * `resolvePostAuthLandingPath(host)` — authenticated `/login` redirect targets tenant Command Post on subdomain hosts, `/integrity` on apex
  * Auth callback `route.ts` resolves tenant slug from invite metadata, sets `ironframe-tenant` cookie, redirects to tenant subdomain origin
  * Internal slug resolution for dynamic tenants: `GET /api/internal/tenant-slug-resolve` gated by `IRONFRAME_CRON_SECRET` or `IRONFRAME_INTERNAL_GATES_SECRET`
* **Agent Boundary:** **Ironguard** (Agent 12) host-bound tenant isolation; cross-tenant path prefix conflicts redirect to host slug canonical path.
* **Step-by-Step Lab Validation:**
  1. Provision tenant `acmecorp` via admin onboarding — open `http://acmecorp.lvh.me:3000/login`.
  2. Complete invite auth callback — verify redirect lands on `acmecorp.lvh.me` workspace, not apex.
  3. Attempt `http://vaultbank.lvh.me:3000/medshield/integrity` — verify middleware strips conflicting path prefix.
  4. Add Supabase redirect URL `http://acmecorp.lvh.me:3000/**` per `.env.example` guidance.
  5. Run `tests/unit/tenantSubdomain.test.ts` and `tests/unit/tenantSlugRegistry.test.ts` — all pass.

---

<a id="registration-001"></a>

### 📝 Feature 33: Invite-Only Registration Gate
* **GRC Function ID:** `REGISTRATION-001`
* **Exact Screen Coordinates:** `/register/contact` (sales-assisted intake); `/register/[token]` (workspace invitation activation); **`/register/setup` route deleted**; `/register/demo` available for client-only product demo entry when registration disabled.
* **Operational Purpose:** Enforces Phase 1 sales-assisted onboarding — prospects cannot self-provision tenants via public registration API. Sales engineers use bearer-authenticated `POST /api/register/sales-intake` instead. **`/register/demo`** and `/demo/*` sandbox routes remain available for mock-auth guided demonstrations without workspace mint.
* **Technical Mechanics:** `config/registration.ts` single source of truth:
  * `IRONFRAME_PUBLIC_REGISTRATION_ENABLED = false` (hardcoded — no env override)
  * `BLOCK_DEMO_SANDBOX_WHEN_REGISTRATION_DISABLED = false` (2026-07-18) — demo sandbox no longer blocked when registration disabled; only `/register/setup` self-provision path remains blocked via `isBlockedProspectRegistrationPath`
  * `shouldBlockProspectIngress` blocks `/api/register/public-intake` when registration disabled — **`/register/setup` page file removed** (no longer a routable surface)
  * Public lead capture remains at `POST /api/register/public-lead` (middleware passthrough for guests)
  * Sales intake requires `INTERNAL_SALES_PROVISION_KEY` bearer token per `salesIntakeAuth.ts`
* **Agent Boundary:** **Ironguard** (Agent 12) ingress policy; **Ironwatch** (Agent 13) prospect ledger audit on successful intake.
* **Step-by-Step Lab Validation:**
  1. Navigate to `/register/setup` on local host — verify **404** (route deleted, not redirect).
  2. Navigate to `/register/demo` — verify client-only demo entry renders (mock auth — no tenant provision).
  3. Navigate to `/product-demo` — verify guided workflow demonstration loads labeled sandbox data.
  4. POST to `/api/register/public-intake` — verify 404 JSON when registration disabled.
  5. POST to `/api/register/sales-intake` with valid bearer — verify tenant provision receipt.
  6. Run `tests/unit/registrationGate.test.ts` and `tests/unit/registrationRoutes.test.ts` — all pass.

---

<a id="legal-001"></a>

### 📜 Feature 34: User Legal Consent Registry
* **GRC Function ID:** `LEGAL-001`
* **Exact Screen Coordinates:** `/terms` and `/privacy` public document pages; `/legal/accept` authenticated acceptance route.
* **Operational Purpose:** Records cryptographic proof that each Supabase user accepted the current MSA and privacy policy versions before accessing paid workspace features — SOC2-aligned consent trail.
* **Technical Mechanics:** `config/legal.ts` immutable versions:
  * `IRONFRAME_TERMS_VERSION`: `2026-06-15-msa-v1`
  * `IRONFRAME_PRIVACY_VERSION`: `2026-06-15-privacy-v1`
  * Prisma `UserLegalConsent` model: `userId`, `termsVersion`, `privacyVersion`, `acceptanceHash`, `acceptedAt`
  * `recordLegalConsent` upserts row with `buildLegalAcceptanceHash(userId, acceptedAtIso)`
  * Middleware allows authenticated `/legal/accept`; unauthenticated users redirect to `/login`
* **Agent Boundary:** **Ironscribe** (Agent 05) immutable acceptance hash lineage; **Ironguard** (Agent 12) session gate on legal accept route.
* **Step-by-Step Lab Validation:**
  1. Open `/terms` and `/privacy` as guest on local host — verify legal document renders.
  2. Sign in without consent row — navigate to `/legal/accept` — submit acceptance.
  3. Query `user_legal_consents` — verify `terms_version` and `privacy_version` match config constants.
  4. Bump version in `config/legal.ts` — verify `hasCurrentLegalConsent` returns false for prior acceptances.

---

<a id="admin-001"></a>

### 🏢 Feature 35: Platform Administrator Onboarding Console
* **GRC Function ID:** `ADMIN-001`
* **Exact Screen Coordinates:** `/admin/onboarding` — `AdminOnboardingDashboardHeader`, `AdminOnboardingDeployments`, and `#onboarding-controls` `CorporateOnboardingClient`; provisioning controls separated from deployment inventory panel.
* **Operational Purpose:** Gives GLOBAL_ADMIN operators a supervisor command plane for B2B tenant provisioning, deployment posture visibility, invitation token minting, and corporate operator invites. Billing activation owned by Stripe webhook — not inline client button.
* **Technical Mechanics:** Middleware Rule A0 — `assertGlobalAdminForOnboarding` requires authenticated GLOBAL_ADMIN for `/admin/onboarding` before platform-admin gate probe via `/api/internal/platform-admin-gate`. Page server component calls `canUsePlatformAdminTools()` before render. Actions delegate to `corporateTenantProvisionCore.ts`. Billing gate exempt — onboarding console reachable even when tenant billing is PENDING.
* **Agent Boundary:** **Ironguard** (Agent 12) GLOBAL_ADMIN RBAC; **Ironwatch** (Agent 13) provision and invite audit receipts.
* **Step-by-Step Lab Validation:**
  1. Sign in as non-admin — attempt `/admin/onboarding` — verify redirect to `/unauthorized`.
  2. Sign in as GLOBAL_ADMIN — verify CorporateOnboardingClient renders provision form.
  3. Provision tenant with `aleBaselineCents` as whole integer string — verify `tenants.ale_baseline` BIGINT matches.
  4. Issue invite with `tenantSlug` and role CISO — verify `user_role_assignments` row created on accept.

---

<a id="demo-001"></a>

### 🧪 Feature 36: Demo Sandbox Command Post
* **GRC Function ID:** `DEMO-001`
* **Exact Screen Coordinates:** `/demo/dashboard` (rewritten from `/dashboard` when demo cookie active); demo host `acorp-sandbox.lvh.me`; amber **`DemoSandboxBanner`** pinned above AppShell when demo session active.
* **Operational Purpose:** Provides a client-side sandbox command post with mock threat telemetry and constitutional ALE anchors for prospect education without touching production tenant data or production API telemetry paths.
* **Technical Mechanics:** `app/lib/demo/demoModeConstants.ts`:
  * `DEMO_WORKSPACE_SLUG`: `acorp-sandbox`
  * `DEMO_ACTIVE_COOKIE`: `ironframe-demo-active`
  * `DEMO_SESSION_COOKIE`: `ironframe-demo-session` — cross-origin cookie on `.lvh.me` and `.localtest.me`
  * `DEMO_ALE_BASELINE_CENTS`: Medshield **1110000000**, Vaultbank **590000000**, Gridcore **470000000** (BigInt literals)
  * `getDemoCommandCenterScope()` aggregates three seed baselines into demo enclave row (**2170000000** cents total display string)
  * Middleware rewrites `/dashboard` → `/demo/dashboard` when demo cookie set on sandbox host or localhost apex
  * **Demo API isolation (2026-06-16 delta):** `applyIronguardToFetch` in `apiClient.ts` throws `DEMO_API_BLOCK_MESSAGE` when `isDemoModeActive()` and path is not a public constitutional sentinel route — logs `DEMO_MODE_ISOLATED` via `isolationSentinelLog.ts`
  * `useKimbotPersistLoop.ts` and `useResilienceIntelPoll.ts` return early when demo mode active — no Kimbot persist or resilience poll against production APIs
  * `AppShell.tsx` mounts `DemoSandboxBanner` and adjusts top padding when demo and simulation banners stack
* **Agent Boundary:** Demo plane uses synthetic UUIDs — zero production RLS bleed; **Ironguard** (Agent 12) blocks cross-tenant fetch; demo isolation is client-side perimeter only — not a substitute for shadow-plane `SimulationDiagnosticLog` semantics.
* **Step-by-Step Lab Validation:**
  1. Set `ironframe-demo-active=1` cookie on localhost — navigate to `/dashboard` — verify rewrite to demo command post.
  2. With demo session active, trigger any `/api/grc/*` fetch — verify console shows `[ DEMO MODE ] | Production telemetry isolated — API call blocked.`
  3. Verify constitutional sentinel paths (`/api/grc/tas-integrity`, `/api/grc/tas-fingerprint`) still callable from marketing shell during demo.
  4. Run `tests/unit/demoMode.test.ts` — verify demo path classification and ALE cent constants.

---

<a id="nav-002"></a>

### 🏷️ Feature 37: Staged Navigation Surface Badges
* **GRC Function ID:** `NAV-002`
* **Exact Screen Coordinates:** TopNav navigation links for stub routes — badge chips **STAGED DRAFT** or **PREVIEW**.
* **Operational Purpose:** Signals design-partner pilots which dashboard routes are immature stubs and blocks GRC_MANAGER role from navigating to unfinished surfaces.
* **Technical Mechanics:** `app/config/stagedNavSurfaces.ts` — `/vendors/supply-chain` (**STAGED DRAFT**), `/reports/dora-eu-resilience` (**PREVIEW**); `isStagedNavBlockedForRole` gates GRC_MANAGER.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/stagedNavSurfaces.test.ts` — all href normalizations pass.

---

<a id="brand-001"></a>

### 🎨 Feature 38: Tenant Brand Accent Resolution
* **GRC Function ID:** `BRAND-001`
* **Exact Screen Coordinates:** TopNav tenant label, login branded panel, subdomain workspace chrome.
* **Operational Purpose:** Applies per-tenant visual identity without altering RLS scope. `ale_baseline` displayed as BigInt cents string through `formatTenantBrand`.
* **Step-by-Step Lab Validation:**
  1. Run `tests/tenantBrand.test.ts` — verify accent resolution for seed tenants.

---

<a id="prospect-001"></a>

### 📇 Feature 39: Executive Prospect Ledger
* **GRC Function ID:** `PROSPECT-001`
* **Exact Screen Coordinates:** Backend `prospects` table — no default UI chip.
* **Operational Purpose:** Persists vetted sales leads with `reported_ale BIGINT NOT NULL` for executive pipeline aggregation.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/publicLeadParse.test.ts` — verify lead payload parsing.

---

<a id="auth-007"></a>

### 🔐 Feature 40: Scoped Dev Constitutional Elevation
* **GRC Function ID:** `AUTH-007`
* **Operational Purpose:** Restricts local constitutional authority to `IRONFRAME_DEV_SUPABASE_USER_ID`, `IRONFRAME_DEV_SUPABASE_EMAIL`, or explicit `IRONFRAME_DEV_CONSTITUTIONAL_ELEVATION=1` — other dev users keep normal RBAC.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/devConstitutionalElevation.test.ts` — scoped match order passes.

---

<a id="auth-008"></a>

### 🔑 Feature 41: Auth Redirect Origin Resolution
* **GRC Function ID:** `AUTH-008`
* **Operational Purpose:** Builds Supabase redirect URLs from active request host including tenant subdomains. Password reset errors cite exact callback URL for Supabase whitelist configuration.
* **Step-by-Step Lab Validation:**
  1. Request password reset from tenant subdomain — verify redirect URL uses tenant host in email link.

---

<a id="board-008"></a>

### 📊 Feature 42: IronBoard Monetization Blueprint Federation
* **GRC Function ID:** `BOARD-008`
* **Exact Screen Coordinates:** No UI — injected into IronBoard static context bundle at engine startup.
* **Operational Purpose:** Injects Q2 2026 market blueprint and authoritative Phase 1 monetization mandate into boardroom static context so executive personas cite sales-assisted invite + Stripe wire paths instead of inventing self-serve provisioning timelines.
* **Technical Mechanics:** `Ironboard/src/staticContext.ts` exports `PHASE1_MONETIZATION_BOARD_MANDATE` (authoritative Q2 2026):
  * Model: **SALES-ASSISTED INVITE ONLY** for first revenue — not self-serve multi-subdomain provisioning
  * Wire: `inviteCorporateTenantUserAction` + admin tenant UI + Stripe webhook → `TenantBilling.status ACTIVE`
  * P0 blockers before charging: Stripe rails, `/terms` + `/privacy`, production quarantine narrowed for public routes, admin invite panel
  * P1 before broad sales: tier entitlements, Epic 12 WORM honesty, stub page badges, SOC2-aligned (never certified) language
  * Fastest revenue path: Command tier, one price, 2–3 design partners while Phase 2 entitlements harden
  * Full backlog document: `docs/stakeholder-deck/ironframe-monetization-market-blueprint-2026-q2.md`
* **Docs federation matrix:** `buildDocsFederationMatrix()` in `Ironboard/src/index.ts` loads four markdown files at startup: `TAS.md`, `technical-requirements.md`, `hub.md`, and the monetization blueprint — logged as `[IRONBOARD DOCS] Loaded N markdown file(s).`
* **Agent Boundary:** **Ironlogic** (Agent 4) and **Irontally** (Agent 5) board governance phases consume this mandate; no financial field mutation — Stripe `amountTotalCents` remains BigInt at fulfillment boundary.
* **Step-by-Step Lab Validation:**
  1. Start IronBoard port **8082** — verify federation log shows monetization blueprint loaded (four files when all present).
  2. Ask boardroom "What is our Phase 1 monetization model?" — verify response cites sales-assisted invite, not self-serve checkout-only provisioning.
  3. Confirm `PHASE1_MONETIZATION_BOARD_MANDATE` appears in `buildStaticContextBundle()` output before Four Pillars blueprint block.

---

<a id="command-001"></a>

### 🏗️ Feature 43: Command Center Tenant Access Scope
* **GRC Function ID:** `COMMAND-001`
* **Operational Purpose:** RBAC-scoped tenant switcher — non-GLOBAL_ADMIN users see only assigned workspaces; subdomain hosts lock to single tenant.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/commandCenterTenantAccess.test.ts` — all pass.

---

<a id="board-009"></a>

### 🎬 Feature 44: Board YouTube Shorts & Denial Rewrite Guard
* **GRC Function ID:** `BOARD-009`
* **Operational Purpose:** Strips LLM video capability denials (including Shorts-specific refusal patterns) and appends canonical `YOUTUBE_VIDEO_DENIAL_REWRITE` when `payloadSignalsVideoIntelligence(query)` detects a video-linked board request with stripped denial and response under 160 characters; skips web prefetch for video queries via `shouldPrefetchWeb` guard in `boardroomQueryIntent.ts`.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/boardResponseLibrary.test.ts` and `tests/unit/linkScraper.test.ts` — all pass including Shorts URL `youtube.com/shorts/{id}` extraction.

---

<a id="integrity-003"></a>

### 🛡️ Feature 45: TAS Markdown Integrity Assessment
* **GRC Function ID:** `INTEGRITY-003`
* **Operational Purpose:** `assessTasMdIntegritySync` in `tasMdIntegrity.ts` validates TAS.md during `buildIntegrityPayload` without crashing route on partial failures.
* **Step-by-Step Lab Validation:**
  1. Poll `/api/grc/tas-integrity` — verify `sha256Short` in JSON.

---

<a id="governance-001"></a>

### 📰 Feature 46: The Governance Frame Published Briefing Ledger
* **GRC Function ID:** `GOVERNANCE-001`
* **Exact Screen Coordinates:** Canonical public reader at `https://research.ironframegrc.com/briefings/[slug]`; internal preview at `/gf-research/briefings/[slug]`; legacy apex paths `/governance-frame` and `/governance-frame/[slug]` remain on authenticated-adjacent app router with **308** redirect to `/briefings/*` on research hosts. IronBoard mirror feed at `http://127.0.0.1:8082/governance-frame` when IronBoard engine is running locally.
* **Operational Purpose:** Serves chronological institutional governance briefings compiled exclusively from `docs/published-briefings/*.md`. Draft files in `docs/briefing-queue/` remain quarantined and never enter the published feed — mirroring Irongate DMZ publish-before-persist semantics for executive intelligence artifacts.
* **Technical Mechanics:**
  * Next.js App Router: `app/governance-frame/layout.tsx` — standalone slate chrome, `GovernanceFrameBrandLockup`, metadata `robots: { index: false, follow: false }`
  * `app/governance-frame/page.tsx` — `loadPublishedBriefings()` index with cent-register badge from Section II impact metrics
  * `app/governance-frame/[slug]/page.tsx` — `BriefingFrameContent` + `BriefingMarkdown` with sanitized react-markdown compilation
  * `app/lib/governanceFrame/briefingLoader.ts` — `enforceBriefingQuarantine()` warns on non-allowlisted `.md` files in `briefing-queue/` with `[SECURITY AUDIT] Unauthorized compilation attempt blocked for unvetted draft:` prefix
  * `app/lib/governanceFrame/parseBriefingSections.ts` — splits body into zones I (Exposure Vector), II (Calculated Quantitative Impact | Quantitative Context | Quantitative Impact | Economic Context), III (Machine-Rule Technical Translation | What Modern GRC Must Enforce | Architectural Implications | Control-System Requirements), IV (Verification Protocol), V (Sources & Citations)
  * `app/lib/governanceFrame/publishedBriefingSlugRedirects.ts` — `PUBLISHED_BRIEFING_SLUG_REDIRECTS` map; `resolvePublishedBriefingSlug()` normalizes legacy URLs; mirrored in `Ironboard/src/governanceFrame/publishedBriefingSlugRedirects.ts`
  * `app/lib/governanceFrame/publicPublishedBriefingEligibility.ts` — `isPublicPublishedClassification()` excludes internal/staging classifications from RSS and marketing archive
  * `app/lib/governanceFrame/publishedBriefingLedgerCards.ts` — read-only marketing projector; `FORBIDDEN_CARD_CTA` regex strips Path B and sales CTAs from card one-liners
  * `app/lib/governanceFrame/parseCentBigInt.ts` — rejects float and scientific notation cent literals; coerces whole integers to stringified BigInt
  * `app/lib/governanceFrame/sanitizeMarkdown.ts` — strips `<script>`, `javascript:` URIs, and `onerror=` attributes before render
  * IronBoard parallel router: `Ironboard/src/governanceFrame/router.ts`, `briefingScanner.ts`, `renderBlog.ts` — HTML blog renderer for direct IronBoard access
  * `next.config.ts` `outputFileTracingIncludes` ships `./docs/published-briefings/**/*` on Vercel for `/governance-frame` lambdas
  * Published seed briefing: `docs/published-briefings/2026-06-07-staging-boundary-check.md` — provisioning tunnel test exposure **499900** cents, reported ALE delta **0** cents
  * **Quarantine triggers (2026-07-17):** Ops Hub `POST /api/admin/operations-hub/briefings/request`, `POST /api/admin/operations-hub/newsletters/request`, autonomous weekday cron `POST /api/cron/gtm-briefing-queue`, narrate flywheel, and IronBoard board authorship — all stage to `docs/briefing-queue/`; operator **Read** reviews full markdown; **Hold** parks for later; **Resume** clears hold without publish; **Approve** (promote) or **Deny** in `/dashboard/operations?tab=briefings|newsletters` before public feed updates; legacy promoted slugs redirect via **301** to canonical ledger rows
  * `ConditionalAppShell.tsx` excludes governance-frame paths from dashboard AppShell mount — no TopNav bleed
* **Agent Boundary:** **Ironscribe** (Agent 05) briefing structure and export lineage; **Irongate** (Agent 14) markdown sanitization before client render; **Ironlogic** (Agent 4) board federation reads monetization blueprint alongside TAS for strategic context.
* **Step-by-Step Lab Validation:**
  1. Open `http://127.0.0.1:3000/gf-research/briefings` — verify index lists published briefings chronologically with cent-register badges where Section II defines `(¢)` metrics.
  2. Open `/gf-research/briefings/2026-06-07-staging-boundary-check` — verify four-section frame renders without dashboard chrome.
  3. Place `secret-draft.md` in `docs/briefing-queue/` — reload index — verify draft does not appear; server log emits quarantine audit warning.
  4. Start IronBoard on port **8082** — verify startup log `[GOVERNANCE FRAME] Briefing feed at http://127.0.0.1:8082/governance-frame · published=N` where N equals count from `scanPublishedBriefings(resolveDocsRoot())`.
  5. Open legacy slug `/governance-frame/2026-07-15-auto-briefing-tenant-sovereignty` — verify **301** redirect to canonical slug `2026-05-14-connector-count-sovereign-enclaves`.
  6. Run `tests/unit/publishedBriefingSlugRedirects.test.ts`, `tests/unit/governanceFrameBriefingScanner.test.ts`, `tests/unit/governanceFrameSanitize.test.ts`, and `tests/unit/governanceFrameEmail.test.ts` — all pass.

---

<a id="governance-002"></a>

### 💰 Feature 47: Unified Financial Ingress Invariant Bridge
* **GRC Function ID:** `GOVERNANCE-002`
* **Exact Screen Coordinates:** No direct UI — validates cent registers at Governance Frame parse boundary, sales intake API, Stripe checkout fulfillment, and prospect ledger persistence.
* **Operational Purpose:** Guarantees a single whole-integer BigInt cent contract across three ingress surfaces that accept human-readable dollar input at the UI layer but must never persist floats: Governance Frame briefing Section II registers, sales-assisted `/api/register/sales-intake` ALE fields, and Stripe `amountTotalCents` metadata.
* **Technical Mechanics:** `tests/unit/financialIngressInvariant.test.ts` bridges:
  * `parseCentBigInt` — briefing ledger rejects `"49.99"` and `"1110000000.5"` with `Governance Frame cent register must be a whole integer`
  * `parseDollarAleToBigIntCents` — accepts `"$11,100,000.00"` and emits **1110000000** as `bigint`
  * `parseExplicitCentAle` — explicit cent string `"1110000000"` matches dollar-parse output
  * `verifyCanonicalEnterpriseBaseline` — Medshield **1110000000**, Vaultbank **590000000**, Gridcore **470000000** cent targets
  * Round-trip: sales intake BigInt output must pass Governance Frame `parseCentBigInt` without coercion loss
* **Agent Boundary:** **Irontrust** (Agent 3) canonical baseline enforcement; **Irongate** (Agent 14) rejects malformed cent payloads at ingress.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/financialIngressInvariant.test.ts` — all canonical profile dollar inputs resolve to TAS BigInt cents.
  2. POST sales intake with `"$5,900,000.00"` reported ALE — verify `prospects.reported_ale BIGINT` equals **590000000**.
  3. Add briefing metric `"1110000000.5"` — verify `parseCentBigInt` throws before publish.

---

<a id="governance-003"></a>

### 📧 Feature 48: Ironcast Governance Frame Email Newsletter
* **GRC Function ID:** `GOVERNANCE-003`
* **Exact Screen Coordinates:** Backend HTML artifact — `out/governance-frame/newsletters/{slug}.html` after compile; outbound email via Ironcast worker.
* **Operational Purpose:** Converts published Governance Frame briefings into table-based HTML email newsletters with deep links to the public feed origin for executive distribution.
* **Technical Mechanics:** `lib/agents/ironcast/templates/governanceFrameEmail.ts`:
  * `GOVERNANCE_FRAME_FEED_ORIGIN` from `GOVERNANCE_FRAME_PUBLIC_FEED_ORIGIN` env or default `https://research.ironframegrc.com`
  * Email HTML uses table layout, inline styles, no `<button>` elements — Outlook-compatible patterns per Resend email requirements
  * `lib/agents/ironcast/workers/compileNewsletter.ts` writes compiled HTML under `out/governance-frame/newsletters/`
  * Link pattern: `governanceFrameBriefingUrl(slug)` → `{origin}/briefings/{slug}`
* **Agent Boundary:** **Ironcast** outbound communications; **Ironscribe** (Agent 05) content attribution from published briefing frontmatter.
* **Step-by-Step Lab Validation:**
  1. Run newsletter compile worker against published briefing slug — verify HTML output contains feed deep link.
  2. Run `tests/unit/governanceFrameEmail.test.ts` — verify origin URL and slug encoding.

---

<a id="governance-004"></a>

### 📡 Feature 49: Governance Frame RSS Feed Compiler
* **GRC Function ID:** `GOVERNANCE-004`
* **Exact Screen Coordinates:** Generated RSS XML — item links target `governanceFrameBriefingUrl(slug)` on research origin (`/briefings/{slug}`).
* **Operational Purpose:** Publishes machine-readable RSS items for each published briefing so external subscribers and board ingestion pipelines can poll chronological updates without scraping the HTML index.
* **Technical Mechanics:** `scripts/compile-rss.ts` reads published briefings and emits RSS XML with research publication deep links via `governanceFrameBriefingUrl()`. Default link origin aligns with `GOVERNANCE_FRAME_PUBLIC_ORIGIN`. `tests/unit/compileRss.test.ts` validates encoded slug URLs in XML output.
* **Agent Boundary:** **Ironintel** (Agent 16) external feed correlation; content sourced only from published ledger — never `briefing-queue/`.
* **Step-by-Step Lab Validation:**
  1. Run `npx tsx scripts/compile-rss.ts` — verify RSS item link contains `/briefings/` path segment on research origin.
  2. Run `tests/unit/compileRss.test.ts` — all pass.

---

<a id="demo-002"></a>

### 🔒 Feature 50: Demo Mode Production API Isolation Sentinel
* **GRC Function ID:** `DEMO-002`
* **Exact Screen Coordinates:** Invisible client-side fetch interceptor — manifests as thrown error in browser console when demo session calls protected `/api/*` routes.
* **Operational Purpose:** Prevents demo sandbox operators from accidentally writing Kimbot state, resilience intel polls, or tenant-scoped GRC telemetry to production databases while exploring mock command post UI.
* **Technical Mechanics:** `app/utils/apiClient.ts` `applyIronguardToFetch`:
  * When `isDemoModeActive()` returns true and pathname is not `isPublicConstitutionalSentinelPath` or tenant-optional registration path, throws `DEMO_API_BLOCK_MESSAGE`
  * `logIsolationSentinelBlocked({ reasonCode: "DEMO_MODE_ISOLATED", ... })` writes structured isolation log entry
  * `isolationSentinelLog.ts` maps `DEMO_MODE_ISOLATED` to audit string `BLOCKED: DEMO_SANDBOX_ISOLATED`
  * Constitutional sentinel paths remain callable so marketing shell and Governance Frame reader can poll TAS integrity without dashboard session
* **Agent Boundary:** **Ironguard** (Agent 12) client fetch perimeter; complements server-side RLS — does not replace tenant isolation tests.
* **Step-by-Step Lab Validation:**
  1. Initialize demo sandbox via `/register/demo` (redirects to sales contact) or `initializeDemoSandbox()` on approved demo paths.
  2. Navigate to demo command post — open browser devtools network tab — trigger GRC API poll — verify fetch rejected before network dispatch.
  3. Poll `/api/grc/tas-integrity` from same session — verify request succeeds (constitutional sentinel exemption).

---

<a id="market-001"></a>

### 🌍 Feature 51: IronBoard Market Flywheel Multi-Country Target Cockpit
* **GRC Function ID:** `MARKET-001`
* **Exact Screen Coordinates:** IronBoard left rail `#market-flywheel` inside `#left-panel` — below board persona selector on `http://127.0.0.1:8082/`.
* **Operational Purpose:** Stages autonomous Fintech SaaS prospecting campaigns for early-stage companies (5–50 employees) across preset hubs (London, Singapore) and expansion countries (Germany, Australia, Ireland, Canada, United States, France, Netherlands, Switzerland, United Kingdom, New Zealand, India, Japan, UAE). Operators load qualified batches, generate BigInt-grounded outreach copy, and harvest interaction signals to adjust ICP scores.
* **Technical Mechanics:**
  * React component: `Ironboard/src/components/MarketFlywheel.tsx`
  * Legacy inline dashboard: same controls mirrored in `renderDashboard()` HTML with `#target-countries-input`, `#hub-london`, `#hub-singapore`, `#fetch-batch-btn`
  * `POST /api/prospects/trigger` body accepts `{ targetCountries: string[] }` (preferred), `{ regions: string[] }`, or legacy `{ region: string }`
  * `GET /api/prospects?regions=Germany,Australia` and `GET /api/market/prospects` accept comma/pipe-separated region filters
  * `localStorage` key `ironboard_target_countries` persists operator target list across sessions
  * `getActiveHubPayload()` encodes stream field: `LONDON`, `SINGAPORE`, or `GERMANY,AUSTRALIA,...` uppercase join
  * ICP visibility threshold: `ACTIVE_PROSPECT_MIN_SCORE = 100` — sub-threshold rows stored as `dealStage: REJECTED` and excluded from cockpit list
  * Pitch generation calls `generateGroundedPitch(domain)` — outreach cites **BigInt Integrity** value proposition; when `findLatestRegulatoryCatalystForDomain` returns a catalyst, value proposition becomes `{authority} catalyst · {matchedFramework} · BigInt Integrity` and opening hook leads with compliance deadline from Industry Scout
  * Harvest buttons apply `±25` to `aiFitnessScore` and transition deal stage to `QUALIFIED` or `REJECTED`
  * **GTM authenticity gate (2026-06-19):** `verifyAndOptimizeMarketData` runs per region before batch assembly; `isSyntheticExpansionTemplateProspect` detects `{Region} Ledger` (**24** employees), `{Region} Vault` (**18** employees), `-ledger.io` / `-vault.finance` domains — these are **SYNTHETIC_SCAFFOLDING**, never real market research
  * `fetchProspectingBatchForTargets` — expansion countries (non London/Singapore) no longer auto-seed template placeholders; only curated classroom seeds for London/Singapore; other regions rely on `discoverRegionalProspects` live web grounding
  * `buildFlywheelWorkspaceContext` labels each prospect with lineage: `LIVE_WEB_GROUNDING`, `SYNTHETIC_SCAFFOLDING`, or `CURATED_DEMO_SEED`
* **Agent Boundary:** IronBoard commercial plane (port **8082**) — **Ironlogic** (Agent 4) synthesis consumes `buildFlywheelWorkspaceContext`; **Irongate** (Agent 14) sanitizes web-grounded discovery JSON before Prisma upsert; **Ironintel** (Agent 16) regulatory catalyst lookup feeds grounded pitches; no cross-tenant prospect bleed — `marketProspect` domain key is global to board org database.
* **Step-by-Step Lab Validation:**
  1. Open `http://127.0.0.1:8082/` — locate Market Flywheel panel in left rail.
  2. Enter `Germany, Australia, Ireland, Canada` in target countries field — click **Load Prospecting Batch**.
  3. Verify status line shows loaded count — **no** `{Country} Ledger` or `{Country} Vault` synthetic rows for Germany (test: `fetchProspectingBatchForTargets(['Germany'])` must not return template names).
  4. Click **London Hub** shortcut — verify curated London seeds load with `CURATED_DEMO_SEED` lineage.
  5. Select a prospect with regulatory catalyst — verify pitch pane opens with authority/framework hook, not generic marketing copy.
  6. Click **Harvest Signal (+)** — verify `aiFitnessScore` increments by **25**.
  7. Run `Ironboard/src/services/marketIntelligence.test.ts` — verify multi-region merge and authenticity mocks pass.

---

<a id="market-002"></a>

### 🗺️ Feature 52: Market Target Regions Normalization Module
* **GRC Function ID:** `MARKET-002`
* **Exact Screen Coordinates:** No UI — shared library consumed by flywheel UI, board router, query intent, and market intelligence services.
* **Operational Purpose:** Provides canonical country name normalization, alias resolution, activeHub stream encoding/decoding, and query-time country matching so boardroom tool calls and prospect filters stay consistent across London/Singapore legacy keys and multi-country expansion campaigns.
* **Technical Mechanics:** `Ironboard/src/services/marketTargetRegions.ts`:
  * `PRIMARY_HUB_REGIONS`: `['London', 'Singapore']`
  * `KNOWN_TARGET_COUNTRIES`: fourteen expansion markets plus hub aliases
  * `REGION_ALIASES`: maps `uk`, `united kingdom` → `London`; `sg` → `Singapore`; `usa`, `us` → `United States`; etc.
  * `normalizeTargetRegion(input)` — title-case fallback for unknown tokens
  * `parseTargetCountriesInput(raw)` — splits on comma or pipe, deduplicates
  * `parseActiveTargetCountries(activeHub)` — decodes `LONDON`, `SINGAPORE`, or comma-separated uppercase lists
  * `encodeActiveTargetCountries(countries)` — reverse encoder for board stream payloads
  * `matchCountriesInQuery(query)` — substring match against known country list for intent routing
* **Agent Boundary:** **Ironquery** (Agent 15) discovery routing via `inferRegionsFromQuery`; **Ironlogic** (Agent 4) board `planDiscoveryExecution` passes parsed regions to `queryLocalWorkspace`.
* **Step-by-Step Lab Validation:**
  1. Run `Ironboard/src/services/boardroomQueryIntent.test.ts` — verify `inferRegionsFromQuery('hello', 'GERMANY,AUSTRALIA')` equals `['Germany', 'Australia']`.
  2. Run same suite — verify `inferRegionsFromQuery('prospects in Canada', 'LONDON')` equals `['Canada']` (query mention wins over active hub).
  3. Verify `shouldPrefetchProspects('Are there companies in Germany that fit our ICP criteria?')` returns **true**.
  4. Confirm `boardRouter.ts` `planDiscoveryExecution` passes `{ regions: targetCountries }` when multiple countries active.

---

<a id="board-010"></a>

### 🌉 Feature 53: IronBoard Core Telemetry Bridge
* **GRC Function ID:** `BOARD-010`
* **Exact Screen Coordinates:** No UI — server-side bridge invoked at start of every `POST /api/query` on IronBoard port **8082**.
* **Operational Purpose:** Hydrates IronBoard boardroom synthesis with live Ironframe democratic shared context JSON so executive personas ground financial and sustainability assertions in tenant-scoped production cache — never stale static placeholders. Fails closed when Ironframe core is unreachable, preserving unidirectional advisory integrity.
* **Technical Mechanics:** `Ironboard/src/services/coreTelemetryBridge.ts`:
  * `IRONFRAME_SHARED_CONTEXT_PATH` = `/api/board/shared-context`
  * `resolveIronframeCoreOrigin()` — reads `IRONFRAME_CORE_ORIGIN` or `IRONFRAME_MARKETING_ORIGIN`, defaults `http://127.0.0.1:3000`
  * `resolveTelemetryTenantScope()` — prefers `ironframe-tenant` cookie, then request body `tenantId`, then `resolveBoardOrgTenantId()`
  * `buildTelemetryFetchHeaders()` — forwards cookies, sets `x-ironboard-telemetry-bridge: 1`, injects `x-ironframe-host-tenant-uuid` or `x-ironframe-host-tenant-slug`
  * `fetchIronframeSharedContext()` — **12000** ms abort timeout; throws `CoreTelemetryBridgeError` with code `CORE_TELEMETRY_DISCONNECTED`
  * `formatLiveSystemTelemetryBlock()` — wraps JSON with delimiter `[LIVE SYSTEM TELEMETRY - ARCHITECTURE ENFORCED]`
  * Client SSE handler in `index.ts` surfaces **502** when bridge fails before stream opens
* **Financial boundary note:** Shared context JSON contains raw cent integers internally; boardroom **Layer 3 de-classification matrix** forbids emitting those raw values in Governance Frame public copy — operators must cite `financials.display.*Formatted` strings from the hydrated block.
* **Agent Boundary:** **Ironwatch** (Agent 13) telemetry source on Ironframe port **3000**; **Ironlogic** (Agent 4) consumes hydrated JSON; **Ironguard** (Agent 12) tenant headers enforce isolation on bridge fetch.
* **Step-by-Step Lab Validation:**
  1. Run `Ironboard/src/services/coreTelemetryBridge.test.ts` — all five cases pass.
  2. Stop Ironframe — POST boardroom query — verify HTTP **502** `{ error: "CORE_TELEMETRY_DISCONNECTED" }`.
  3. Start Ironframe with valid tenant session — POST query — verify SSE event `coreTelemetryBridge` status `complete` with byte count.
  4. Set `IRONFRAME_CORE_ORIGIN=http://127.0.0.1:3000` when IronBoard runs in split-host dev layout.

---

<a id="governance-005"></a>

### 🛡️ Feature 54: Hardened Governance Layers & De-Classification Matrix
* **GRC Function ID:** `GOVERNANCE-005`
* **Exact Screen Coordinates:** No UI — injected into IronBoard system instruction when live telemetry JSON is present.
* **Operational Purpose:** Enforces six-layer governance posture on every boardroom synthesis turn that receives live Ironframe telemetry: read-only diode, authoritative metric hydration, public briefing de-classification, mandatory Governance Frame triad structure, executive persona financial ratios, and Sources & Citations audit section for human promotion from `docs/briefing-queue/` to `docs/published-briefings/`.
* **Technical Mechanics:** `Ironboard/src/services/boardroomSystemPrompt.ts` `buildHardenedGovernanceLayers(telemetryJsonString)`:
  * **Layer 1 — Unidirectional diode:** Board is READ-ONLY; zero write permissions to port 3000 databases; human operator holds execution keys.
  * **Layer 2 — Live metric hydration:** Injected JSON string is absolute source of truth from Ironframe production cache.
  * **Layer 3 — De-classification matrix:**
    - Currency: never output raw BigInt cent integers in public copy; cite `financials.display.sovereignPool.*.baselineFormatted` and `currentExposureFormatted` verbatim
    - Vulnerability hiding: no raw CVE identifiers or unpatched asset IDs in public briefings
    - Sustainability: cite `financials.display.sustainability.powerUsageFormatted` and `fluidConsumptionFormatted` exactly
  * **Layer 4 — Governance Frame triad:** EXPOSURE VECTOR, IMPACT, REMEDIATION headings from `financials.display.governanceTriadScaffold`
  * **Layer 5 — Executive persona ratios:** CFO/board-bot anchor on sanitized USD; **board-trainer** owns Level 1 user manuals and training tracks under `docs/user-manuals/` and `docs/training/`; **board-writer** owns Level 2 technical corpus under `docs/technical/` — both consume `documentationBrief` only
  * **Layer 6 — Sources & Citations:** mandatory `### V. Sources & Citations` with locators including `docs/README.md`, `docs/user-manuals/{file}.md`, `docs/technical/{file}.md`, `config/route-manifest.v0.1.0-ga-epic17.json`
  * **GTM Market Authenticity Mandate (2026-06-19):** `BOARD_GTM_MARKET_AUTHENTICITY_MANDATE` — synthetic `{Region} Ledger/Vault` rows and `-ledger.io` / `-vault.finance` domains are **SYNTHETIC_SCAFFOLDING**; board must label lineage (`LIVE_WEB_GROUNDING`, `SYNTHETIC_SCAFFOLDING`, `CURATED_DEMO_SEED`); when `polluted=true`, state live web discovery required — never invent company names from memory
  * **Documentation Authorship Mandate:** `BOARD_DOCUMENTATION_AUTHORSHIP_MANDATE` from `dualLocationOutputMatrix.ts` — Trainer/Writer placement targets enforced
* **Agent Boundary:** **Ironscribe** (Agent 05) briefing structure; **Irontrust** (Agent 3) internal BigInt storage vs display separation; **Irongate** (Agent 14) public copy sanitization semantics.
* **Step-by-Step Lab Validation:**
  1. Submit boardroom query with both engines running — inspect assembled system instruction for `[LAYER 1: UNIDIRECTIONAL DIODE POSTURE]` block.
  2. Ask board to draft Governance Frame briefing — verify response uses triad headings and ends with Sources & Citations section.
  3. Verify drafted briefing cites formatted USD strings — not raw **1110000000** cent literals.
  4. Confirm follow-on priority block: "Cite `financials.display` formatted strings verbatim — never recompute currency from raw cent integers."

---

<a id="market-003"></a>

### 🔍 Feature 55: Regional Fintech Prospect Discovery Engine
* **GRC Function ID:** `MARKET-003`
* **Exact Screen Coordinates:** No UI — backend invoked when target country is not London or Singapore preset hub during batch load.
* **Operational Purpose:** Discovers real early-stage Fintech SaaS companies in board-selected expansion countries using Gemini with Google Search grounding, scores them through the ICP tier engine, and upserts into `marketProspect` when fewer than **3** rows exist for that region.
* **Technical Mechanics:** `Ironboard/src/services/marketIntelligence.ts`:
  * `discoverRegionalProspects(region)` — Gemini with Google Search grounding; skips when `listProspects(normalized, false).length >= 3`
  * `verifyAndOptimizeMarketData(region, { operatorTriggered })` — purges synthetic scaffolding, triggers live discovery when authentic count below threshold; invoked in `buildFlywheelWorkspaceContext` and `fetchProspectingBatchForTargets` **before** batch assembly
  * `assessRegionProspectAuthenticity` / `formatProspectLineage` — authenticity audit summary in flywheel context
  * `fetchProspectingBatchForTargets(targets)` — London/Singapore use preset seed batches only when qualified authentic rows absent; expansion countries **never** auto-seed `{Region} Ledger/Vault` templates
  * `calculateTierScore` — region presence **+50**, SOC2/ISO27001 **+50**, SEED/SERIES_A **+100**, compliance hire **+75**
  * `regulatoryCatalystLookup.ts` — `findLatestRegulatoryCatalystForDomain` feeds Industry Scout catalyst block into `generateGroundedPitch`
* **Agent Boundary:** **Irongate** (Agent 14) treats discovered domains as external intel; **Ironintel** (Agent 16) OSINT manifest and catalyst lookup inform discovery prompt criteria and pitch hooks.
* **Step-by-Step Lab Validation:**
  1. Set `GOOGLE_API_KEY` in `Ironboard/.env.local`.
  2. POST `{ "targetCountries": ["Germany"] }` to `/api/prospects/trigger` — verify no synthetic Ledger/Vault rows; live discovery or zero-count honesty.
  3. Run `tests/unit/marketProspectAuthenticity.test.ts` and `tests/unit/discoverRegionalProspects.test.ts` — all pass.
  4. Run `marketIntelligence.test.ts` — verify `fetchProspectingBatchForTargets(['Germany'])` does **not** auto-seed expansion templates.
  5. Confirm sub-threshold accounts (`tierScore < 100`) persist as `dealStage: REJECTED`.

---

<a id="board-011"></a>

### 🔧 Feature 56: Multi-Region Workspace Query Tool Extension
* **GRC Function ID:** `BOARD-011`
* **Exact Screen Coordinates:** IronBoard tool plane — `queryLocalWorkspace` function declaration surfaced in board SSE tool receipts.
* **Operational Purpose:** Allows boardroom discovery to filter active prospects by single country or multi-country arrays when operators stage cross-border GTM campaigns — replacing London/Singapore-only hub filter from prior builds.
* **Technical Mechanics:** `Ironboard/src/services/queryLocalWorkspace.ts`:
  * `QUERY_LOCAL_WORKSPACE_DECLARATION` adds `regions` ARRAY parameter alongside legacy `region` STRING
  * `executeQueryLocalWorkspace` case `active_prospects`: prefers `regions` array when present, else single `region`
  * `boardRouter.ts` `planDiscoveryExecution` passes `{ regions: targetCountries }` when `parseActiveTargetCountries(ctx.activeHub)` returns multiple countries
  * `prefetchBoardroomGroundTruth` in `index.ts` mirrors same region/regions args for SSE prefetch receipts
* **Agent Boundary:** **Ironquery** (Agent 15) tool execution receipts; data sourced from board org Prisma `marketProspect` table.
* **Step-by-Step Lab Validation:**
  1. Ask board "List our London prospects" — verify prefetch SSE shows `region: "London"`.
  2. Set active hub to `GERMANY,AUSTRALIA` — ask flywheel question — verify prefetch shows combined region label or `regions` array in tool args.
  3. Run boardroom query with workspace-only intent — verify `shouldPrefetchWeb` returns **false** (no redundant web grounding).

---


<a id="docs-001"></a>

### 📚 Feature 57: Dual-Location Documentation Corpus Planes
* **GRC Function ID:** `DOCS-001`
* **Exact Screen Coordinates:** No single UI — governs `/docs` (APP_DOCS plane) vs `/governance-frame` (GOVERNANCE_BRIEFINGS plane).
* **Operational Purpose:** Enforces authoritative separation between internal product documentation corpus and external GTM governance briefings — never cross-compile APP_DOCS with GOVERNANCE_BRIEFINGS.
* **Technical Mechanics:** `lib/documentationCorpusPlanes.ts`:
  * `DOCUMENTATION_PLANE_APP_DOCS` — `user-manuals/`, `technical/`, `training/` repository prefixes; reader at `/docs`
  * `DOCUMENTATION_PLANE_GOVERNANCE_BRIEFINGS` — `briefing-queue/`, `published-briefings/`; reader at `/governance-frame/[slug]`
  * `DUAL_LOCATION_OUTPUT_MATRIX` — operational rules, author agents, trigger paths per plane
  * `APP_DOCS_EXECUTE_ENDPOINT` = `POST /api/documentation/execute`
  * board-trainer and board-writer **must never** write to GOVERNANCE_BRIEFINGS plane
* **Agent Boundary:** **Ironscribe** (Agent 05) structure; **Irongate** (Agent 14) plane isolation; **Ironlogic** (Agent 4) board federation.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/documentationCorpusPlanes.test.ts` — verify matrix entries and prefix guards.
  2. Confirm Trainer placement targets exclude `published-briefings/`.
  3. Confirm Writer placement targets exclude `briefing-queue/` promotion without human operator.

---

<a id="docs-002"></a>

### 📖 Feature 58: App Document Store DB Reader
* **GRC Function ID:** `DOCS-002`
* **Exact Screen Coordinates:** `/docs` index and `/docs/[slug]` article view — `DocsChrome`, `DocsSidebar`, `DocsMarkdown`.
* **Operational Purpose:** Serves Level 1 and Level 2 documentation from PostgreSQL `app_documents` table with `readingLevel` indexing — decoupled from static filesystem-only serving.
* **Technical Mechanics:**
  * Prisma `AppDocument` model: `slug`, `title`, `content`, `readingLevel`, `updatedAt`
  * `app/lib/server/appDocumentStore.ts` — `upsertAppDocument`, slug lookup
  * `app/docs/[[...slug]]/page.tsx` — loads from DB; `CompilationIngressPortal` when slug unresolved
  * `lib/appDocumentSlug.ts`, `lib/appDocumentSanitizer.ts` — slug normalization and XSS strip
  * Migration `20260618120000_init_app_documents`
  * `scripts/seed-app-documents.ts` and `prisma/seed-docs.ts` seed corpus
* **Agent Boundary:** Customer service agent grounds on `readingLevel: "LEVEL_1"` rows only; **Ironguard** (Agent 12) tenant perimeter on authenticated doc admin paths.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/appDocumentSlug.test.ts` and `tests/unit/docsContentDecoupling.test.ts`.
  2. Open `/docs` on cloud host without full ingress — verify narrow funnel allows **200**.
  3. Query `app_documents` — confirm `readingLevel` values `LEVEL_1` and `LEVEL_2`.

---

<a id="docs-003"></a>

### ⚙️ Feature 59: Documentation Execute Pipeline
* **GRC Function ID:** `DOCS-003`
* **Exact Screen Coordinates:** No UI — `POST /api/documentation/execute` on Ironframe port **3000**; IronBoard `POST /api/documentation/execute` ingress on port **8082**.
* **Operational Purpose:** Synchronizes Trainer/Writer agent output into `app_documents` with optional filesystem mirror under `docs/` — bearer-gated internal gateway auth.
* **Technical Mechanics:**
  * Ironframe `app/api/documentation/execute/route.ts` — Zod schema (`slug`, `title`, `content`, `readingLevel`); `checkInternalGatewayBearerAuth`
  * `mirrorAppDocumentToFilesystem` — dual-location git-tracked mirror for APP_DOCS plane
  * IronBoard `documentationPipeline.ts`, `trainingCorpusPublisher.ts`, `trainingChapterGenerator.ts`
  * `Ironboard/src/config/dualLocationOutputMatrix.ts` — board-side matrix mirror
  * Workflow: `GET /api/board/shared-context` → `documentationBrief` → `POST /api/documentation/execute`
* **Agent Boundary:** **board-trainer** (Level 1 + training tracks); **board-writer** (Level 2 technical); temperature **0.0** on all automated nodes.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/documentationBrief.test.ts` and `tests/unit/trainingCorpusPlacement.test.ts`.
  2. POST valid payload with internal gateway Bearer — verify `{ ok: true, status: "synchronized" }`.
  3. POST without Bearer — verify **401** from `internalGatewayUnauthorizedResponse`.
  4. Run `Ironboard/tests/trainingCorpus.test.ts` — training corpus publisher paths pass.

---

<a id="docs-004"></a>

### 📡 Feature 60: Documentation Brief One-Way Ingress
* **GRC Function ID:** `DOCS-004`
* **Exact Screen Coordinates:** No UI — embedded in `GET /api/board/shared-context` JSON payload as `documentationBrief`.
* **Operational Purpose:** Hands IronBoard Trainer and Writer personas a serialized brief with corpus planes, dual-location matrix, placement targets, and live telemetry mirror — **ONE_WAY_IRONFRAME_TO_BOARD** with zero write-back.
* **Technical Mechanics:** `app/lib/board/documentationBrief.ts` `buildIronframeDocumentationBrief(contextCore)`:
  * `corpusPlanes.appDocs` and `corpusPlanes.governanceBriefings` with author agent lists
  * `platformFacts.baselineTenantsCents` — Medshield **1110000000**, Vaultbank **590000000**, Gridcore **470000000** as strings
  * `fullAccess` bundle from `documentationCorpusIngress.ts`
  * `Ironboard/src/agents/knowledge.ts` expanded — Trainer/Writer consume brief; forbid authoring without it
* **Agent Boundary:** **Ironwatch** (Agent 13) telemetry mirror; **Ironlogic** (Agent 4) board synthesis guardrails.
* **Step-by-Step Lab Validation:**
  1. Poll shared-context with valid tenant session — verify `documentationBrief.communicationDirection` equals `ONE_WAY_IRONFRAME_TO_BOARD`.
  2. Start IronBoard query without brief in context — verify knowledge agent refuses doc authoring per mandate.
  3. Run `tests/unit/documentationBrief.test.ts` — all pass.

---

<a id="sales-001"></a>

### 💼 Feature 61: Public Sales Agent Portal
* **GRC Function ID:** `SALES-001`
* **Exact Screen Coordinates:** `/sales-agent-portal` — `MarketingSalesPortalTrigger` on marketing homepage opens `SalesAgentSlideOver`.
* **Operational Purpose:** Provides unauthenticated prospect-facing lead intake isolated to the **prospect pool tenant** — no customer environment bleed and **no public LLM pitch rendering**.
* **Technical Mechanics:**
  * `app/api/agents/sales/route.ts` — public POST; returns `{ status: "QUEUED", interactionId, message }` immediately after CRM logging
  * `app/lib/server/salesAgentConsoleCore.ts` — Gemini synthesis at temperature **0.0** runs server-side only; output stored as `[PENDING SALES DRAFT APPROVAL]` in CRM
  * Prospect pool tenant UUID from `IRONFRAME_PROSPECT_POOL_TENANT_UUID` or Medshield fallback; CRM contact upsert uses `fullName` field
  * `isPublicProspectOnboardingPath` includes `/sales-agent-portal` and `/api/agents/sales` for quarantine funnel bypass
  * `scripts/smoke-test-sales.mjs` — sales agent smoke validation
* **Agent Boundary:** **Ironguard** (Agent 12) prospect pool isolation; **Ironlogic** (Agent 4) synthesis; zero authenticated tenant context required; human operator dispatch via **HITL-001**.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/agentPerimeter.test.ts` — verify prospect pool tenant binding and QUEUED response (no `pitch` field).
  2. Open `/sales-agent-portal` on cloud preview without full ingress — verify **200** (narrow funnel).
  3. POST to `/api/agents/sales` — verify CRM interaction summary contains `[PENDING SALES DRAFT APPROVAL]`.
  4. Run `scripts/smoke-test-sales.mjs` — smoke pass.

---

<a id="support-001"></a>

### 🎧 Feature 62: In-Tenant Support Envelope & Customer Service API
* **GRC Function ID:** `SUPPORT-001`
* **Exact Screen Coordinates:**
  * TopNav **Support** button — upper-right toolline beside Trainer trigger (`InTenantSupportTopNavTrigger`)
  * Right-side drawer `#in-tenant-support-drawer` — 420px max width overlay (`InTenantSupportDrawer`)
  * Ticket form `data-testid="in-tenant-support-modal"` (`InTenantSupportModal`)
  * Context panel `data-testid="in-tenant-support-context-panel"` (`InTenantSupportContextPanel`)
  * Standalone route `/dashboard/support` — instructional redirect shell embedding same modal
  * APIs: `GET /api/support/in-tenant-context`, `POST /api/support/in-tenant-ticket`, `POST /api/agents/customer-service` (legacy chat ingress retained with telemetry enrichment)
* **Operational Purpose:** Delivers **Request engineering help** as a context-aware, tenant-scoped support ticket system with automatic forensic telemetry attachment. Operators select operational urgency, Golden Path objective, and optional notes; the system captures billing state, export scope readiness, ALE baseline (BigInt cents as string), Ironguard violation counts, and active route context before dispatching to CRM as `[PENDING DRAFT APPROVAL]` interactions. ROUTINE urgency may trigger LEVEL_1–grounded Gemini synthesis (`temperature: 0.0`) as proposed reply text; AUDIT_BLOCKER and DATA_INTEGRITY escalate for direct engineering triage without live agent reply in the API response body.
* **Technical Mechanics:**
  * **Drawer store:** `app/store/inTenantSupportDrawerStore.ts` — Zustand state for `isOpen`, `presetUrgency`, `presetSurface`; `open({ urgency, surface })`, `close()`, `toggle()`
  * **Framework context:** `resolveSupportFrameworkContext(pathname)` maps routes to module keys — `/exports` → `IRONQUERY_ANALYST_EXPORT`, `/integrity` → `INTEGRITY_HUB`, `/get-started` → `OPERATOR_ONBOARDING`, `/compliance` → `COMPLIANCE_FRAMEWORKS`, `/evidence` → `EVIDENCE_VAULT`, `/dashboard/support` → `SUPPORT_CONSOLE`, `/` and `/dashboard/*` → `COMMAND_POST`, default → `GLOBAL_WORKSPACE`
  * **Objective mapping:** `supportIntentObjectives.ts` — ten structured objectives (`WORKSPACE_ACTIVATION`, `ONBOARDING_PROFILE`, `INTEGRITY_REVIEW`, `ANALYST_EXPORT`, `BILLING_ENTITLEMENT`, `TENANT_ACCESS`, `COMPLIANCE_MAPPING`, `EVIDENCE_VAULT`, `TRAINING_DOCUMENTATION`, `OTHER`); `resolveDefaultSupportObjective(frameworkContext)` pre-selects from route; `OTHER` requires free-text notes
  * **Telemetry builder:** `buildInTenantSupportTelemetry` in `inTenantSupportTelemetry.ts` — parallel Prisma reads for tenant (`ale_baseline` as BigInt → stringified cents), `resolveIronqueryExportScope`, `tenantBilling.status`, company count, operator roles, 24h `ironguardViolation` count, 24h `systemHealthLog` diagnostic abort count (`DIAGNOSTIC_FETCH_ABORT_SERVICE_KEY`); `exportEntitled` true only when billing status equals `TENANT_BILLING_STATUS.ACTIVE`
  * **Context API:** `GET /api/support/in-tenant-context?surface=&path=` — `assertAuthenticatedIronguardTenantOr403`; returns `InTenantSupportTelemetry` JSON with `Cache-Control: no-store`
  * **Ticket API:** `POST /api/support/in-tenant-ticket` — validates via `parseInTenantSupportTicketInput`; enforces telemetry requirement for `AUDIT_BLOCKER` and `DATA_INTEGRITY`; `dispatchInTenantSupportTicket` → `logInTenantSupportTicket` → CRM `ironboardCrmInteraction` channel `SYSTEM_AGENT`
  * **Customer service route enhancement:** `POST /api/agents/customer-service` accepts optional `context: { surface, path }`; attaches telemetry to `logPendingSupportConsoleDraft`; response includes `telemetryCaptured: boolean`
  * **CRM formatting:** `formatInTenantSupportTelemetryForCrm` embeds forensic block with `ALE=${aleBaselineCents}` cent string, export scope, billing, Ironguard 24h count
  * **Types:** `app/types/inTenantSupportTelemetry.ts` — urgency enum, objective enum, telemetry envelope schema
* **Agent Boundary:** **Ironguard** (Agent 12) tenant perimeter on all ingress paths; **Ironwatch** (Agent 13) Ironguard violation and diagnostic abort counts in telemetry; **Ironquery** (Agent 15) export scope via `resolveIronqueryExportScope`; **Irontrust** (Agent 3) ALE baseline as BigInt cents in telemetry (display string only in authenticated envelope); **Ironscribe** (Agent 05) LEVEL_1 doc grounding for ROUTINE synthesis; dispatch via **HITL-001**.
* **Step-by-Step Lab Validation:**
  1. Sign in as GRC_MANAGER on `http://vaultbank.lvh.me:3000/integrity` — click TopNav **Support** — verify drawer slides in from right with title **Request engineering help**.
  2. Expand **Attached diagnostics** — verify context panel shows tenant slug, billing chip, export scope chip, company profile chip, and **ALE baseline (cents)** as whole integer string (for Vaultbank seed: **590000000**).
  3. Select urgency **DATA_INTEGRITY**, uncheck telemetry attachment — submit — verify HTTP **400** requiring diagnostic attachment.
  4. Re-check telemetry, select objective **ANALYST_EXPORT**, submit — verify success message **Secure support ticket dispatched** and CRM interaction with forensic telemetry block.
  5. Navigate to `/exports` — open support drawer — verify framework pre-selects **Generate analyst export** objective.
  6. POST to `/api/agents/customer-service` with `{ message, context: { surface: "test", path: "/integrity" } }` — verify `telemetryCaptured: true` in response.
  7. Run `tests/unit/inTenantSupportModal.test.ts`, `tests/unit/inTenantSupportTelemetry.test.ts` — framework mapping, ticket parsing, telemetry build pass.
  8. Confirm guest users and auth public paths (`/login`) do not render TopNav Support trigger.

---

<a id="auth-009"></a>

### 🎫 Feature 63: Workspace Invitation Token Gate
* **GRC Function ID:** `AUTH-009`
* **Exact Screen Coordinates:** `/register/[token]` — workspace invitation activation page; admin mint action.
* **Operational Purpose:** Requires valid workspace invitation token before corporate tenant provisioning — prevents unauthorized tenant creation during Phase 1 sales-assisted onboarding.
* **Technical Mechanics:**
  * Prisma `TenantWorkspaceInvitation` — `tokenHash`, `email`, `tenantSlug`, `status` (ACTIVE, CONSUMED, REVOKED), `expiresAt`
  * `app/lib/auth/workspaceInvitationCore.ts` — `validateWorkspaceInvitation`, `getWorkspaceInvitationForRegistration`
  * `corporateTenantProvisionCore.ts` — invitation gate before tenant create
  * `app/actions/admin/mintWorkspaceInvitation.ts` — GLOBAL_ADMIN mint path
  * `workspaceInvitationActivationCore.ts` — activation on token consume
  * Migration `20260618000000_crm_contact_metadata_system_agent`
* **Agent Boundary:** **Ironguard** (Agent 12) identity; **Ironwatch** (Agent 13) audit on consume.
* **Step-by-Step Lab Validation:**
  1. Attempt corporate provision without invitation token — verify gate rejection.
  2. Mint invitation as GLOBAL_ADMIN — open `/register/{token}` — complete activation.
  3. Re-use consumed token — verify **CONSUMED** status blocks re-entry.

---

<a id="trust-001"></a>

### 🛡️ Feature 64: Trust Center Procurement Plane
* **GRC Function ID:** `TRUST-001`
* **Exact Screen Coordinates:** `/trust` index; `/trust/dpa`; `/trust/subprocessors`; `/trust/data-residency` — `TrustProcurementDocument.tsx`.
* **Operational Purpose:** Surfaces procurement-ready legal artifacts (DPA, subprocessors list, data residency statement) for enterprise buyers with BigInt cent references in liability exhibits.
* **Technical Mechanics:**
  * `app/(dashboard)/trust/*` pages inside dashboard route group
  * `procurement.ts` legal artifacts — ALE baseline references as BigInt integer cents (Medshield **1110000000**, Vaultbank **590000000**, Gridcore **470000000**, Defense **1600000000**)
  * Requires authenticated dashboard session — not in narrow public funnel
* **Agent Boundary:** **Ironscribe** (Agent 05) immutable legal version lineage; **Irontrust** (Agent 3) financial exhibit formatting.
* **Step-by-Step Lab Validation:**
  1. Sign in as GRC_MANAGER — navigate to `/trust/dpa` — verify document renders.
  2. Verify ALE exhibits cite whole integer cent strings — no float dollars in persistence paths.
  3. Attempt `/trust` on cloud host without full ingress — verify **403** quarantine (private workspace).

---

<a id="arch-001"></a>

### 🏰 Feature 65: Gateway Shield Architecture Test
* **GRC Function ID:** `ARCH-001`
* **Exact Screen Coordinates:** No UI — CI gate `tests/architecture/gatewayShield.test.ts`.
* **Operational Purpose:** Scans every `app/api/**/route.ts` that imports Prisma and requires Irongate DMZ marker presence — prevents raw database ingress without sanitization guards.
* **Technical Mechanics:**
  * `IRONGATE_DMZ_MARKERS` — `assertIronguardApiTenantOr403`, `sanitizeThreatIngressPayload`, `checkCronBearerAuth`, `assertTenantFeatureEntitled`, etc.
  * `EXEMPT_ROUTE_SUFFIXES` — webhooks, billing webhook, auth callbacks, internal cron, platform-admin-gate
  * Fails CI when Prisma-importing route lacks marker and is not exempt
* **Agent Boundary:** **Irongate** (Agent 14) DMZ enforcement at architecture layer.
* **Step-by-Step Lab Validation:**
  1. Run `npm run test -- tests/architecture/gatewayShield.test.ts` — zero violations.
  2. Add new Prisma API route without DMZ marker — verify CI failure lists file path.

---

<a id="billing-002"></a>

### 💳 Feature 66: Billing Webhook Dual Path
* **GRC Function ID:** `BILLING-002`
* **Exact Screen Coordinates:** No UI — `POST /api/webhooks/stripe` and `POST /api/billing/webhook`.
* **Operational Purpose:** Separates Stripe instant-checkout provisioning (`checkout.session.completed`) from recurring billing activation (`payment_intent.succeeded`) with independent webhook secrets and operator audit identities.
* **Technical Mechanics:** `config/stripe.ts`:
  * `STRIPE_WEBHOOK_PATH` = `/api/webhooks/stripe`; `STRIPE_BILLING_WEBHOOK_PATH` = `/api/billing/webhook`
  * `STRIPE_INSTANT_CHECKOUT_OPERATOR_ID` and `STRIPE_PAYMENT_INTENT_OPERATOR_ID`
  * `resolveStripeCredentialMode()` — `STRIPE_CREDENTIAL_MODE=test|live`
  * `app/api/billing/webhook/route.ts` — billing activation path
  * `parsePaymentIntent.ts` — payment intent metadata BigInt cent extraction
  * Both paths in `STRIPE_WEBHOOK_PATHS` — bypass deployment quarantine
* **Agent Boundary:** **Irontrust** (Agent 3) BigInt `amountTotalCents`; **Ironwatch** (Agent 13) audit operator IDs.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/stripeConfig.test.ts` — credential mode and dual secret resolution pass.
  2. Forward `payment_intent.succeeded` to `/api/billing/webhook` — verify `TenantBilling.status ACTIVE`.
  3. Run `tests/unit/stripeCheckoutParse.test.ts` — BigInt cent parsing unchanged.

---

<a id="nav-003"></a>

### 🧭 Feature 67: Role Route Consolidation (Dashboard Group)
* **GRC Function ID:** `NAV-003`
* **Exact Screen Coordinates:** `/dashboard/cfo`, `/dashboard/ciso`, `/dashboard/board`, `/dashboard/audit`, `/dashboard/legal`, `/dashboard/ops`, `/dashboard/product`, `/dashboard/insurance`, `/dashboard/itsm`, `/dashboard/cro` — formerly under `app/roles/*`.
* **Operational Purpose:** Consolidates role-specific dashboard surfaces under `app/(dashboard)/dashboard/*` route group with shared `DashboardCommandCenterLayout` chrome — eliminates duplicate layout trees.
* **Technical Mechanics:**
  * Deleted: `app/roles/*` entire tree
  * Added: `app/(dashboard)/dashboard/[role]/page.tsx` pattern
  * `/config` redirected to `/settings/config`
  * `grcRouteMatch.ts` `isDashboardRouteGroupPath` updated — no `/roles` prefix
  * Tenant topology/logs stubs removed (`app/gridcore/logs`, `app/medshield/topology`, etc.)
* **Agent Boundary:** **Ironcore** (Agent 1) orchestration shell unchanged per role.
* **Step-by-Step Lab Validation:**
  1. Navigate to `/dashboard/cfo` as authenticated operator — verify role dashboard renders with TopNav.
  2. Attempt legacy `/roles/cfo` — verify **404**.
  3. Navigate to `/settings/config` — verify config surface (formerly `/config`).

---

<a id="hitl-001"></a>

### ✅ Feature 68: Unified Human-in-the-Loop Approval Desk
* **GRC Function ID:** `HITL-001`
* **Exact Screen Coordinates:** `/dashboard/admin/approvals` — tri-track admin UI with `?kind=SALES|SUPPORT|CUSTOMER_SUCCESS|ALL`; `GET/POST /api/admin/approvals` API; Ops Hub overview quick links to filtered queues.
* **Operational Purpose:** Aggregates all pending agent outputs (`draftKind: "SALES" | "SUPPORT" | "CUSTOMER_SUCCESS"`) for **GLOBAL_ADMIN** review before Resend email dispatch or Twilio/Textbelt SMS dispatch — one desk, three tracks with hue-coded cards (amber sales outreach, emerald support replies, violet customer success advisories). Tier inference from contact metadata (Gridcore, Vaultbank, Medshield baseline alignment) applies to sales drafts only.
* **Technical Mechanics:** `app/lib/approvalDraftKinds.ts` — shared kind labels, filter parsing (`CS` alias → `CUSTOMER_SUCCESS`), `approvalsHref()`, card/badge/banner class helpers.
  * `app/lib/server/approvalQueueCore.ts`:
  * Support tag: `[PENDING DRAFT APPROVAL]` · Sales tag: `[PENDING SALES DRAFT APPROVAL]`
  * Dispatch tags: `[DISPATCHED SUPPORT COURIER]` · `[DISPATCHED SALES COURIER]` · purge: `[PURGED DRAFT]`
  * `fetchPendingApprovalDrafts` — unified queue query; `parsePendingDraftSummary` handles both tag formats
  * `isSalesSmsDraft` — detects SMS channel drafts for DISPATCH path branching
  * `app/api/admin/approvals/[id]/route.ts` — DISPATCH / PURGE:
    * SMS path: `normalizeE164Phone(contact.phone)` required; `sendOutboundSms` via `resolveSmsProvider()` (Twilio or Textbelt); returns `channel: SMS`, `provider`, `messageSid`
    * Email path: `sendOutboundEmail` (Ironboard Resend transport); returns `channel: EMAIL`, `emailId`
  * `canUsePlatformAdminTools` — requires `UserRole.GLOBAL_ADMIN` (distinct from Ironguard tenant scope on SUPPORT-001)
  * `AdminApprovalDashboardClient.tsx` — `Suspense` wrapper; kind filter chips; sort order SALES → SUPPORT → CUSTOMER_SUCCESS; editable `proposedReply` textarea; dispatch button label reflects selected kind meta (`Approve & dispatch Sales outreach`, etc.)
  * `operationsHubCore.ts` — `snapshot.approvals.byKind` counts for overview tiles
* **Agent Boundary:** **Ironwatch** (Agent 13) audit on dispatch; human operator holds execution keys.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/approvalQueueCore.test.ts` — tier inference, sales parse, and draft kind inference pass.
  2. Queue sales, support, and CS drafts — open `/dashboard/admin/approvals?kind=SALES` — verify only SALES rows visible with amber chrome.
  3. Switch to **All** — verify counts match Ops Hub overview tiles.
  4. DISPATCH approved reply — verify correct dispatched tag replaces pending tag.

---

<a id="board-012"></a>

### 🏛️ Feature 69: Founding Agent LLM Module Refactor
* **GRC Function ID:** `BOARD-012`
* **Exact Screen Coordinates:** IronBoard boardroom — CEO, CFO, CCO, Legal founding personas on port **8082**.
* **Operational Purpose:** Centralizes founding-agent Gemini calls in `boardAgentLlm.ts` with temperature **0.0** — CEO, CFO, Compliance, and Legal personas now produce LLM assessments via `generateBoardAgentAssessment` instead of static length/temperature log strings.
* **Technical Mechanics:**
  * `Ironboard/src/agents/boardAgentLlm.ts` — shared `GoogleGenAI` wrapper; `generateBoardAgentAssessment({ model, roleLabel, stateSummary })`
  * `Ironboard/src/agents/founding.ts` — `formatBoardStateSummary` includes `financialProjectionsCents`, last three executive log lines, departmental approvals, and role-specific focus string; CFO path calls `assertWholeIntegerCents` before assessment
  * `Ironboard/src/state.ts` — `ironframeDocumentationBrief` annotation field for one-way brief JSON from shared-context
  * `Ironboard/src/services/email/` — Resend email package (`resend` **^6.14.0**) for board outbound
  * `queryLocalWorkspace.ts` — `stringifyWorkspaceBigIntFields` prevents JSON serialization drift on CRM BigInt columns
  * `Ironboard/vitest.config.ts` — includes `tests/**/*.test.ts` for package-level integration suites
* **Agent Boundary:** **Ironlogic** (Agent 4) persona routing; **Irontrust** (Agent 3) BigInt stringify and `assertWholeIntegerCents` at CFO boundary.
* **Step-by-Step Lab Validation:**
  1. Run `Ironboard/tests/agentValidation.test.ts` and `Ironboard/tests/orchestratorPipeline.test.ts` — founding and documentation artifact paths pass.
  2. Run executive documentation command — verify `documentationArtifacts` includes trainer and writer slug outputs.
  3. Inspect boardroom SSE — verify BigInt fields arrive as strings in tool receipts.
  4. Mock `@google/genai` with class constructor pattern per `.cursorrules` — Vitest must not crash on arrow-function mocks.

---

<a id="carbon-002"></a>

### 🌿 Feature 70: Ironbloom Physical Threat Ingestion Telemetry
* **GRC Function ID:** `CARBON-002`
* **Exact Screen Coordinates:** No direct UI — `recordSustainabilityImpact` server action triggered on threat RESOLVED state.
* **Operational Purpose:** Extracts kWh physical units from `ThreatEvent.ingestionDetails` for carbon mitigated value calculation — rejects monetary-only payloads per Mandate 3.
* **Technical Mechanics:**
  * `parseThreatIngestionTelemetry` in `ironbloomDashboardTelemetry.ts`
  * `buildCarbonTraceFromStream` — `mitigatedValueCents` as **BigInt**
  * `app/lib/ironbloom/productionCarbonLedger.ts` — production ledger updates
  * `app/lib/ironbloom/tenantPhysicalTelemetry.ts` — tenant-scoped physical unit aggregation
  * Idempotent upsert per `threatId`
* **Agent Boundary:** **Ironbloom** (Agent 17) exclusive sustainability scoring; **Irongate** (Agent 14) rejects non-physical ingestion.
* **Step-by-Step Lab Validation:**
  1. Run `lib/sustainability/ironbloomDashboardTelemetry.test.ts` — kWh parse and cent output pass.
  2. Resolve threat with kWh in `ingestionDetails` — verify `mitigated_value_cents BIGINT` row.
  3. Resolve threat with monetary-only payload — verify `no_physical_telemetry` reason.

---

<a id="admin-002"></a>

### 🚀 Feature 71: Admin Onboarding Deployments Panel
* **GRC Function ID:** `ADMIN-002`
* **Exact Screen Coordinates:** `/admin/onboarding` — `AdminOnboardingDashboardHeader`, `AdminOnboardingDeployments`, and `#onboarding-controls` `CorporateOnboardingClient` section inside dashboard route group.
* **Operational Purpose:** Gives GLOBAL_ADMIN operators a supervisor command plane for B2B tenant provisioning, deployment posture visibility, invitation token minting, and corporate operator invites — billing inline activation removed from client (Stripe webhook path owns activation).
* **Technical Mechanics:**
  * `app/lib/server/adminOnboardingDeployments.ts` — `fetchTenantDeploymentRows()` deployment snapshot
  * `AdminOnboardingDashboardHeader.tsx` — displays `deploymentCount` with dark cockpit grid chrome (`bg-[#020617]`)
  * `AdminOnboardingDeployments.tsx` — surfaces quarantine state, ingress flags, workspace URLs per provisioned tenant
  * `CorporateOnboardingClient.tsx` — mint invitation displays secure activation URL `/register/{token}`; provision and invite forms retained; inline **Activate billing** button and provisioned-workspaces list **removed** from client (deployments panel owns workspace inventory)
  * `assertGlobalAdminForOnboarding` in `middleware.ts` — hard GLOBAL_ADMIN gate before page render
  * Page metadata: **Onboarding & Tenant Deployments | Ironframe Admin**
* **Agent Boundary:** **Ironguard** (Agent 12) GLOBAL_ADMIN RBAC; **Ironlock** (Agent 6) quarantine state display; **Ironwatch** (Agent 13) provision audit receipts.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/adminOnboardingDeployments.test.ts` — snapshot fields pass.
  2. Sign in as non-admin — verify `/admin/onboarding` redirect before deployments panel loads.
  3. Sign in as GLOBAL_ADMIN — verify deployments panel and provisioning controls render.
  4. Mint invitation — verify `/register/{token}` URL displayed in mint result panel.
  5. Confirm billing activation occurs via `/api/billing/webhook` — not manual client button.

---

<a id="sim-003"></a>

### 🎯 Feature 72: Threat Validate BigInt ActiveRisk Extraction
* **GRC Function ID:** `SIM-003`
* **Exact Screen Coordinates:** No UI — `POST /api/threats/validate` API route.
* **Operational Purpose:** Validates pipeline card IDs against `ActiveRisk` and `ThreatEvent` tables — extracts numeric ActiveRisk id from card patterns (`center-risk-1`, `risk-1`, bare integer) as BigInt-safe string for ghost card reconciliation.
* **Technical Mechanics:** `app/api/threats/validate/route.ts`:
  * `parseActiveRiskId(cardId)` — regex extract numeric id
  * `assertIronguardApiTenantOr403` tenant guard
  * Returns `{ validIds: string[] }` subset existing in DB
  * Separates CUID threat event ids from numeric ActiveRisk ids
* **Agent Boundary:** **Ironguard** (Agent 12) tenant scope; **Irontrust** (Agent 3) numeric id integrity.
* **Step-by-Step Lab Validation:**
  1. POST `{ ids: ["center-risk-1", "risk-42", "ghost-999"] }` — verify only existing ids in `validIds`.
  2. POST without tenant session — verify **403**.
  3. Confirm ActiveRisk numeric ids handled as strings — never float conversion.

---

<a id="ingress-002"></a>

### 📥 Feature 73: Compilation Ingress Portal
* **GRC Function ID:** `INGRESS-002`
* **Exact Screen Coordinates:** `/docs/[slug]` — renders when slug not found in DB or filesystem; `CompilationIngressPortal.tsx`.
* **Operational Purpose:** Provides operator-visible staging surface when documentation slug is unresolved — triggers async compilation ingress without exposing draft queue content publicly.
* **Technical Mechanics:** `app/docs/[[...slug]]/CompilationIngressPortal.tsx` — client portal with `targetSlug` prop; pairs with `documentationPipeline.ts` on IronBoard. `docs/error.tsx` and `docs/[[...slug]]/not-found.tsx` fail closed without dashboard chrome bleed.
* **Agent Boundary:** **Irongate** (Agent 14) — unresolved slugs do not leak briefing-queue drafts.
* **Step-by-Step Lab Validation:**
  1. Navigate to `/docs/nonexistent-slug-xyz` — verify CompilationIngressPortal renders (not dashboard 500).
  2. Confirm portal does not display `briefing-queue/` draft content.
  3. After `POST /api/documentation/execute` upsert — reload slug — verify article renders from DB.

---

<a id="training-001"></a>

### 📸 Feature 74: Training Screenshot Corpus Assets
* **GRC Function ID:** `TRAINING-001`
* **Exact Screen Coordinates:** Embedded in Level 1 and Level 2 training markdown served from `/docs` — asset paths under `/docs/training/assets/`.
* **Operational Purpose:** Supplies twenty-four canonical UI capture placeholders for Trainer corpus publisher chapters — enables visual milestone anchoring in classroom sandbox curriculum without inventing UI labels.
* **Technical Mechanics:** Binary PNG assets added in today's delta under `public/docs/training/assets/`:
  * Level 1: `level-1-01-grc-foundations.png` through `level-1-12-student-certification.png`
  * Level 2: `level-2-01-architecture-topology.png` through `level-2-12-practitioner-certification.png` including `level-2-11-bigint-financial-integrity.png`
  * Capture pipeline scripts: `scripts/capture-training-screenshots.mjs`, `scripts/ensure-training-screenshot-placeholders.mjs`, `scripts/training-screenshot-session.mjs`
  * `config/training-corpus-manifest.json` — chapter-to-asset binding for `trainingCorpusPublisher.ts`
* **Agent Boundary:** **board-trainer** (IronBoard) owns embedding; **Ironscribe** (Agent 05) citation lineage for source-file paths in generated markdown.
* **Step-by-Step Lab Validation:**
  1. Run `Ironboard/tests/trainingCorpus.test.ts` — publisher references asset paths.
  2. Open `/docs/training/` chapter — verify PNG assets resolve with **200** on local host.
  3. Confirm Trainer draft cites `source-file:` paths — never invented UI label strings.

---

<a id="market-004"></a>

### 🔬 Feature 75: GTM Market Prospect Authenticity Gate
* **GRC Function ID:** `MARKET-004`
* **Exact Screen Coordinates:** No UI — backend gate in `marketProspectAuthenticity.ts` invoked before flywheel batch load and boardroom prefetch.
* **Operational Purpose:** Prevents synthetic expansion scaffolding (`{Region} Ledger`, `{Region} Vault`, `-ledger.io`, `-vault.finance`) from polluting board GTM intelligence — board personas must never cite template rows as real market research or customer proof points.
* **Technical Mechanics:**
  * `verifyAndOptimizeMarketData(region, { operatorTriggered })` — assesses authenticity, purges synthetic rows, triggers `discoverRegionalProspects` when below threshold
  * `isSyntheticExpansionTemplateProspect({ companyName, domain, employeeCount })` — detects Ledger (**24** emp) and Vault (**18** emp) patterns
  * `assessRegionProspectAuthenticity` — returns `authenticCount`, `syntheticCount`, `polluted`, `meetsAuthenticThreshold`
  * `formatProspectLineage` — emits `LIVE_WEB_GROUNDING`, `SYNTHETIC_SCAFFOLDING`, or `CURATED_DEMO_SEED`
  * `BOARD_GTM_MARKET_AUTHENTICITY_MANDATE` in `boardroomSystemPrompt.ts` — constitutional boardroom directive
* **Agent Boundary:** **Ironlogic** (Agent 4) board synthesis; **Ironintel** (Agent 16) live discovery backfill; **Irongate** (Agent 14) external intel sanitization on discovered JSON.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/marketProspectAuthenticity.test.ts` — synthetic detection and purge pass.
  2. Load Germany batch — verify zero `{Germany} Ledger` rows after authenticity gate.
  3. Ask boardroom "Who are our potential customers in Germany?" — verify response labels lineage or states live discovery in progress — never cites scaffolding as proof.

---

<a id="ux-006"></a>

### 👆 Feature 76: WCAG Touch Target CSS Layer
* **GRC Function ID:** `UX-006`
* **Exact Screen Coordinates:** Global — applies to `.ironframe-app-shell`, `.ironframe-public-landing`, and `.ironframe-docs-shell` interactive controls.
* **Operational Purpose:** Enforces minimum **44px** (2.75rem) touch targets on coarse pointer devices per `.cursorrules` dark cockpit aesthetic mandate — eliminates double-tap zoom delay on mobile lab devices.
* **Technical Mechanics:** `app/globals.css` additions:
  * `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` on buttons and rounded anchors
  * `:active` scale **0.98** feedback on press (excludes docs article inline links)
  * `@media (pointer: coarse)` — `min-height: 2.75rem` on public landing, docs shell, and app shell buttons (excludes `data-compact-touch` and chip-bar controls)
* **Agent Boundary:** Presentation layer only — no financial or tenant scope side effects.
* **Step-by-Step Lab Validation:**
  1. Open marketing homepage on mobile viewport — inspect button computed height ≥ **44px**.
  2. Tap docs shell navigation control — verify no 300ms zoom delay (`touch-action: manipulation`).
  3. Confirm article body inline links excluded from min-height rule — prose links remain natural height.

---

<a id="intel-002"></a>

### 📅 Feature 77: BOD 26-04 KEV Deadline Tracker (June 19 Operational)
* **GRC Function ID:** `INTEL-002`
* **Exact Screen Coordinates:** IronBoard Strategic Intel RAG chunks — no dedicated countdown UI chip on Ironframe port **3000**.
* **Operational Purpose:** Tracks live CISA KEV remediation deadlines under BOD 26-04 four-variable risk matrix for operational date **2026-06-19** — FCEB and private-sector tier-1 patch windows.
* **Technical Mechanics:** Manifest chunk `osint-03-joomla-litespeed` in `grcProfessionalResearch.manifest.json`:
  * **CVE-2026-48907** (Joomla JCE, CVSS 9.8) — KEV added June 16; FCEB remediation deadline **June 18, 2026** (elapsed — verify patch or assume breach)
  * **CVE-2026-54420** (LiteSpeed cPanel symlink escalation) — KEV added June 16; FCEB remediation deadline **June 19, 2026** (due today — Technology and Public Sector profiles verify CloudLinux/CageFS deployments)
  * Chunk `osint-01-bod-2604` — four-variable matrix: asset exposure, KEV status, exploit automation, technical impact → **3**-, **14**-, or **60**-day tiers; forensic triage before patch on tier-1
* **Financial boundary note:** Industry profile `peerAleBaselineCents` in manifest are sector peer ALE anchors (Finance **1800000000**, Defense **2500000000**, etc.) — distinct from Ironframe seed tenant baselines (Medshield **1110000000**, etc.) — all **BigInt integer cents**, never floats.
* **Agent Boundary:** **Ironintel** (Agent 16) policy monitor; **Ironwatch** (Agent 13) KEV deadline correlation; **Irontech** (Agent 19) repair priority when component health below **50** percent on affected perimeter controls.
* **Step-by-Step Lab Validation:**
  1. Ingest `ironintel-osint-2026-06-18-live` manifest — verify Joomla and LiteSpeed chunks present.
  2. Ask boardroom "What KEV deadlines apply today?" — verify LiteSpeed CVE-2026-54420 June 19 citation with BOD 26-04 context.
  3. Confirm board copy cites formatted exposure strings — not raw **890000000** cent literals from manifest risk metrics.

---

<a id="support-002"></a>

### 🎫 Feature 78: Workspace Settings — ALE Baseline & Company Profile
* **GRC Function ID:** `SETTINGS-001`
* **Exact Screen Coordinates:** `/settings/workspace` — full-page form inside dashboard chrome; profile menu link **Workspace settings** with Settings icon in `TopNavUserProfileMenu`.
* **Operational Purpose:** Provides GRC_MANAGER and CISO operators a dedicated surface to review and update tenant ALE baseline (BigInt integer cents) and primary company profile (name, sector, departments) without traversing the Get Started onboarding wizard. Read-only operators see amber banner stating edits require **GRC Manager** or **CISO** role.
* **Technical Mechanics:**
  * **Server page:** `app/(dashboard)/settings/workspace/page.tsx` — `ensureDashboardTenantSession`, `canEditWorkspaceProfile`, parallel Prisma fetch for `tenant.ale_baseline`, primary `company` (non-test, ordered by id asc)
  * **Draft dollars helper:** `centsToDraftDollars(cents: bigint)` — integer division for dollars and remainder for cents fraction; never uses float arithmetic for persistence
  * **Client:** `WorkspaceSettingsClient.tsx` — amber-bordered ALE section, cyan-bordered company profile section; saves via server actions with `formatCentsToAccountingUSD(BigInt(result.aleBaselineCents))` success message
  * **Server actions:** `app/actions/settings/workspaceProfileSettings.ts`:
    * `updateWorkspaceAleBaselineSettingsAction` — delegates to `updateWorkspaceAleBaselineAction`; audit `WORKSPACE_ALE_BASELINE_UPDATED` with summary `ale_baseline_cents=${result.aleBaselineCents}`; revalidates `/settings/workspace` and `/get-started`
    * `syncCompanyProfileSettingsAction` — delegates to `syncCompanyProfileAction`; audit `WORKSPACE_COMPANY_PROFILE_UPDATED`; revalidates both paths
    * `resolveWorkspaceSettingsEditorAccess` — returns `{ canEdit, roleBlocked }` for client gating
  * **RBAC:** `workspaceProfileEditorAccess.ts` — `WORKSPACE_PROFILE_EDITOR_ROLES`: `[GRC_MANAGER, CISO]`; `canEditWorkspaceProfile(userId, tenantUuid)` queries `userRoleAssignment`
  * **Audit:** `logWorkspaceProfileAudit.ts` — production `auditLogCreateLoose` with `isSimulation: false`
* **Agent Boundary:** **Irontrust** (Agent 3) ALE baseline BigInt persistence; **Ironguard** (Agent 12) tenant-scoped cookie resolution via `getScopedTenantUuidFromCookies`; **Ironwatch** (Agent 13) audit log writes.
* **Step-by-Step Lab Validation:**
  1. Sign in as ANALYST — navigate to `/settings/workspace` — verify read-only amber banner; Save buttons disabled.
  2. Sign in as GRC_MANAGER — enter ALE draft `5900000.00` for Vaultbank workspace — save — verify success message shows accounting USD and database `ale_baseline` equals **590000000** cents.
  3. Update company name and sector — save — verify `AuditLog` action `WORKSPACE_COMPANY_PROFILE_UPDATED`.
  4. Run `tests/unit/workspaceProfileEditorAccess.test.ts` — GRC_MANAGER and CISO allowed; missing assignment returns false.
  5. Confirm link at page footer opens `/get-started` for onboarding checklists.

---

<a id="auth-010"></a>

### 🔓 Feature 79: Hardened Session Logout & Workspace Cookie Clearing
* **GRC Function ID:** `AUTH-010`
* **Exact Screen Coordinates:** Profile menu **Sign out** action; server route `/api/auth/session-logout`; invisible middleware cookie clears on auth public paths.
* **Operational Purpose:** Terminates Supabase session and clears all workspace scope cookies (`ironframe-tenant`, `ironframe-simulation-mode`) through server-side Set-Cookie on navigation — preventing post-logout tenant cookie resurrection on subdomain `/login` hosts and eliminating race conditions from client-only Supabase signOut with timeout budget.
* **Technical Mechanics:**
  * **Client logout:** `performClientSessionLogout()` — synchronous; calls `resetAllStoresAndTenantScopeCache()`, `clearWorkspaceScopeCookiesClient()` for both workspace cookies with Secure flag on HTTPS, then `window.location.replace("/api/auth/session-logout?next=%2Flogin")`
  * **Server core:** `sessionLogoutCore.ts` — `buildSessionLogoutResponse(request, mode)`:
    * `resolveSessionLogoutNextPath` — allows same-origin relative paths starting with `/`; rejects `//` open redirects
    * Supabase server client `signOut()` with cookie adapter
    * `stampWorkspaceCookieClears(response)` and `clearSupabaseAuthCookiesFromRequest` for all `sb-*` and workspace scope cookies
    * GET mode → HTTP **303** redirect; POST mode → JSON `{ ok: true }`
  * **Route:** `app/api/auth/session-logout/route.ts` — GET redirect, POST JSON
  * **Cookie constants:** `workspaceSessionCookies.ts` — `IRONFRAME_TENANT_COOKIE`, `IRONFRAME_SIMULATION_MODE_COOKIE`, `SESSION_LOGOUT_PATH`, `WORKSPACE_SCOPE_COOKIE_NAMES`, `workspaceCookieClearOptions()`, `stampWorkspaceCookieClears`
  * **Middleware:** `finalizeMiddlewareResponse` accepts `authUser` parameter; when unauthenticated on auth public path OR redirect target includes `/login`, calls `stampWorkspaceCookieClears`; session-logout route bypasses `updateSession` to avoid re-hydrating session mid-logout
  * **Subdomain fix:** `applySubdomainTenancy` only realigns stale cross-tenant cookies when cookie **exists** — absent cookie after logout on `{slug}.lvh.me/login` is not re-stamped with host UUID
  * **Ironguard guard:** `persistShadowPlaneTenantCookie` skips write when `isPublicConstitutionalSentinelPath(pathname)`; adds `secure: true` in production
* **Agent Boundary:** **Ironguard** (Agent 12) tenant cookie lifecycle; **Ironlock** (Agent 6) simulation mode cookie clear on logout.
* **Step-by-Step Lab Validation:**
  1. Sign in on `http://bwc.lvh.me:3000/integrity` — sign out via profile menu — verify redirect lands on `/login` without `ironframe-tenant` cookie present.
  2. Inspect network — first navigation hits `/api/auth/session-logout?next=%2Flogin` with Set-Cookie clears.
  3. Run `tests/unit/performClientSessionLogout.test.ts` — workspace cookies cleared client-side; replace called with session-logout URL.
  4. Run `tests/unit/sessionLogoutCore.test.ts` — unsafe `next=//evil.example` rejected to `/login`.
  5. Run `tests/unit/middlewareSubdomainTenancy.test.ts` — post-logout `/login` without cookie does not receive host tenant stamp.

---

<a id="integrity-004"></a>

### 🛡️ Feature 80: Constitutional Integrity Overlay Suppression Gate
* **GRC Function ID:** `INTEGRITY-004`
* **Exact Screen Coordinates:** Invisible React effect in `ConstitutionalIntegrityProvider` — no standalone panel.
* **Operational Purpose:** Prevents constitutional integrity polling (`refreshIntegrity` interval and `ironframe-tenant-changed` listener) from firing when the integrity overlay is suppressed — avoiding redundant API traffic and state churn during orientation reader and other overlay-suppressed cockpit modes.
* **Technical Mechanics:** `ConstitutionalIntegrityProvider.tsx` — integrity refresh `useEffect` early-returns when `overlaySuppressed` is true; dependency array includes `[overlaySuppressed, refreshIntegrity]`.
* **Agent Boundary:** **Ironwatch** (Agent 13) telemetry polling discipline; no financial side effects.
* **Step-by-Step Lab Validation:**
  1. Open Get Started orientation reader with inline doc active — verify constitutional integrity fetch interval does not restart on tenant change events while overlay suppressed.
  2. Exit orientation mode — verify integrity polling resumes on standard cockpit routes.

---

<a id="ops-003"></a>

### 🏢 Feature 81: Operations Hub GTM Briefing & Newsletter Approval Desk
* **GRC Function ID:** `OPS-003`
* **Exact Screen Coordinates:** `/dashboard/operations?tab=briefings` and `?tab=newsletters` — quarantined draft lists with per-row **Read**, **Approve**, **Hold**, and **Deny** buttons; manual request textareas above each desk; full markdown draft reader modal overlay.
* **Operational Purpose:** Gives perimeter workforce operators a human gate between autonomous GTM authorship and public Governance Frame / Ironcast publication. Weekday cron and manual requests stage markdown into `docs/briefing-queue/` only — nothing reaches `https://research.ironframegrc.com/briefings/[slug]` until operator **Approve** (promote). **GF publication desk** (`POST /api/admin/operations-hub/briefings/desk-run`) authors or reviews quarantined drafts and writes `.desk-reviews` sidecars — never promotes. **Hold** parks drafts for later reading without deciding. **Resume** clears hold metadata and returns drafts to the active Approve/Deny desk without publishing. **Deny** removes drafts from active desks and records durable Postgres denial receipts. Already-promoted slugs are hidden from the active desk even if queue files remain on disk.
* **Technical Mechanics:**
  * **Client:** `OperationsHubClient.tsx` — **GF publication desk** author form (`deskTitle`, `deskPrompt`) and per-row **Run desk review** button; `DeskReviewBadges` renders sidecar status; `heldBriefingQueueDrafts` and `activeBriefingQueueDrafts` memo partitions; `handleResumeDraft` posts resume route; `handleReadDraft` loads markdown via draft API into `draftPreview` modal with inline **Resume** when on hold; `handleHoldDraft` posts hold route; `handlePromote` calls `POST /api/admin/operations-hub/briefings/promote`; `handleDenyDraft` confirms then calls `POST /api/admin/operations-hub/briefings/deny`; `handleBriefingRequest` and `handleNewsletterRequest` post operator prompts with `overwrite: true` and `tenantSlug: ironframe-sandbox`; `selectQueueDraft()` syncs `?draft=` URL param and scrolls promote panel into view
  * **Desk-run route:** `POST /api/admin/operations-hub/briefings/desk-run` — `mode: author|review`; author requires `requestPrompt` min **40** chars; review requires `filename`; binds `tenantId`/`tenantSlug` from Postgres tenant lookup; returns `readyForHumanOperator` advisory flag
  * **Desk core:** `governanceFramePublicationDeskCore.ts` — quarantine-only orchestration; gf-researcher system prompt enforces vendor-neutral institutional voice; product-boundary pass calls `scanForbiddenPublicSalesClaims()`; operator pass cites `GF_PUBLICATION_DESK_HUMAN_PUBLISHER.role`
  * **Desk review package:** `lib/governanceFrame/publicationDesk/` — `agents.ts`, `deskReviewIo.ts`, `heuristics.ts`, `types.ts`, `index.ts`
  * **Hold core:** `holdBriefingQueueDraftCore.ts` — upserts `briefing_queue_holds` via raw SQL `ON CONFLICT` update; `resumeBriefingQueueDraftCore` clears hold row; `listHeldBriefingFilenames` annotates snapshot rows with `onHold: true`; `clearBriefingQueueHold` on promote/deny
  * **Resume route:** `POST /api/admin/operations-hub/briefings/resume` — `requirePerimeterWorkforceOperator`; returns `{ message: "Resumed {filename} — back on the active Approve / Deny desk." }`
  * **Read core:** `readBriefingQueueDraftCore.ts` — returns `{ filename, title, markdown, validationOk }` for modal reader
  * **Deny core:** `denyBriefingQueueDraftCore.ts` — upserts `briefing_queue_denials` via raw SQL; calls `clearBriefingQueueHold`; best-effort `fs.unlinkSync` on queue file; `listDeniedBriefingFilenames` hides denied rows from hub snapshot
  * **Promote core:** `promoteBriefingDraftCore.ts` — clears hold before publish path; best-effort `removeQueueDraftBestEffort()` after successful promote; returns `removedFromQueue` flag; filters published slugs from hub snapshot via Postgres lookup
  * **Stage core:** `stageBriefingQueueDraftCore.ts` — validates `DRAFT_FILENAME_PATTERN`; rejects `isNonPromotableBriefingDraft`; writes queue dir without publishing
  * **Request cores:** `requestGovernanceBriefingSeriesCore.ts` and `requestGovernanceNewsletterSeriesCore.ts` — IronBoard federation authorship into queue filenames
  * **Prisma:** `BriefingQueueDenial` maps `briefing_queue_denials`; `BriefingQueueHold` maps `briefing_queue_holds` (migration `20260715154500_briefing_queue_holds`)
  * **Dual-location matrix:** `BOARD_DUAL_LOCATION_OUTPUT_MATRIX` documents triggers: Ops Hub request routes, autonomous GTM cron, narrate flywheel — all quarantine-first
* **Agent Boundary:** **Ironscribe** (Agent 05) briefing structure; **Irongate** (Agent 14) validation before promote; **Ironlogic** (Agent 4) board federation for authorship; human operator holds promote/deny/hold keys per Mandates 9 and 11.
* **Step-by-Step Lab Validation:**
  1. Enable `GTM_BRIEFING_QUEUE_CRON_ENABLED=true` — POST `/api/cron/gtm-briefing-queue` with Bearer `IRONFRAME_CRON_SECRET` — verify `*-draft-auto-briefing-*` and `*-draft-auto-newsletter-*` appear in Ops Hub quarantine list only.
  2. Submit **Author via GF desk** with title + 40+ char research brief — verify `{date}-draft-gf-desk-{slug}.md` staged and `.desk-reviews` sidecar written with gf-researcher advisory finding.
  3. Click **Run desk review** on existing draft — verify sidecar updates with verifier/editor/regulatory/product-boundary/operator findings; `readyForHumanOperator` reflects checklist state.
  4. Click **Read** on a draft — verify modal shows full markdown, validation badge, and desk review badges.
  5. Click **Hold** — confirm `briefing_queue_holds` row created, **on hold** badge visible, draft moves to held partition.
  6. Click **Resume** on held draft — confirm hold cleared, draft returns to active Approve/Deny desk without publish.
  7. Click **Deny** on a held draft — confirm hold cleared, `briefing_queue_denials` row created, draft disappears from desk.
  8. Click **Approve** — verify promotion message cites research origin `/briefings/{slug}` (or API `message` field) and published count increments; confirm queue file removed when `removedFromQueue: true`.
  9. Run `tests/unit/denyBriefingQueueDraftCore.test.ts` and `tests/unit/stageBriefingQueueDraftCore.test.ts` — all pass.

---

<a id="ops-004"></a>

### 🎙️ Feature 82: Ops Worker Chat Panel (Unified Perimeter Conversation + PTT)
* **GRC Function ID:** `OPS-004`
* **Exact Screen Coordinates:** Mounted at top of every loaded Operations Hub tab inside `OperationsHubClient` — worker selector dropdown, transcript box, text prompt, **Ask** button, PTT microphone selector, and **PTT** record button.
* **Operational Purpose:** Provides a single Ops Hub conversation surface to query IronBoard boardroom or any perimeter poll worker (Ironleads, SalesTeam, IronSuccessTeam, IronSupportTeam) without opening five separate portal iframes. Push-to-talk transcribes operator speech via Gemini STT and submits as a chat message; assistant replies optionally speak via Web Speech API with per-worker voice pitch/rate.
* **Technical Mechanics:**
  * **Component:** `app/components/operations/OpsWorkerChatPanel.tsx`
  * **Targets:** `OPS_CHAT_TARGETS` from `opsWorkerIds.ts` — `ironboard`, `ironleads`, `salesteam`, `success-team`, `support-team`
  * **Chat API:** `POST /api/admin/operations-hub/worker-chat` via `opsWorkerChatCore.ts` — routes to IronBoard query proxy or worker-specific poll handlers; injects `buildAntiHallucinationMandate()` and per-target spine mandates from `boardBinding.ts`; history capped at **8** prior turns
  * **Voice API:** `POST /api/admin/operations-hub/worker-voice/transcribe` — accepts `audioBase64` and `mimeType`; minimum hold **700** ms; minimum blob **256** bytes
  * **Speech output:** `opsWorkerSpeech.ts` — dedicated module sharing IronBoard `ironboard_voice_speed` / `ironboard_voice_pitch` keys; `speakOpsWorkerReply`, `bindOpsWorkerSpeechVoices`, `cancelOpsWorkerSpeech`, `prepareOpsWorkerSpeechText` (720-char speak cap); `OPS_UNIFIED_VOICE_ROLE = CEO` — Jenny/Aria shared pack, never David/Mark by worker id; mute/rate/pitch localStorage
  * **Fetch helper:** `fetchOpsPortalJson.ts` — unified error extraction for ops portal JSON responses
  * **Persistence:** `localStorage` keys `ironframe-ops-worker-chat-target` and `ironframe-ops-worker-ptt-mic-device-id`
* **Agent Boundary:** Perimeter workforce operators only (`requirePerimeterWorkforceOperator`); IronBoard path uses boardroom SSE proxy; poll workers remain `/health` + `/poll` services on Cloud Run.
* **Step-by-Step Lab Validation:**
  1. Open `/dashboard/operations` as perimeter operator — verify Ops Worker Chat panel renders above tab content.
  2. Select **SalesTeam** — submit text prompt — verify assistant reply appears in transcript.
  3. Hold PTT at least one second — verify transcribed text submits and status shows truncated transcript preview.
  4. Toggle voice mute — verify `speakOpsWorkerReply` does not invoke `speechSynthesis`.
  5. Run `tests/unit/fetchOpsPortalJson.test.ts` and `tests/unit/opsWorkerSpeech.test.ts` — all pass.

---

<a id="cron-003"></a>

### 📅 Feature 83: Autonomous GTM Briefing Queue Cron (Weekday Quarantine Authorship)
* **GRC Function ID:** `CRON-003`
* **Exact Screen Coordinates:** No UI — Vercel cron `0 4 * * 1-5` UTC; Windows Task `\Ironframe GTM Briefing Queue` via `bin/cron_gtm_briefing_queue.ps1` and `scripts/cron_gtm_briefing_queue_scheduled.ps1`; registered in `scripts/register-nightly-cron-tasks.ps1`.
* **Operational Purpose:** On weekdays, autonomously authors one rotating GTM briefing draft and matching Ironcast newsletter draft into `docs/briefing-queue/` for operator review. Never promotes, syndicates, or emails the public. Complements the 03:00 Writer narrate cron — this cron produces **quarantined** GTM artifacts only.
* **Technical Mechanics:**
  * **Route:** `app/api/cron/gtm-briefing-queue/route.ts` — Bearer `IRONFRAME_CRON_SECRET`; `maxDuration: 300`; logs `[CRON_ACTIVATION_TRACE]` and `[CRON_HEALTH_TELEMETRY]`
  * **Core:** `autonomousGtmBriefingQueueCore.ts` — `AUTONOMOUS_GTM_TOPICS` (**5** rotating themes: heatmap-vs-dollars, tenant-sovereignty, design-partner-cohort, audit-evidence-pain, vanta-complement); `pickAutonomousGtmTopic` by UTC day-of-year; filenames `{date}-draft-auto-briefing-{topicId}.md` and `{date}-draft-auto-newsletter-{topicId}.md`
  * **Tenant frontmatter:** `GTM_BRIEFING_QUEUE_TENANT_SLUG` (default `ironframe-sandbox`); `IRONFRAME_LOCAL_CORE_ORIGIN` for Windows cron hitting local core
  * **Disable:** `GTM_BRIEFING_QUEUE_CRON_ENABLED=false`
  * **Middleware:** `isTokenGatedApiIngressPath` includes `/api/cron/gtm-briefing-queue` — cloud quarantine passthrough
  * **Artifact:** `cronJobArtifact` row with `agentName: gtm-briefing-queue-autonomous` and `publishState: QUARANTINED_AWAITING_OPERATOR`
  * **vercel.json:** cron schedule entry added for weekday execution
* **Agent Boundary:** **Irontally** (Agent 5) narrate alignment; **Ironscribe** (Agent 05) draft structure; **Ironlogic** (Agent 4) GTM topic prompts; operator HITL required for any public surface.
* **Financial note:** Autonomous topic `design-partner-cohort` references Path B **499900** cents in prompt text — internal authoring only; public copy uses formatted strings after operator promote sanitization.
* **Step-by-Step Lab Validation:**
  1. POST `/api/cron/gtm-briefing-queue` with valid Bearer on local core — verify JSON `{ ok: true, staged: [...] }`.
  2. Re-run same day — verify `skippedExisting` contains both filenames (no overwrite without manual request `overwrite: true`).
  3. Set `GTM_BRIEFING_QUEUE_CRON_ENABLED=false` — verify `{ skipped: true, topicId: "disabled" }`.
  4. Confirm `/governance-frame` index unchanged until operator promotes from Ops Hub.
  5. Run `tests/unit/autonomousGtmBriefingQueue.test.ts` — topic pick and filename builders pass.

---

<a id="sales-002"></a>

### 📨 Feature 84: Design Partner Outbound Draftsman (Email + SMS, Path B Locked)
* **GRC Function ID:** `SALES-002`
* **Exact Screen Coordinates:** No direct UI — SalesTeam poll worker produces drafts; surfaced in `/dashboard/admin/approvals` HITL desk.
* **Operational Purpose:** Generates problem-led PROSPECT email and short SMS drafts aligned to the single paid Path B co-builder program — never freemium, never demo-first CTA, never auto-send.
* **Technical Mechanics:**
  * `SalesTeam/src/agents/outboundDraftsman.ts` — `draftOutboundMessage(prospect, channel)` with `buildProductFactsBlurb()` from `lib/ironframeProductKnowledge/productFacts.ts` appended to email context:
    * EMAIL: opens with trigger + compliance hook question; cites `formatCentsDisplay(prospect.valueCents)` whole-cent narrative; states Path B **$4999** and 90-day window; CTA **10–15 minute workflow review**
    * SMS: under **320** characters; Path B price; YES/stop reply pattern
  * `designPartnerLaunchMandate.ts` — re-exports `buildSalesTeamLaunchMandate` from `lib/ironframeProductKnowledge/boardBinding.ts`; Path B display via spine `formatPathBUsd()`
  * `beachheadPrompts.ts` — imports `BEACHHEAD_SECTORS`, `resolveBeachheadSector`, `BEACHHEAD_SUMMARIES` from `lib/ironframeProductKnowledge/beachheads.ts`
  * `validateStoryBrandDraft` — StoryBrand coherence gate on body text
  * IronBoard static context mirrors mandate via `DESIGN_PARTNER_LAUNCH_BRIEFING`
* **Agent Boundary:** SalesTeam perimeter worker (Cloud Run); **Ironlogic** (Agent 4) synthesis at temperature **0.0**; HITL **DISPATCH** on Ironframe core only.
* **Step-by-Step Lab Validation:**
  1. Run `SalesTeam/tests/outboundDraftsman.test.ts` — email contains decision-maker language, `$4999`, workflow review; SMS under 320 chars.
  2. Poll SalesTeam worker — verify draft lands in approvals queue with `[PENDING SALES DRAFT APPROVAL]` tag.
  3. Confirm draft never cites medshield/vaultbank/gridcore as customers.

---

<a id="leads-001"></a>

### 🎯 Feature 85: Ironleads SUSPECT Ingress Dedupe, Location Enrichment & Clone Purge
* **GRC Function ID:** `LEADS-001`
* **Exact Screen Coordinates:** Ironleads ops portal suspect list — website and address columns; `/dashboard/operations/ironleads/suspects/[contactId]` forensic report page; ingress API response codes on dedupe replay.
* **Operational Purpose:** Prevents duplicate SUSPECT CRM rows when Industry Scout or manual harvest replays the same company/domain identity — reducing operator noise in Ironleads portal and approvals pipeline. Enriches each suspect with normalized website URL and optional brick-and-mortar address line for operator triage before SalesTeam PROSPECT handoff. Exposes blocker-coded forensic reports explaining why contacts remain SUSPECT rather than PROSPECT.
* **Technical Mechanics:**
  * `ironleadsSuspectIdentity.ts` — `normalizeSuspectCompanyKey`, `normalizeAccountDomain` (shared test-importable helpers)
  * `ironleadsSuspectLocation.ts` — `websiteUrlFromDomainOrUrl()`, `resolveSuspectLocationFields()`, postal address formatting
  * `ironleadsSuspectReportCore.ts` — `buildIronleadsSuspectReport()`, `buildSuspectHoldBlockers()`, `looksLikeOsintTitleNoise()`
  * `ironleadsIngressCore.ts` — ingress dedupe returns existing contact/deal with `deduped: true`; API responds `PERIMETER_INGRESS_DEDUPE` HTTP **200** (not **201**); `mergeWebsiteIntoMetadata()` on create and deduped update
  * `dedupeIronleadsSuspectsCore.ts` — `collapseSuspectRowsByCompany` for display; `purgeDuplicateSuspectContacts` removes clone rows keeping highest `priorityScore` / newest `createdAt`
  * `scripts/purge-duplicate-suspects.ts` — operator CLI for historical cleanup
  * Ironleads portal and Ops Hub CRM clients render `websiteUrl`, `addressLine`, and link to suspect report route via `operationsTeamPortalsCore.ts` and `operationsHubCore.ts`
* **Agent Boundary:** **Irongate** (Agent 14) perimeter ingress; Ironleads worker (Cloud Run poll); CRM scoped by `IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG` (required in Vercel Production — no medshield fallback when `VERCEL_ENV=production`).
* **Financial note:** `priorityScore` is an integer ICP qualification tier — not USD cents. Vaultbank sample prospect **590000000** cents appears only in SalesTeam outbound copy after PROSPECT promotion, not on SUSPECT list rows.
* **Step-by-Step Lab Validation:**
  1. POST duplicate suspect to `/api/v1/ingress/ironleads` — verify HTTP **200** and `deduped: true`.
  2. Run `tests/unit/ironleadsIngressDedupe.test.ts` — identity key normalization passes.
  3. Inspect suspect row — verify `websiteUrl` derives from `accountDomain` when metadata absent.
  4. Open `/dashboard/operations/ironleads/suspects/{contactId}` — verify blockers list and channel-readiness flags.
  5. Run `tests/unit/ironleadsSuspectLocation.test.ts` and `tests/unit/ironleadsSuspectReportCore.test.ts` — normalization and blocker matrix pass.
  6. Run `scripts/purge-duplicate-suspects.ts` in dev — verify `removedContacts` count logged.
  7. Open Ironleads ops portal — verify one row per company name in SUSPECT list.

---

<a id="board-013"></a>

### 🔑 Feature 86: IronBoard Gemini Credential Health & Stream Retry Hardening
* **GRC Function ID:** `BOARD-013`
* **Exact Screen Coordinates:** IronBoard console `#status` line and `/health` readiness on port **8082**; ops-portal ironboard-health API proxy.
* **Operational Purpose:** Prevents stuck **Streaming…** boardroom UI states, rate-limit 429 loops, and Gemini 3 tool-round failures when `thoughtSignature` is stripped from model parts — especially under ops-portal iframe embed on Cloud Run.
* **Technical Mechanics:**
  * `geminiCredentialHealth.ts` — `buildIronboardReadiness()` shape-checks `GOOGLE_API_KEY` (length **30–64**, no `@` email contamination, prefers `AIza` prefix)
  * `geminiRetry.ts` — `withGeminiRateLimitRetry` max **4** attempts; `classifyGeminiStreamFault` for operator-facing status
  * `Ironboard/src/index.ts` boardroom stream:
    * `BOARDROOM_STREAM_ROUND_TIMEOUT_MS = 55000`
    * `BOARDROOM_WEB_PREFETCH_TIMEOUT_MS = 25000`
    * `BOARDROOM_GRC_PREFETCH_TIMEOUT_MS = 25000`
    * GRC region prefetch capped at **2** regions per query
    * Gemini 3 combined mode only when `needsWeb` — avoids stalling after workspace prefetch
    * `SKIP_THOUGHT_SIGNATURE = skip_thought_signature_validator` on synthetic functionCall parts
    * `modelPartsForToolHistory` preserves full model parts including `thoughtSignature`
  * Deploy workflow `deploy-perimeter-workers.yml` — refuses Cloud Run deploy when `GOOGLE_API_KEY` fails shape check; injects `IRONFRAME_CORE_ORIGIN`, `OPERATIONS_*_URL` peer resolution for ironboard worker
  * `safeStorageGet` / `safeStorageSet` — iframe `SecurityError` on localStorage does not abort Query binding
* **Agent Boundary:** IronBoard commercial plane (port **8082**); **Ironwatch** (Agent 13) health telemetry via `ironboard-health` route.
* **Step-by-Step Lab Validation:**
  1. Run `Ironboard/src/lib/geminiCredentialHealth.test.ts` and `geminiRetry.test.ts` — all pass.
  2. Embed IronBoard via `/dashboard/operations/ironboard` — submit Query — verify SSE completes within **55** seconds or surfaces timeout error in `#status`.
  3. Deploy ironboard worker with malformed API key — verify GitHub Action fails shape check before Cloud Run update.
  4. Run `tests/e2e/ironboardOpsPortalProduction.spec.ts` — ops portal Query smoke passes.

---

<a id="gtm-001"></a>

### 📣 Feature 87: Design Partner Launch Briefing (Static Context Federation)
* **GRC Function ID:** `GTM-001`
* **Exact Screen Coordinates:** No UI — injected into every IronBoard persona system prompt and perimeter worker knowledge corpora at startup.
* **Operational Purpose:** Locks all board and perimeter agents to a single authoritative design-partner commercial narrative — preventing freemium invention, demo-slug customer fabrication, or nonexistent SalesTeam GTM Settings UI references.
* **Technical Mechanics:**
  * `Ironboard/src/config/designPartnerLaunchBriefing.ts` — `DESIGN_PARTNER_LAUNCH_BRIEFING` imports `DESIGN_PARTNER_PATH_B_CENTS`, `formatPathBUsd`, `formatPlannedGaCommandUsd`, `BEACHHEAD_SECTORS`, `WORKFLOW_REVIEW_CTA_MINUTES` from `lib/ironframeProductKnowledge/`
  * `Ironboard/src/staticContext.ts` — `buildProductKnowledgeBinding()` federates spine into board startup bundle alongside TAS, monetization blueprint, and sales-enablement docs (`pricing-and-packaging.md`, `competitive-pricing-map.md`, `message-constitution.md`)
  * `SalesTeam/src/config/designPartnerLaunchMandate.ts` — re-exports `buildSalesTeamLaunchMandate` from `boardBinding.ts`; no local Path B literals
  * `SalesTeam/src/config/beachheadPrompts.ts` — imports beachhead sector resolution from spine
  * `Ironleads/src/knowledge/leadGenCorpus.ts`, `SuccessTeam/src/knowledge/customerSuccessCorpus.ts`, `SupportTeam/src/knowledge/supportCorpus.ts` — import `DESIGN_PARTNER_PATH_B_USD` / `formatPathBUsd` from spine
  * `lib/ironframeProductKnowledge/syncEngine.ts` — fingerprint, mirror sync, stale literal scan, blast-radius resolution
  * Human canonical docs: `docs/sales/design-partner-workforce-briefing.md`, `docs/sales-enablement/message-constitution.md`, `docs/ops/design-partner-docs-sync.md`, `docs/user-manuals/design-partner-operator-packet.md`, `docs/training/LEVEL1-PARTNER-INDEX.md`
  * `prisma/seed-docs.ts` — seeds design-partner operator packet, partner index, pilot-vs-preview, get-started-workspace-setup, audit-exports as file-backed `app_documents` masters with `assertOperatorPostAuthMarkdown` gate
* **Agent Boundary:** All **19** agents receive message lock via static context and spine consumers; **Ironlogic** (Agent 4) board synthesis; perimeter workers Ironleads/SalesTeam/SuccessTeam/SupportTeam.
* **Financial lock:** Path B **499900** cents (`DESIGN_PARTNER_PATH_B_CENTS`); planned GA Command **3500000** cents/yr (`PLANNED_GA_COMMAND_CENTS`); planned GA Growth **7500000** cents/yr (`PLANNED_GA_GROWTH_CENTS`) — BigInt persistence paths unchanged from Mandate 1.
* **Step-by-Step Lab Validation:**
  1. Restart IronBoard — verify startup log loads **11** markdown federation files including message-constitution.
  2. Ask board-sales-lead about design partners — verify response cites paid Path B, not free pilot.
  3. Run `tests/unit/designPartnerDocumentationPacket.test.ts` and `tests/unit/onboardingContentPolicy.test.ts` — partner packet policy passes.
  4. Run `npx tsx prisma/seed-docs.ts` — verify `design-partner-operator-packet` slug exists in `app_documents`.

---

<a id="training-002"></a>

### 🎧 Feature 88: Get Started Design Partner Orientation Audio & Step Corpus
* **GRC Function ID:** `TRAINING-002`
* **Exact Screen Coordinates:** `/get-started` orientation reader — welcome audio, orientation MP3, per-step audio under `public/training-audio/steps/`, screenshot cues synchronized via `GET_STARTED_ORIENTATION_CUES`.
* **Operational Purpose:** Retargets first-run operator onboarding from generic Level 1 classroom quickstart to the **Design Partner Operator Packet** and curated **LEVEL1-PARTNER-INDEX** — matching the paid co-builder commercial posture.
* **Technical Mechanics:**
  * `getStartedSteps.ts` — quickstart href `/docs/user-manuals/design-partner-operator-packet`; partner index href `/docs/training/LEVEL1-PARTNER-INDEX`; export path href `/exports`
  * `getStartedStepVisuals.ts` — action cues reference operator packet Day-0 invite, Path B billing, cockpit loop
  * `getStartedOrientationCues.ts` — retimed cue map (55s through 235s); alt text references partner training index and exports console
  * `GetStartedOrientationFallback.tsx` — `GET_STARTED_QUICKSTART_GUIDE_HREF` points to operator packet
  * `orientationAudioScriptGenerator.ts` (IronBoard) — adds `partnerPacketMarkdown` corpus source; retimed sections **1:20** through **3:55**; spoken export path is `/exports`; partner training cites curated `LEVEL1-PARTNER-INDEX` not twenty-four-chapter classroom index; Bucket B only (no invite/billing narration)
  * `scripts/synthesize-get-started-audio.py` — regenerates MP3 assets in `public/training-audio/`
  * `trainingCorpusPlacement.ts` — partner index placement targets for Trainer corpus publisher
* **Agent Boundary:** **Ironscribe** (Agent 05) Trainer corpus; Get Started gates remain billing-gated for live `/integrity` and `/exports` per prior cycles.
* **Step-by-Step Lab Validation:**
  1. Open `/get-started` — verify step 1 links to Design Partner Operator Packet, not generic quickstart.
  2. Play orientation audio — verify screenshot cues advance at retimed offsets.
  3. Run `tests/unit/getStartedOrientationCues.test.ts`, `getStartedSteps.test.ts` paths, `getStartedAudioAsset.test.ts` — all pass.
  4. Confirm regenerated MP3 files exist under `public/training-audio/steps/`.

---

<a id="ops-005"></a>

### 📦 Feature 89: Product Knowledge Spine & Ops Hub Drift Desk
* **GRC Function ID:** `OPS-005`
* **Exact Screen Coordinates:** `/dashboard/operations?tab=overview` — **Product knowledge** section with **Check drift** and **Sync product knowledge** buttons; fixed amber **Knowledge drift detected** banner at viewport top when `.drift-notice.json` latch active or check fails.
* **Operational Purpose:** Establishes a single canonical commercial truth in `lib/ironframeProductKnowledge/` and gives operators one-click drift detection before commits or deploys. Prevents Path B / planned GA literal divergence across IronBoard static context, perimeter worker corpora, and `docs/sales-enablement/` federation mirrors.
* **Technical Mechanics:**
  * **Spine modules:** `commercial.ts` (Path B **499900** cents, GA Command **3500000** cents/yr, GA Growth **7500000** cents/yr, SKU registry); `beachheads.ts` (four sector keys + `BEACHHEAD_TAG_TO_SECTOR`); `productFacts.ts` (`buildProductFactsBlurb`); `boardBinding.ts` (`buildProductKnowledgeBinding`, `buildSalesTeamLaunchMandate`); `syncEngine.ts` (diff + apply); `syncManifest.ts` (mirror pairs, blast radius, fingerprint path); `driftNotice.ts` (operator latch at `.drift-notice.json`, gitignored)
  * **CLI:** `scripts/sync-product-knowledge.ts` — `npm run knowledge:check` (diff only), `knowledge:sync` (`--apply`), `knowledge:sync:json` (`--apply --json`)
  * **Ops API:** `GET|POST /api/admin/operations-hub/product-knowledge` via `productKnowledgeOpsCore.ts` — `isProductKnowledgeApplyAllowed()` blocks apply on Vercel and production without `IRONFRAME_ALLOW_PRODUCT_KNOWLEDGE_SYNC=1`
  * **Pre-commit:** `scripts/pre-commit-knowledge-check.mjs` — path-filtered hard block when staged blast-radius files drift; never auto-modifies staged files
  * **CI:** `.github/workflows/ci.yml` — **Verify Product Knowledge Integrity** step runs `knowledge:check` and `test:product-knowledge` before Postgres bootstrap
  * **Mirror pairs:** `docs/sales/pricing-and-packaging.md` → `docs/sales-enablement/pricing-and-packaging.md`; `docs/sales/competitive-analysis.md` → `docs/sales-enablement/competitive-analysis.md`; enablement-only `competitive-pricing-map.md`, `message-constitution.md` must be Status ACTIVE with commercial anchors
  * **Fingerprint:** `lib/ironframeProductKnowledge/.fingerprint.json` stores `commercialSha256` and anchor snapshot on apply
* **Agent Boundary:** **Ironcore** (Agent 1) ops plane; **Ironlogic** (Agent 4) board federation consumers; all perimeter workers in blast radius; **Ironguard** (Agent 12) GLOBAL_ADMIN gate on ops API.
* **Financial lock:** Spine `DESIGN_PARTNER_PATH_B_CENTS = '499900'` and `PLANNED_GA_COMMAND_CENTS = '3500000'` are string-encoded BigInt-safe digit literals — sync engine flags stale Path B cents patterns in docs trees.
* **Step-by-Step Lab Validation:**
  1. Edit `commercial.ts` Path B value — run `npm run knowledge:check` — verify DRIFT status and spine-changed finding.
  2. Run `npm run knowledge:sync` locally — verify enablement mirrors updated and fingerprint rewritten.
  3. Open Ops Hub overview — verify auto-check runs once and blast-radius list renders when drift present.
  4. On Vercel preview — click Sync — verify `applyBlockedReason` cites ephemeral filesystem.
  5. Run `tests/unit/ironframeProductKnowledge.test.ts`, `productKnowledgeSync.test.ts`, `productKnowledgeOpsCore.test.ts` — all pass.
  6. Stage a blast-radius file with drift — attempt commit — verify pre-commit knowledge check exits **1**.

---

<a id="intel-003"></a>

### 🛰️ Feature 90: July 17 Live Strategic Intel OSINT Manifest Refresh
* **GRC Function ID:** `INTEL-003`
* **Exact Screen Coordinates:** IronBoard Strategic Intel dashboard — rows in `ironboard_crm_interactions` with manifest `ironintel-osint-2026-07-17-live`.
* **Operational Purpose:** Delivers fresh external OSINT for July 17, 2026 through Irongate-sanitized CRM persistence. Today's delta replaces the July 16 manifest with a federal remediation deadline convergence day:
  * **FCEB remediation deadline July 17, 2026 — SonicWall SMA1000:** CVE-2026-15409 (CVSS 10.0 SSRF) and CVE-2026-15410 (CVSS 7.2 RCE) confirmed actively exploited in zero-day attacks on SMA6210, SMA7210, and SMA8200v; CISA KEV added July 14 with July 17 as BOD 26-04 due date; hunt `extraweb_access.log` for `/__api__/login` and `/wsproxy` HTTP 101 anomalies; hotfix 12.4.3-03453 or 12.5.0-02835 required with forensic re-image if IoCs present.
  * **FCEB remediation deadline July 17, 2026 — SharePoint CVE-2026-56164:** CISA urgent hardening advisory confirms active exploitation chaining CVE-2026-32201, CVE-2026-45659, and CVE-2026-56164 for unauthorized access, RCE, IIS machine-key theft, and malware persistence; Microsoft July 15 update confirms CVE-2026-58644 now exploited in the wild — machine-key rotation mandatory, not patch-only triage.
  * **Fortinet FortiSandbox triple-CVE KEV (added July 16, 2026):** CVE-2026-39808 and CVE-2026-25089 unauthenticated OS command injection (CVSS 9.1–9.8) on FortiSandbox 4.4.0–4.4.8 and 5.0.0–5.0.5 with FCEB deadline **July 19**; CVE-2026-39813 path traversal auth bypass also exploited since mid-June — security appliances used for file-trust decisions become network entry points.
  * **Coca-Cola fairlife ransomware (disclosed July 16, 2026):** Unauthorized access to production-related systems forced temporary suspension of all fairlife US dairy production; SEC 8-K filed; Manufacturing Industry Profile must correlate OT/production-system ransomware with NIST CSF supply-chain resilience.
  * **CMMC Phase II suspension day four (DoW July 13, 2026):** Mandatory Level 2 C3PAO certification at award remains suspended with **60**-day CMMC Reform Task Force review active; Phase I self-assessments, SPRS affirmations, and NIST SP 800-171 Rev 2 controls remain in force; False Claims Act Civil Cyber-Fraud Initiative scrutiny on inaccurate self-assessments intensifies during reform window.
  * **AsyncAPI npm Miasma RAT carryover (July 14, 2026):** Five malicious versions with valid SLSA provenance through GitHub Actions OIDC pipelines; payload executes at import/require time — Technology and Finance Industry Profiles must complete credential rotation for any CI runner that loaded affected modules between 07:10–11:18 UTC July 14.
  * **Partnered Health national GP breach carryover (disclosed July 15–16, 2026):** **21** Australian clinics confirmed personal and health information stolen June 23 including Medicare numbers, consultation notes, and pathology results — Healthcare Industry Profile primary-care network breach velocity remains elevated.
  * **AD FS CVE-2026-56155 DKM ACL exposure (KEV July 14):** Distributed Key Manager misconfiguration exposes token-signing and token-encryption keys; manual ACL remediation required with FCEB deadline **July 28** — federated identity planes must extend BOD 26-04 forensic scope beyond SharePoint patching alone.
  * **FAR Council CUI proposed rule (June 23, 2026):** NIST SP 800-171 Rev 3 and **72**-hour CUI incident reporting via clause 52.240-7 — public comment closes **July 23, 2026** (**six** days remaining from July 17); dual-track Rev 2 CMMC self-assessment and prospective Rev 3 FAR alignment required.
* **Technical Mechanics:** `Ironboard/src/knowledge/grcProfessionalResearch.manifest.json`:
  * `manifestId`: `ironintel-osint-2026-07-17-live`
  * `generatedAt`: `2026-07-17T08:00:00.000Z`
  * Updated `riskMetricsCents`: `medianAnnualGrcProgramCents` **4580000000**, `medianAuditRemediationLagCents` **1015000000**, `saasConsolidationSavingsOpportunityCents` **762000000**, `boardReportingOverheadCents` **143000000**
  * **Manufacturing** industry profile added: `peerAleBaselineCents` **1400000000**, `regulatoryPressureIndex` **91**, `saasDisruptionExposureIndex` **85**
  * Existing `peerAleBaselineCents` remain string-encoded BigInt integers — Finance **1800000000**, Healthcare **1210000000**, Technology **950000000**, Defense **2500000000**, Public Sector **1500000000** cents
  * Ingestion: `npx tsx scripts/ingest-strategic-intel-manifest.ts` after Irongate `validateStrategicIntelManifest`
* **Constitutional tenant ALE baselines (Ironframe seed tenants — unchanged):** Medshield **1110000000**, Vaultbank **590000000**, Gridcore **470000000**, Defense **1600000000** cents.
* **Agent Boundary:** **Ironintel** (Agent 16) OSINT correlation; **Ironwatch** (Agent 13) SonicWall perimeter telemetry and KEV deadline-day orchestration; **Irongate** (Agent 14) DMZ sanitization before CRM persistence; **Ironlogic** (Agent 4) board briefing synthesis must cite BIGINT-cent ALE without float drift per industry narrative summaries.
* **Step-by-Step Lab Validation:**
  1. Run ingest script — verify manifest schema validation passes for `ironintel-osint-2026-07-17-live`.
  2. Query Strategic Intel dashboard — confirm SonicWall deadline-day, SharePoint machine-key theft, FortiSandbox triple-CVE, fairlife OT ransomware, and CMMC Phase II suspension entries visible under tenant scope.
  3. Ask board-CFO persona about regulatory horizon — verify response references Phase I self-assessment continuity and July 19 FortiSandbox deadline, not C3PAO sprint.
  4. Run `tests/unit/strategicIntelIngress.test.ts` — BIGINT-cent gate passes.
  5. Verify no raw BigInt cent integers appear in public Governance Frame copy — formatted strings only after operator promote.

---

<a id="governance-006"></a>

### 🔗 Feature 91: Published Briefing Slug Redirects & Legacy URL Continuity
* **GRC Function ID:** `GOVERNANCE-006`
* **Exact Screen Coordinates:** No UI — HTTP **301** redirects on `/governance-frame/[slug]` when legacy slug maps to canonical published-ledger row; IronBoard mirror at port **8082** applies identical redirect semantics.
* **Operational Purpose:** Preserves bookmark and RSS deep-link continuity when a promoted briefing edition is renamed or superseded. External subscribers, board ingestion pipelines, and marketing archive cards must resolve to the canonical ledger slug without **404** or duplicate published rows.
* **Technical Mechanics:**
  * `app/lib/governanceFrame/publishedBriefingSlugRedirects.ts` — `PUBLISHED_BRIEFING_SLUG_REDIRECTS` readonly map; `resolvePublishedBriefingSlug()` trims and lowercases input
  * `Ironboard/src/governanceFrame/publishedBriefingSlugRedirects.ts` — mirror copy kept in sync with app module (comment-enforced)
  * `app/governance-frame/[slug]/page.tsx` — `permanentRedirect()` when redirect target exists before `loadPublishedBriefing()`
  * `Ironboard/src/governanceFrame/router.ts` — `res.redirect(301, ...)` for legacy targets
  * `briefingLoader.ts` and `briefingFilesystemLedger.ts` — resolve slug before filesystem scan match
  * Initial mapping: `2026-07-15-auto-briefing-tenant-sovereignty` → `2026-05-14-connector-count-sovereign-enclaves`
* **Agent Boundary:** **Ironscribe** (Agent 05) publish lineage; **Irongate** (Agent 14) slug normalization before render; no tenant-scoped data — global public ledger only.
* **Step-by-Step Lab Validation:**
  1. Request legacy slug URL — verify **301** to canonical slug with identical article body.
  2. Request canonical slug directly — verify **200** without redirect loop.
  3. Run `tests/unit/publishedBriefingSlugRedirects.test.ts` — resolve function and map entries pass.

---

<a id="marketing-003"></a>

### 📚 Feature 92: Marketing Briefings Archive & Published Ledger Cards
* **GRC Function ID:** `MARKETING-003`
* **Exact Screen Coordinates:** `/resources/briefings` full archive; homepage marketing teaser via `MarketingHomepage` `publishedBriefingCards` prop; `PublicApexNav` **Resources** link.
* **Operational Purpose:** Surfaces industry-voice-neutral metadata cards for published institutional briefings without duplicating full article bodies on the marketing domain. Full prose remains on Governance Frame canonical origin — archive is a read-only projector of the published filesystem ledger, never `docs/briefing-queue/`.
* **Technical Mechanics:**
  * `app/(marketing)/resources/briefings/page.tsx` — `dynamic = "force-dynamic"`; `metadata.robots: { index: true, follow: true }`; calls `listPublishedBriefingCards()`
  * `app/lib/governanceFrame/publishedBriefingLedgerCards.ts` — `PublishedBriefingCard` type with `slug`, `title`, `publishedAt`, `oneLiner`, `kind`, `canonicalUrl`; `FORBIDDEN_CARD_CTA` regex neutralizes accidental Path B / sales CTAs in summaries; `isMarketingArchiveEligible()` delegates to `isPublicPublishedClassification()`
  * `app/components/marketing/BriefingsArchive.tsx` — `variant="archive" | "teaser"`; external links to `governanceFrameBriefingUrl(slug)` (`https://research.ironframegrc.com/briefings/{slug}`) with `target="_blank"`; **Read on Governance Frame →** CTA only — no in-app sales conversion on cards
  * `app/marketing/page.tsx` — passes `listPublishedBriefingCards(4)` to homepage teaser
  * `app/components/marketing/MarketingHomepage.tsx` — **Published governance ledger** / **Institutional briefings archive** region with `BriefingsArchive variant="teaser"`
* **Agent Boundary:** **Ironscribe** (Agent 05) published content attribution; **Ironlogic** (Agent 4) marketing federation reads ledger metadata only — no LLM synthesis of card bodies.
* **Financial note:** Card one-liners must never expose raw BigInt cent integers — `FORBIDDEN_CARD_CTA` and eligibility gate prevent commercial leakage on marketing surface.
* **Step-by-Step Lab Validation:**
  1. Open `/resources/briefings` — verify cards list newest-first with Briefing/Ironcast kind badges.
  2. Click card link — verify navigation to Governance Frame canonical URL, not duplicate markdown on marketing host.
  3. Open `/` or `/marketing` — verify teaser shows up to **4** cards with **View full briefings archive →** link.
  4. Run `tests/unit/publishedBriefingLedgerCards.test.ts` — eligibility, CTA stripping, and sort order pass.

---

<a id="governance-007"></a>

### 📝 Feature 93: Governance Frame Editorial Section Synonym Parser
* **GRC Function ID:** `GOVERNANCE-007`
* **Exact Screen Coordinates:** No UI — affects section zone badges on `/governance-frame/[slug]` and IronBoard HTML blog renderer cent-register classification.
* **Operational Purpose:** Accepts editorial synonym headings in public research briefings without forcing compiler-doc phrasing. Research papers and industry briefings may use **Quantitative Context**, **Economic Context**, **What Modern GRC Must Enforce**, **Architectural Implications**, or **Control-System Requirements** while still mapping to the constitutional I–IV Governance Frame triad for cent-register parsing and HTML zone styling.
* **Technical Mechanics:**
  * `app/lib/governanceFrame/parseBriefingSections.ts` — `classifySection()` regex accepts II synonyms and III synonyms; V (Sources & Citations) classified separately
  * `Ironboard/src/governanceFrame/renderBlog.ts` — parallel `classifySection()` for HTML blog zones
  * `parseBriefingCitations.ts` — citation extraction aligned with expanded section boundaries
  * `briefingDraftValidation.ts` — validation accepts synonym headings where canonical structure is satisfied
* **Agent Boundary:** **Ironscribe** (Agent 05) briefing structure; **Irongate** (Agent 14) cent register validation in Section II synonyms unchanged — `parseCentBigIntSafe` still rejects floats.
* **Step-by-Step Lab Validation:**
  1. Promote briefing with heading `## II. Quantitative Context` — verify impact zone badge renders and cent metrics parse.
  2. Promote briefing with `## III. Architectural Implications` — verify machine-rule zone styling applies.
  3. Run `tests/unit/governanceFrameSanitize.test.ts` and `tests/unit/briefingCitations.test.ts` — synonym headings pass.

---

<a id="governance-008"></a>

### 📄 Feature 94: Google Docs Editorial Sync Utility (GF-2026-001)
* **GRC Function ID:** `GOVERNANCE-008`
* **Exact Screen Coordinates:** No UI — local operator CLI under `scripts/governance-frame/google-docs/`; Drive folder tree **Governance Frame/Research Papers/GF-2026-001 — Evolution of GRC/**.
* **Operational Purpose:** Creates and optionally refreshes Google Drive / Google Docs editorial copies of research paper **GF-2026-001** for collaborative human review. Repository markdown under `docs/governance-frame/research-papers/GF-2026-001-evolution-of-grc/` remains canonical — Google Docs are derivative editorial surfaces only.
* **Technical Mechanics:**
  * Entry script: `scripts/governance-frame/google-docs/create-research-paper.ts` — npm alias `governance-frame:google-docs`
  * Companion: `create-industry-research-briefs.ts` — npm alias `governance-frame:google-docs:briefs`
  * Modes: `create` (default), `replace`, `append`; `--dry-run` skips API calls; `--write-metadata` writes `googleDocId` into repository frontmatter only
  * OAuth: `GOOGLE_OAUTH_CLIENT_FILE`, `GOOGLE_OAUTH_TOKEN_FILE` — Desktop client JSON + saved token; scopes `documents` and `drive.file`
  * State file: `scripts/governance-frame/google-docs/.state/GF-2026-001.json` — gitignored; idempotent exact-name lookup prevents duplicate folders
  * Supporting modules: `google-auth.ts`, `markdown-parser.ts`, `docs-formatting.ts`, `drive-folders.ts`, `types.ts`
  * `.gitignore` excludes `.state/`, `**/google-oauth-client*.json`, `**/google-oauth-token*.json`, `secrets/google-oauth*.json`
* **Agent Boundary:** **Ironscribe** (Agent 05) manuscript lineage; operator-local utility only — no production runtime path, no tenant data, no Irongate bypass.
* **Step-by-Step Lab Validation:**
  1. Run `npm run governance-frame:google-docs -- --dry-run` — verify folder/doc plan prints without API calls.
  2. Configure OAuth files — run `--mode=create` — verify five docs created under expected Drive tree.
  3. Run `tests/unit/governanceFrameGoogleDocsMarkdown.test.ts` — markdown parser and formatting pass.
  4. Confirm `.state/` and OAuth JSON are not committed.

---

<a id="ops-006"></a>

### 🛡️ Feature 95: Ops Worker Chat Anti-Hallucination & Per-Worker Spine Mandates
* **GRC Function ID:** `OPS-006`
* **Exact Screen Coordinates:** Ops Worker Chat panel on every Operations Hub tab — system prompts injected server-side per selected worker target.
* **Operational Purpose:** Prevents Ops Hub conversational workers from inventing SaaS routes, portals, Knowledge Bases, Command Center tripane layouts, customer logos, or pricing outside the product knowledge spine. Each perimeter worker chat target receives its authoritative mandate block so operators get execution-routing guidance grounded in code truth.
* **Technical Mechanics:**
  * `app/lib/server/opsWorkerChatCore.ts` — base prompt includes `buildAntiHallucinationMandate()` from `productFacts.ts`
  * Per-target mandates from `boardBinding.ts`: `buildProductKnowledgeBinding()` (ironboard), `buildIronleadsMandate()` (ironleads), `buildSalesTeamLaunchMandate()` (salesteam), `buildSuccessTeamMandate()` (success-team), `buildSupportTeamMandate()` (support-team)
  * Voice rules: plain prose only for location answers; partner learning docs live on Core `/docs` and `/get-started` — never Approvals or Success Portal as training store
  * IronBoard mirror: `orchestrator/routing.ts` adds `ANTI-HALLUCINATION` block to `BOARD_EXECUTION_LAYER_PREAMBLE`; `isDocsHubLocationQuery` / `isTrainingDocsLocationQuery` return deterministic canonical responses
  * `lib/ironframeProductKnowledge/productFacts.ts` — `FORBIDDEN_PRODUCT_CLAIMS` includes false Success Portal KB, false tripane docs layout, false seed-app-documents partner instruction
* **Agent Boundary:** All perimeter ops chat targets; **Ironlogic** (Agent 4) board canonical routing bypasses LLM for matched location queries.
* **Step-by-Step Lab Validation:**
  1. Ask Ops Worker Chat (IronBoard target) "where is the docs hub?" — verify prose answer cites `/docs` reader shell, not tripane percentages.
  2. Ask "where are training documents?" — verify answer cites `/docs/training/LEVEL1-PARTNER-INDEX` and `/get-started`, denies Success Portal KB.
  3. Run `Ironboard/src/tests/docsLocationCanonicalRouting.test.ts` and `tests/unit/opsWorkerSuccessMandate.test.ts` — all pass.

---

<a id="success-002"></a>

### 🤝 Feature 96: IronSuccessTeam Partner Learning Handoff Advisories
* **GRC Function ID:** `SUCCESS-002`
* **Exact Screen Coordinates:** No UI — IronSuccessTeam poll worker produces CUSTOMER_SUCCESS advisory drafts; surfaced in `/dashboard/admin/approvals` HITL desk.
* **Operational Purpose:** Routes CLOSED_WON and ACTIVE design-partner onboarding advisories to canonical partner learning surfaces — Operator Packet, curated partner training index, and Get Started checklist — instead of inventing portal-local training stores or generic feature tours.
* **Technical Mechanics:**
  * `SuccessTeam/src/agents/advisoryGatekeeper.ts` — onboarding body links `PARTNER_OPERATOR_PACKET_HREF`, `PARTNER_TRAINING_INDEX_HREF`, `PARTNER_GET_STARTED_HREF` from `productFacts.ts`; cites `DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT` from `commercial.ts`
  * `buildPartnerLearningLinksBlurb()` — compact spine blurb for advisory footers
  * `expansionFinder.ts` — ST-03 rules-based onboarding/expansion/retention routing from corpus
  * `customerSuccessCorpus.ts` — imports `DESIGN_PARTNER_PATH_B_USD` from spine; removes stale clone-order-form cent-grade outcome boilerplate
  * `SuccessTeamPortalClient.tsx` — portal copy aligned to partner learning handoff semantics
* **Agent Boundary:** IronSuccessTeam perimeter worker; HITL **DISPATCH** on CUSTOMER_SUCCESS queue only — never auto-send.
* **Financial note:** Advisory `valueCents` fields remain string-encoded BigInt; ROI narrative from `valueQuantifier.ts` — no float persistence.
* **Step-by-Step Lab Validation:**
  1. Poll IronSuccessTeam against CLOSED_WON deal — verify onboarding draft cites operator packet and partner index URLs.
  2. Run `SuccessTeam/tests/customerSuccessCorpus.test.ts` — spine imports and corpus play IDs pass.
  3. Confirm draft footer reads **pending operator co-sign before send**.

---

<a id="governance-009"></a>

### 🌐 Feature 97: Governance Frame Research Publication Site
* **GRC Function ID:** `GOVERNANCE-009`
* **Exact Screen Coordinates:** Public hosts `research.ironframegrc.com` and `brief.ironframegrc.com`; local preview `/gf-research`, `/gf-research/briefings`, `/gf-research/research-papers`, `/gf-research/series`, `/gf-research/newsletters`, `/gf-research/methodology`, `/gf-research/editorial-standards`, `/gf-research/sources-and-corrections`, `/gf-research/about`.
* **Operational Purpose:** Serves the institutional GF research encyclopedia — published briefings, research manuscripts, briefing series installments, editorial policy docs, and newsletter placeholders — as a dedicated public publication surface decoupled from authenticated tenant workspaces and from quarantined briefing-queue drafts.
* **Technical Mechanics:**
  * `config/governanceFramePublic.ts` — `GOVERNANCE_FRAME_PUBLIC_ORIGIN` defaults `https://research.ironframegrc.com`; `governanceFrameBriefingPath(slug)` → `/briefings/{slug}`; `isGovernanceFramePublicHost()` whitelists research/brief hosts plus `GOVERNANCE_FRAME_PUBLIC_HOSTS` env extras
  * `middleware.ts` — `governanceFrameResearchHostResponse()` rewrites pretty paths to `/gf-research/*`; legacy `/governance-frame/*` **308**-redirects to `/briefings/*`
  * `app/gf-research/**` — App Router pages backed by `researchCatalog.ts` filesystem scans under `docs/governance-frame/` and `docs/published-briefings/`
  * `app/lib/governanceFrame/researchLinks.ts` — `researchHref()` resolves host-aware base paths
  * `ResearchSiteChrome.tsx` — shared publication navigation chrome
  * `deploymentQuarantine.ts` — research hosts bypass private workspace quarantine
  * `next.config.ts` — output file tracing for fs reads on Vercel
* **Agent Boundary:** **Ironscribe** (Agent 05) published manuscript lineage; **Irongate** (Agent 14) cent register validation on promoted briefings; agents READ published encyclopedia via `publishedResearchKnowledge.ts` — never queue drafts.
* **Financial note:** Section II cent registers in published briefings remain BigInt whole integers internally; public copy uses formatted strings — never raw cent integers in HTML prose.
* **Step-by-Step Lab Validation:**
  1. Open `http://research.localhost:3000/` (or `/gf-research` on apex) — verify research home renders with briefings and papers navigation.
  2. Promote a validated briefing — verify public URL `https://research.ironframegrc.com/briefings/{slug}` resolves (or `/gf-research/briefings/{slug}` locally).
  3. Request legacy `/governance-frame/{slug}` on research host — verify **308** redirect to `/briefings/{slug}`.
  4. Run `tests/unit/governanceFramePublic.test.ts` and `tests/unit/researchCatalog.test.ts` — host detection and catalog listing pass.

---

<a id="ops-007"></a>

### 📅 Feature 98: Ops Hub Editorial Calendar, Checklists & Schedule Reminders
* **GRC Function ID:** `OPS-007`
* **Exact Screen Coordinates:** `/dashboard/operations?tab=calendar` (bookmark alias `?tab=schedule`); open/done activity columns sorted by P1–P3 priority; overview tab shows schedule summary counts and **Open calendar →** link.
* **Operational Purpose:** Gives GLOBAL_ADMIN operators a due-dated editorial and operations schedule with idempotent T-3/T-2/T-1/T-0 reminder ledger — briefing outlines, draft deadlines, review gates, newsletter syndication milestones, research paper checkpoints, video campaign beats, and ironframe rollout gates — without auto-publishing quarantined queue content. Inline checklists track remaining work per activity; completing or cancelling requires operator outcome text for later audit review.
* **Technical Mechanics:**
  * Prisma `OpsActivity` model — fields `kind` (`OpsActivityKind`), `status` (`OpsActivityStatus`), `dueAt`, `ownerLabel`, `sourceRef`, `notes` (synopsis), `remindersSent` JSON ledger; raw columns `href`, `outcome`, `next_actions`, `priority` via `$executeRaw` hydration
  * `app/lib/server/opsScheduleCore.ts` — `buildOpsScheduleSnapshot()`, `upsertOpsActivity()`, `processOpsScheduleReminders()` with Irongate outbound webhook validation
  * `app/lib/opsScheduleSeedSpecs.ts` — `allProjects2026SeedSpecs`, `summer2026SeedSpecs`, `videoCampaign2026SeedSpecs`, `ironframeRollout2026SeedSpecs`, `synopsisForQueueDraft()`, checklist item serialization
  * `app/lib/opsScheduleLinks.ts` — `hrefForQueueDraft()`, `hrefForOpsSourceRef()` deep links into Ops Hub briefings tab with `?draft=` param
  * `app/lib/opsScheduleMath.ts` — `calendarDaysUntilDue()`, `milestoneForDaysUntil()`, `parseRemindersSent()`
  * `POST /api/admin/operations-hub/schedule` — actions `seed-all-projects`, `seed-summer-2026`, `set-status`, `set-checklist-item`, upsert
  * `GET /api/cron/ops-schedule-reminders` — token-gated; Vercel cron **15 13 * * *** (13:15 UTC daily)
  * `operationsHubCore.ts` — snapshot includes `schedule` block with `dueSoonCount`, `overdueCount`, `openCount`
* **Agent Boundary:** **Ironwatch** (Agent 13) reminder dispatch audit; schedule rows are global ops desk state — not tenant-bound content.
* **Step-by-Step Lab Validation:**
  1. Open Ops Hub Calendar tab — verify empty or seeded activities render sorted P1 first.
  2. Click **Seed all projects 2026** — verify summer, video, and rollout milestones appear with due dates, href links, and checklist items.
  3. Toggle a checklist checkbox — verify `set-checklist-item` persists and `nextActionsRemaining` decrements.
  4. Mark activity **Done** — enter outcome text when prompted — verify outcome stored and row moves to done column.
  5. Trigger reminder cron locally with Bearer secret — verify `remindersSent.t3` (or appropriate milestone) stamps once idempotently.

---

<a id="board-012"></a>

### 📤 Feature 99: IronBoard Boardroom Transcript Export (HTML & PDF)
* **GRC Function ID:** `BOARD-012`
* **Exact Screen Coordinates:** IronBoard native dashboard port **8082** — `#chat-header` export action row with `#export-html-btn` and `#export-pdf-btn` adjacent to `#active-label`.
* **Operational Purpose:** Lets operators download or print boardroom conversation transcripts with rendered markdown formatting — headings, lists, tables, blockquotes, code fences — for audit packets and executive circulation without copying raw streaming text from the chat window.
* **Technical Mechanics:**
  * `Ironboard/src/index.ts` client script — `formatModelHtml()`, `formatInlineMarkdown()`, `parseMarkdownTable()`, `buildExportDocumentHtml()`, `buildConversationExportBody()`
  * Streaming turns use `innerHTML` on `.streaming-body.msg-body` instead of `textContent`
  * Historical model turns wrap content in `<div class="msg-body">` with formatted HTML
  * HTML export — `downloadHtmlFile('ironboard-boardroom-{stamp}.html')` via Blob URL
  * PDF export — opens print-ready window and invokes `window.print()` for Save as PDF
  * User messages remain plain pre-wrap escaped text; model messages receive full markdown render pipeline
* **Agent Boundary:** Export is client-side only — no server persistence of transcripts; **Ironwatch** (Agent 13) does not receive export events unless operator manually attaches transcript to support ticket.
* **Step-by-Step Lab Validation:**
  1. Open IronBoard at `http://127.0.0.1:8082` — run a boardroom query returning markdown tables and headings.
  2. Click **HTML** — verify downloaded file renders formatted transcript with agent role labels.
  3. Click **PDF** — verify print dialog opens with styled document (allow pop-ups if blocked).
  4. Confirm streaming response renders headings live — not monospace raw markdown during synthesis.

---

<a id="marketing-004"></a>

### 🎬 Feature 100: Guided Product Demo Workflow
* **GRC Function ID:** `MARKETING-004`
* **Exact Screen Coordinates:** `/product-demo` — `GuidedWorkflowDemoClient`; linked from homepage hero, workflow section, and `PublicApexNav`.
* **Operational Purpose:** Walks prospects through a seven-step fictional sandbox GRC workflow — risk identified → financial exposure estimated → controls linked → evidence collected → reviewed or quarantined → remediation assigned → board / audit report generated — with explicit **demonstration data** labeling and no live tenant provisioning.
* **Technical Mechanics:**
  * `app/(public)/product-demo/page.tsx` — public route in narrow funnel
  * `app/lib/demo/guidedWorkflowSteps.ts` — step definitions and narrative copy
  * `app/components/demo/GuidedWorkflowDemoClient.tsx` — interactive stepper UI
  * `publicFunnelShell.ts` and `grcRouteMatch.ts` — `/product-demo` classified as public prospect onboarding path
  * Homepage `WORKFLOW_STEPS` constant mirrors demo step labels for marketing consistency
* **Agent Boundary:** Demo plane uses synthetic fixtures only — **Ironguard** (Agent 12) blocks production API bleed when demo cookie active per Feature 36.
* **Financial note:** Demonstration ALE figures display as formatted strings derived from BigInt cent constants in demo fixtures — never float persistence paths.
* **Step-by-Step Lab Validation:**
  1. Open `/product-demo` as guest on cloud narrow funnel host — verify page renders without **403**.
  2. Step through all seven workflow stages — verify each stage labels data as demonstration-only.
  3. Confirm no workspace cookie or tenant UUID is minted during demo session.
  4. Run `tests/unit/publicFunnelShell.test.ts` and `tests/unit/grcRouteMatch.test.ts` — `/product-demo` public classification passes.

---

<a id="marketing-005"></a>

### 🏷️ Feature 101: Public Solutions, Trust Center, and Tools Surfaces
* **GRC Function ID:** `MARKETING-005`
* **Exact Screen Coordinates:** `/solutions`, `/solutions/[slug]` via `SolutionsContent`; `/trust-center` public procurement mirror; `/tools/[toolId]` via `ControlToolPage`; homepage solutions grid links.
* **Operational Purpose:** Extends the narrow public marketing funnel with problem-led solution pages, public trust procurement entry, and control-tool explainers — all guest-readable without authenticated cockpit chrome — while preserving sales-assisted Path B conversion language from the product knowledge spine.
* **Technical Mechanics:**
  * `app/(public)/solutions/**`, `app/(public)/trust-center/**`, `app/(public)/tools/**` route groups
  * `app/components/marketing/SolutionsContent.tsx` — `SOLUTION_PAGES` registry
  * `app/components/marketing/ControlToolPage.tsx` — tool explainer layout
  * `app/components/trust/` — public trust center components
  * `PublicApexNav.tsx` — Solutions, Trust Center, Resources links
  * Narrow funnel and constitutional overlay suppression include all new path roots
* **Agent Boundary:** Marketing surfaces READ product spine constants — never invent pricing or customer logos outside `lib/ironframeProductKnowledge/`.
* **Step-by-Step Lab Validation:**
  1. Open `/solutions` — verify solution cards render with beachhead-aligned copy.
  2. Open `/trust-center` — verify procurement documents load without dashboard session.
  3. Open a `/tools/*` route — verify control-tool page renders in public dark shell.
  4. Run `tests/unit/publicFunnelShell.test.ts` — new paths classified as public dark shell.

---

<a id="gf-desk-001"></a>

### 📰 Feature 102: Governance Frame Publication Desk (GF-OPS-001)
* **GRC Function ID:** `GF-DESK-001`
* **Exact Screen Coordinates:** `/dashboard/operations?tab=briefings` — **GF publication desk** panel (title + research brief fields, **Author via GF desk** button); per-row **Run desk review** button; **DeskReviewBadges** on each quarantined draft row (`desk ready` / `desk revise` + `researcher:advisory`, `verifier:warn`, etc.).
* **Operational Purpose:** Orchestrates six editorial desk agents to author institutional research manuscripts into quarantine and produce advisory desk-review checklists — separating AI-assisted drafting from human Publisher approval. Desk agents stage and annotate only; they never promote, deny, hold-resume, or syndicate to Ironcast/RSS.
* **Technical Mechanics:**
  * **Agent roster:** `GF_PUBLICATION_DESK_AGENTS` in `lib/governanceFrame/publicationDesk/agents.ts` — gf-researcher (Executive Intelligence Unit), gf-editor (Research Editor), gf-verifier (Source Verification Reviewer), gf-regulatory-reviewer (Regulatory / Legal-Scope Reviewer), gf-product-boundary (Product Boundary Reviewer), gf-operator (Editorial Review Board advisory orchestration)
  * **Human publisher:** `GF_PUBLICATION_DESK_HUMAN_PUBLISHER` — Publisher / Founder alone sets agenda and executes Approve/Hold/Deny in Ops Hub
  * **Author mode:** `buildAuthorFilename()` → `{ISO-date}-draft-gf-desk-{slug}.md`; YAML frontmatter requires `publishState: QUARANTINED_AWAITING_OPERATOR`, `status: QUARANTINED_DRAFT`, `requiresImmediatePromotion: false`
  * **Review mode:** reads existing queue markdown; re-runs heuristic passes; upserts findings into sidecar
  * **Heuristic passes:** `scanCitationPresence`, `scanEditorStructure`, `scanRegulatoryPrecisionFlags`, `scanProductBoundaryFlags`, `scanForbiddenPublicSalesClaims`, `validateBriefingQueueDraft({ promotion: false })`
  * **Sidecar schema:** `DeskReviewChecklist` with `schemaVersion: 1`, `findings: DeskAgentFinding[]`, `readyForHumanOperator: boolean`, `pipelineLog: string[]`
  * **API:** `POST /api/admin/operations-hub/briefings/desk-run` — `maxDuration: 120`; tenant slug binding via Prisma lookup (fail **400** if slug missing)
* **Agent Boundary:** Desk agents are advisory sub-processes under **Ironscribe** (Agent 05) manuscript structure and **Irongate** (Agent 14) validation heuristics — not members of the constitutional 19-agent workforce grid. Human operator holds sole promote authority per Mandate 14.
* **Financial note:** Desk drafts must not emit raw BigInt cent integers in public-facing Section II copy — internal ALE references use formatted strings only after operator promote sanitization.
* **Step-by-Step Lab Validation:**
  1. POST desk-run `{ mode: "author", title: "Test institutional briefing", requestPrompt: "<40+ chars>", tenantSlug: "ironframe-sandbox" }` — verify HTTP **201**, `staged: true`, filename matches `*-draft-gf-desk-*.md`.
  2. Inspect `docs/briefing-queue/.desk-reviews/{base}.desk.json` — verify gf-researcher advisory finding and operator ready-for-human note.
  3. POST desk-run `{ mode: "review", filename: "<staged-file>" }` — verify verifier/editor/regulatory/product-boundary findings upserted.
  4. Confirm `readyForHumanOperator: true` does **not** auto-promote — draft remains in queue until human **Approve**.
  5. Verify desk-run response never includes `PublishedBriefing` slug or syndication receipt.

---

<a id="board-013"></a>

### 🔴 Feature 103: IronBoard Product-Matrix Perimeter Health Routing
* **GRC Function ID:** `BOARD-013`
* **Exact Screen Coordinates:** IronBoard boardroom port **8082** — no dedicated button; triggered when operator asks about red/HIGH workforce indicators, product matrix status, or names ports `:8082`–`:8086` with health concern language.
* **Operational Purpose:** Prevents boardroom misrouting of Ops Hub perimeter fleet health questions to U.S. labor-market web search or CRM discovery — red dots on Ironleads/SalesTeam/IronSuccessTeam/IronSupportTeam matrix rows reflect unreachable `/health` probes from the board host, not macroeconomic workforce statistics.
* **Technical Mechanics:**
  * `isPerimeterWorkforceHealthQuery()` in `boardroomQueryIntent.ts` — matches product matrix / perimeter workforce / fleet panel + red/down/offline/unreachable/health/status language; explicit labor-market terms (`labor market`, `BLS`, `unemployment`, `Conference Board`) return false to preserve web path
  * `buildProductMatrixHealthSnapshot()` in `productMatrixHealth.ts` — probes configured worker URLs; records `reachable`, `latencyMs`, `priority`, `checkedAt`
  * `formatPerimeterWorkforceHealthAnswer()` — explains HIGH label as static ops priority (not outage severity); lists per-service green/reachable or red/unreachable with port numbers
  * `boardSynthesizer.ts` — short-circuits before `runDynamicDiscovery` when perimeter health intent detected
  * `Ironboard/src/index.ts` `/api/query` — emits SSE `productMatrixHealth` tool call (running → complete) then streams formatted answer without LLM synthesis
  * Blocks `shouldPrefetchWeb`, `shouldPrefetchProspects`, and `requiresCrmDiscovery` for perimeter health queries
* **Agent Boundary:** **Ironwatch** (Agent 13) health probe telemetry; **Ironcore** product matrix configuration; no CRM or Ironintel OSINT bleed on this path.
* **Step-by-Step Lab Validation:**
  1. Stop SalesTeam worker — ask boardroom **"Why is SalesTeam red on the product matrix?"** — verify answer cites `:8084` unreachable probe, not labor statistics.
  2. Ask **"What does the labor market report say about unemployment?"** — verify query does **not** match perimeter health path; web prefetch may proceed.
  3. Inspect SSE stream — verify `productMatrixHealth` tool receipt appears before answer tokens.
  4. Run `Ironboard/src/services/boardroomQueryIntent.test.ts` — perimeter health positive and labor-market negative cases pass.

---

<a id="hitl-002"></a>

### 🎛️ Feature 104: Tri-Track HITL Approvals Filter Desk
* **GRC Function ID:** `HITL-002`
* **Exact Screen Coordinates:** `/dashboard/admin/approvals?kind=SALES|SUPPORT|CUSTOMER_SUCCESS` — kind filter chips; Ops Hub overview amber/emerald/violet quick links with per-kind counts.
* **Operational Purpose:** Separates SalesTeam outreach drafts, IronSupportTeam reply drafts, and IronSuccessTeam advisory drafts into filterable operator queues without splitting Postgres tables — reducing mis-dispatch risk when GLOBAL_ADMIN reviews mixed pending work.
* **Technical Mechanics:**
  * `approvalDraftKinds.ts` — `APPROVAL_DRAFT_KINDS`, `APPROVAL_KIND_META` with per-kind `source`, `dispatchMeans`, `tabLabel`, hue tokens
  * `parseApprovalKindFilter()` — accepts `CS` alias for customer success
  * `AdminApprovalDashboardClient.tsx` — `Suspense` boundary; `router.replace(approvalsHref(kind))` on chip click; visible draft list filtered by kind; empty state copy references active filter title
  * `operationsHubCore.ts` — aggregates `approvals.byKind.SALES`, `.SUPPORT`, `.CUSTOMER_SUCCESS` for overview tiles
* **Agent Boundary:** SalesTeam (PROSPECT drafts), IronSupportTeam (SUPPORT drafts), IronSuccessTeam (CUSTOMER_SUCCESS drafts) remain separate poll workers — desk is read/edit/dispatch only.
* **Step-by-Step Lab Validation:**
  1. Seed one pending draft per kind — open `/dashboard/admin/approvals?kind=SUPPORT` — verify only support rows render with emerald chrome.
  2. Click **All** chip — verify combined count equals sum of kind counts on Ops Hub overview.
  3. DISPATCH a SALES SMS draft — verify Twilio/Textbelt path still gated on `isSalesSmsDraft` regardless of active filter chip.

---

<a id="gtm-live-001"></a>

### 🎙️ Feature 105: Workflow-Review LIVE Call Assist
* **GRC Function ID:** `GTM-LIVE-001`
* **Exact Screen Coordinates:** `/dashboard/operations/workflow-review` — Ops Hub header / Teams tab / Approvals talk-track buttons also deep-link here.
* **Operational Purpose:** Human operator hosts the 15-min workflow review; LIVE sidecar captures mic STT, buying signs, Pocket Q&A, End LIVE → recap, and Push to calendar — agents never conduct the call.
* **Technical Mechanics:**
  * `workflowReviewCallAssistCore.ts` — actions `assist` | `analyze` | `recap` | `push-calendar` | `session` via `/api/admin/operations-hub/workflow-review-call`
  * Mic LIVE uses Gemini STT through `/api/admin/operations-hub/worker-voice/transcribe` (~2.2s chunks); requires `GOOGLE_API_KEY`
  * `workflowReviewCalendarPush.ts` — idempotent Ops Calendar cards with `wf-recap:*` sourceRefs
  * Ops GTM talk track: `/dashboard/operations/workflow-review/protocol` (markdown: `docs/sales/design-partner-workflow-review-protocol.md`)
* **Agent Boundary:** Operator hosts; board-sales-lead may prep briefs; SalesTeam never auto-sends from call assist.
* **Step-by-Step Lab Validation:** Follow [pre-outreach run order R5–R6](../sales/design-partner-pre-outreach-run-order.md) — level bar moves, words in buffer, recap appears, Push to calendar creates `[WF review]` cards.

---

<a id="gtm-lib-001"></a>

### 📚 Feature 106: Ops Hub Operator Library Directory
* **GRC Function ID:** `GTM-LIB-001`
* **Exact Screen Coordinates:** `/dashboard/operations/library` and `/dashboard/operations/library/[slug]` — **Operator library** button on Ops Hub.
* **Operational Purpose:** Curated directory of design-partner GTM playbooks (run order, glossary, offer sheet, protocol) plus Ops tools links — not the partner `/docs` packet and not `docs/end-users/` “Extended operator library.”
* **Technical Mechanics:**
  * Catalog: `app/lib/operations/operatorLibraryCatalog.ts` (`OPERATOR_LIBRARY_SETS`)
  * Loader: `loadOperatorLibraryMarkdown.ts` reads `docs/sales/*` and `docs/qa/*` by slug
* **Agent Boundary:** Read-only markdown for operators; DISPATCH and Path B remain separate Approvals / onboarding surfaces.
* **Step-by-Step Lab Validation:** Open library → open **Pre-outreach dry-run** and **GTM operator glossary** slugs → confirm markdown renders without 404.

---

<a id="gtm-teams-001"></a>

### 👥 Feature 107: Microsoft Teams Graph (Meeting + Post-Call Transcript)
* **GRC Function ID:** `GTM-TEAMS-001`
* **Exact Screen Coordinates:** Ops Hub **Teams** tab; APIs under `/api/admin/operations-hub/teams/*` (connect, callback, status, meetings, transcript).
* **Operational Purpose:** Optional Azure Graph connect to create Teams meetings and ingest **post-meeting** transcripts. **In-call** assist remains browser mic LIVE (Feature 105) — Graph does not replace LIVE STT.
* **Technical Mechanics:** Env `MICROSOFT_GRAPH_*` (see `.env.example`); cores `teamsGraphAuth.ts`, `teamsGraphMeetings.ts`, `teamsGraphTranscriptParse.ts`; tokens in `MICROSOFT_GRAPH_TOKEN_FILE` (gitignored).
* **Agent Boundary:** Operator OAuth only; no auto-DISPATCH from transcripts.
* **Step-by-Step Lab Validation:** Connect → status shows account email → create meeting link → after a real call, fetch transcript when Graph exposes it.

---

<a id="gtm-bc-001"></a>

### 🧭 Feature 108: Ironleads Buying-Committee Research
* **GRC Function ID:** `GTM-BC-001`
* **Exact Screen Coordinates:** Ironleads SUSPECT enrichment path (`ironleadsBuyingCommitteeResearchCore.ts`); results persist on contact metadata for operator scan before PROSPECT drafts.
* **Operational Purpose:** Map likely buying-committee roles (CISO/CFO/sponsor) and switchboard phones so outreach targets a real buyer — not title noise.
* **Technical Mechanics:** `researchBuyingCommitteeForContact` / `researchBuyingCommitteeForAllSuspects`; curated playbooks + extract helpers; merges emails/phones into contact metadata under `buyingCommittee`.
* **Agent Boundary:** Enrichment only — never DISPATCH; operator still HITL Approvals.
* **Step-by-Step Lab Validation:** Open a SUSPECT report → confirm buying-committee members or switchboard notes when research has run; purge duplicate PENDING drafts if regenerating outreach.

---

## 🧬 Chapter 5: Nineteen-Agent Architecture Cross-Reference (Delta Verification)

Today's code delta touches the following agents. Use this matrix during audits to confirm boundary integrity for operational date **2026-07-20**:

| Agent # | Codename | Today's Delta Touchpoints |
|---------|----------|-------------------------|
| 1 | Ironcore | Ironleads SUSPECT location enrichment + buying-committee research; workflow-review LIVE assist + calendar push; Operator library directory; Teams Graph connect; tri-track HITL approvals; Ops Calendar checklist expansion; prior-cycle GF Publication Desk / product-matrix health / research publication retained |
| 3 | Irontrust | Constitutional seed baselines unchanged (**1110000000**, **590000000**, **470000000**, **1600000000**); July 17 OSINT `riskMetricsCents` retained (**4580000000**, **1015000000**, **762000000**, **143000000**); suspect `priorityScore` explicitly non-monetary integer tier |
| 4 | Ironlogic | Prior-cycle `isPerimeterWorkforceHealthQuery` and `BOARD_OPERATOR_PROSE_MANDATE` retained — no new boardroom routing changes in today's delta |
| 5 | Ironscribe | Prior-cycle GF desk agent roster and desk-review sidecars retained — no new manuscript structure changes in today's delta |
| 13 | Ironwatch | Ops schedule checklist mutation audit; reminder dispatch ledger; approvals byKind snapshot counts for operator telemetry |
| 14 | Irongate | Ironleads ingress website metadata merge on deduped upsert; suspect report blocker gates before PROSPECT handoff; prior-cycle desk product-boundary pass retained |
| 15 | Ironquery | Prior-cycle canonical docs hub location responses retained — no tripane layout invention for `/docs` queries |
| 16 | Ironintel | July 17 manifest retained — FortiSandbox triple-CVE FCEB deadline **July 19** passed operational window; `looksLikeOsintTitleNoise()` prevents agency advisory titles polluting SUSPECT company names |

**Ironleads SUSPECT location note (2026-07-20):** Website URLs normalize to HTTPS from metadata or deal domain. Postal addresses render as single-line `addressLine` for operator scan — never float geocodes. Forensic reports require `prospect-pool` tenant before SalesTeam outreach. Blocker codes are explicit — operators must clear each before expecting PROSPECT poll drafts.

**Tri-track HITL note (2026-07-20):** One Postgres approval queue serves three draft kinds filtered in UI only. DISPATCH semantics unchanged — SMS still requires E.164 phone and HITL click. Ops Hub overview tiles expose per-kind counts without exposing draft body content cross-kind.

**Ops Calendar checklist note (2026-07-20):** Activities sort P1 (numeric rank **1**) first. Checklist items persist in `next_actions` column. Marking Done or Cancelled without outcome text is rejected client-side. Calendar href links may deep-link to briefing queue rows via `?draft=` param.

**GF publication desk note (2026-07-19 retained):** Six desk agents (`gf-researcher`, `gf-editor`, `gf-verifier`, `gf-regulatory-reviewer`, `gf-product-boundary`, `gf-operator`) are **quarantine-only** editorial sub-processes — not numbered agents in the 19-node workforce grid. They stage into `docs/briefing-queue/` and write `docs/briefing-queue/.desk-reviews/*.desk.json` sidecars. **`readyForHumanOperator: true` is advisory.** Human Publisher/Founder alone executes Approve/Hold/Deny. Desk-run API never imports promote/deny/syndicate cores.

**Product-matrix health note (2026-07-19 retained):** Red workforce dots = unreachable health endpoints from board host (:8082–:8086). HIGH priority labels = static ops matrix priority, not CRM stage health or BLS labor statistics. Boardroom routes these queries to `productMatrixHealth` tool — blocks web and CRM discovery prefetch.

**Governance Frame plane note (2026-07-18 retained):** Canonical public origin is **`https://research.ironframegrc.com`**. Published ledger is the sole source for `/briefings/[slug]`, RSS, Ironcast email, marketing archive cards, and agent READ federation. Legacy `brief.ironframegrc.com` and `/governance-frame/*` on research hosts redirect to `/briefings/*`. Queue drafts never appear on research publication or `/resources/briefings`. Section II/III editorial synonyms map to triad zones without weakening `parseCentBigInt` float rejection.

**Product knowledge plane note (2026-07-16 retained):** Edit `lib/ironframeProductKnowledge/commercial.ts` once, then `npm run knowledge:sync`, commit git diff, restart IronBoard :8082, redeploy perimeter workers per `PRODUCT_KNOWLEDGE_BLAST_RADIUS`. Ops Hub sync does not kill Cloud Run processes. Vercel-hosted Ops Hub is check-only for apply. CI `knowledge:check` runs before Postgres bootstrap per `.github/workflows/ci.yml`.

**GTM quarantine plane note:** Autonomous weekday cron, manual briefing/newsletter requests, and narrate flywheel all write `docs/briefing-queue/` exclusively. Operator **Approve** = promote to research origin + remove queue file; **Hold** = `briefing_queue_holds` metadata only; **Resume** = clear hold without publish; **Deny** = `briefing_queue_denials` + hold clear + filesystem unlink. Already-promoted slugs hidden from active desk. `PublishedBriefing`, Ironcast syndication, RSS, research publication, and marketing archive update only after explicit promote — never from cron alone.

**Ops schedule plane note (2026-07-20):** `seed-all-projects` loads summer editorial, video campaign, and ironframe rollout seed specs. Checklist checkbox mutations persist via `set-checklist-item`. Outcome text required on terminal statuses. Reminder cron remains token-gated — never fires without Bearer secret.

**Ops schedule plane note (2026-07-18 retained):** `OpsActivity` rows track editorial due dates with idempotent T-3/T-2/T-1/T-0 reminders. Summer 2026 seed is operator-initiated only.

**Perimeter workforce plane note (2026-07-17 retained):** SuccessTeam `advisoryGatekeeper` links partner learning to spine hrefs; SupportTeam corpus cites `formatPathBUsd()` from spine; all five worker tsconfig paths include `../lib/ironframeProductKnowledge/**/*`.

**Prior-cycle agents (unchanged in 2026-07-20 diff but constitutionally active):** GF Publication Desk and product-matrix health (2026-07-19), Governance Frame research publication site (2026-07-18), product knowledge drift desk (2026-07-16), briefing hold/resume/read gates (2026-07-16), SMS HITL dispatch (2026-07-15), in-tenant support envelope (2026-07-06), workspace settings BigInt ALE (SETTINGS-001), shadow-plane diagnostics (TAS 4.3), narrow funnel quarantine (INGRESS-001), marketing briefings archive (2026-07-17).

Agents not directly modified in today's delta remain governed by their existing TAS core directives. Absence from the diff is not absence from the workforce — verify their **ACTIVE** status lights in Feature 5 grid before each lab session.

---

## 🧯 Chapter 6: Self-Healing Troubleshooting & Error Diagnostic Steps

Because you are completing your GRC auditing labs independently online without an instructor, you must know how to clear security alerts yourself using our automated self-healing loops:

### 🚨 Alert 1: Display Elements Freeze and Read "GOVERNANCE DRIFT DETECTED"
* **The Root Cause:** You accidentally violated **Mandate 2** by trying to manually modify a configuration baseline or alter a data row directly on screen without an approved amendment proposal. The `Ironwatch` agent detected a structural hash discrepancy and locked the display to secure the system.
* **How to Resolve It Yourself:**
  1. Locate the bold, amber control button labeled **`FREEZE COMMAND POST`** sitting in the top sub-header toolline and click it once.
  2. This triggers the `Irontech` self-healing agent to immediately freeze system states and run a deep structural integrity check against your local files.
  3. Wait exactly three seconds. The background automation will auto-wipe your unsanctioned change, reload your company's official database baseline, clear out the red alert text, and restore your interface to a safe green tracking message.
  4. If void persists, execute `prisma/scripts/constitutional_rebaseline_reset.sql` and poll `/api/grc/tas-integrity`.

### 🚨 Alert 2: Primary Panels Suddenly Clear and Flash Empty Gray Boxes
* **The Root Cause:** This is an intentional visual system safety state known as a **Skeleton Loading Frame**. It occurs when you use the top-left dropdown switcher to change corporate profiles. The platform purposefully purges short-term memory to guarantee that confidential database entries never bleed or leak across tenant boundaries.
* **How to Resolve It Yourself:**
  1. Maintain system isolation; do not click any components and leave your mouse still for 1 to 2 seconds.
  2. The background security warden **`Ironguard`** will automatically complete an access handshake to verify your user badge credentials have the legal permission rights to view the new corporation's records.
  3. Once verified, the gray placeholder frames will instantly slide away, and your fresh rows of clean, verified client records will paint your screen beautifully.

### 🚨 Alert 3: Production Ingress Block (HTTP 403 on Private Workspace Only)
* **The Root Cause:** You are hitting a **private workspace** path (`/integrity`, `/dashboard/*`, `/cockpit`, authenticated tripane `/`) on a cloud-hosted URL while production quarantine is active without `IRONFRAME_ALLOW_PUBLIC_INGRESS=1`. Today's **narrow funnel** allows public paths (`/terms`, `/privacy`, `/marketing`, `/resources`, `/resources/briefings`, `/solutions`, `/product-demo`, `/trust-center`, `/tools`, `/docs`, `/pricing`, `/register/*`, `/sales-agent-portal`, `/governance-frame`, `/gf-research`, auth surfaces) on cloud hosts — **`research.ironframegrc.com`** bypasses quarantine entirely. Only private workspace surfaces return **403**.
* **How to Resolve It Yourself:**
  1. Develop on `http://127.0.0.1:3000` or tenant workspace `http://{slug}.lvh.me:3000` where quarantine is automatically whitelisted.
  2. For cloud Stripe webhook testing, POST to `/api/webhooks/stripe` or `/api/billing/webhook` — both bypass quarantine by design.
  3. For headless cron, use Bearer `IRONFRAME_CRON_SECRET` on `/api/internal/cron/*` — middleware passthrough.
  4. Set `IRONFRAME_ALLOW_PUBLIC_INGRESS=1` on the preview deployment for full workspace stakeholder demos (document the temporary change in your audit log).
  5. If `/docs` works but `/integrity` returns **403** on cloud — expected narrow funnel behavior, not a regression.

### 🚨 Alert 4: Dashboard Redirects to `/unauthorized` After Login
* **The Root Cause:** Your Supabase user authenticated successfully but has no valid row in `user_role_assignments` for any tenant UUID.
* **How to Resolve It Yourself:**
  1. Platform administrator runs `inviteCorporateTenantUserAction` with correct `tenantSlug`.
  2. Or insert a valid `user_role_assignments` row bound to Medshield `5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01`, Vaultbank, Gridcore, or Defense UUID.
  3. Reload `/integrity` — verify `ensureDashboardTenantSession` writes tenant session cookie.

### 🚨 Alert 5: Financial Display Shows Decimal Drift
* **The Root Cause:** A module converted BigInt cents to float before persistence or export — **Mandate 1** violation.
* **How to Resolve It Yourself:**
  1. Reject the hotfix. Identify the offending cast (`Number()` on aggregated cents without integer guard).
  2. Verify database column type is `BIGINT` for `mitigated_value_cents`, `ale_baseline_cents`, and `financialRisk_cents`.
  3. Re-run Irontrust unit snapshots against constitutional baselines: **1110000000**, **590000000**, **470000000**, **1600000000** cents.
  4. Export CSV again — confirm zero decimal places in raw file cells.

### 🚨 Alert 6: Billing Suspension Overlay After Login
* **The Root Cause:** Tenant `tenant_billing.status` is **PENDING** or **PAST_DUE** and operator is not GLOBAL_ADMIN.
* **How to Resolve It Yourself:**
  1. Platform administrator sets billing status to **ACTIVE** via `setTenantBillingStatusAction` or Stripe webhook fulfillment.
  2. Or navigate to exempt path `/account/billing-hold` to complete payment remediation.
  3. GLOBAL_ADMIN operators bypass gate for onboarding and support — use `/admin/onboarding` to verify tenant state.

### 🚨 Alert 7: Self-Serve Registration Surfaces Removed or Redirected
* **The Root Cause:** Phase 1 invite-only gate — `app/(marketing)/register/setup/page.tsx` **deleted**; `IRONFRAME_PUBLIC_REGISTRATION_ENABLED` hardcoded **false**. **`/register/demo`** and `/demo/*` remain available for client-only mock-auth demonstrations (2026-07-18 — `BLOCK_DEMO_SANDBOX_WHEN_REGISTRATION_DISABLED=false`).
* **How to Resolve It Yourself:**
  1. Direct prospects requiring real workspace provision to `/register/contact` for sales-assisted intake.
  2. Direct prospects wanting product walkthrough to `/product-demo` or `/register/demo` — no tenant mint.
  3. GLOBAL_ADMIN mints invitation token — direct invitee to `/register/{token}`.
  4. Sales engineers POST to `/api/register/sales-intake` with `INTERNAL_SALES_PROVISION_KEY` bearer token.
  5. Do not attempt env-var override for self-serve setup — `/register/setup` route remains deleted for Phase 1.

### 🚨 Alert 8: Password Reset Email Link Rejected by Supabase
* **The Root Cause:** Supabase Authentication → URL Configuration lacks the exact callback URL built from tenant subdomain origin.
* **How to Resolve It Yourself:**
  1. Read error message from `requestResetPasswordAction` — copy the cited redirect URL verbatim.
  2. Add URL to Supabase Redirect URLs list (include `http://{slug}.lvh.me:3000/**` for local tenant workspaces).
  3. Retry reset from the same host you intend users to land on after callback.

### 🚨 Alert 9: Demo Sandbox Blocks Production API Calls
* **The Root Cause:** Demo mode is active (`ironframe-demo-active=1` cookie or valid demo session in `localStorage`) and the client attempted a tenant-scoped `/api/*` fetch. `applyIronguardToFetch` enforces `DEMO_MODE_ISOLATED` isolation — production telemetry must not bleed from sandbox UI exploration.
* **How to Resolve It Yourself:**
  1. Expected behavior during demo command post labs — mock UI uses `seedDemoClientState()` client fixtures, not live API polls.
  2. To test production API paths, call `clearDemoSession()` or delete `ironframe-demo-active` and `ironframe-demo-session` cookies, then sign in with a real Supabase RBAC session.
  3. Constitutional sentinel routes (`/api/grc/tas-integrity`, `/api/grc/tas-fingerprint`) remain callable during demo for marketing integrity badges — do not treat those blocks as regressions.

### 🚨 Alert 10: Governance Frame Shows Empty Index
* **The Root Cause:** No markdown files exist in `docs/published-briefings/` or draft-only files remain in `docs/briefing-queue/` without promotion.
* **How to Resolve It Yourself:**
  1. Copy reviewed briefing from `docs/briefing-queue/` to `docs/published-briefings/{slug}.md` with YAML frontmatter including `publishedAt`.
  2. Ensure Section II impact metrics use whole-cent BigInt string literals in `(¢)` labeled bullets — floats are rejected by `parseCentBigInt`.
  3. Reload `/governance-frame` — verify index card grid lists briefing with chronological sort key.

### 🚨 Alert 11: Boardroom Query Returns HTTP 502 CORE_TELEMETRY_DISCONNECTED
* **The Root Cause:** IronBoard port **8082** could not fetch live tenant telemetry from Ironframe `GET /api/board/shared-context` before starting LLM synthesis. Common triggers: Ironframe not running on port **3000**, missing or invalid `ironframe-tenant` cookie scope, tenant isolation rejection (`UNAUTHORIZED_ACCESS`), or `IRONFRAME_CORE_ORIGIN` pointing at wrong host.
* **How to Resolve It Yourself:**
  1. Start Ironframe dev server on `http://127.0.0.1:3000` and confirm `/api/board/shared-context` returns JSON when called with valid tenant session headers.
  2. Start IronBoard on `http://127.0.0.1:8082` — both engines must bind **127.0.0.1** only per today's delta.
  3. Set `IRONFRAME_CORE_ORIGIN=http://127.0.0.1:3000` in IronBoard environment if using non-default core host.
  4. Sign in to Ironframe dashboard first so `ironframe-tenant` cookie exists — or pass `tenantId` UUID in board query request body (Medshield seed: `5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01`).
  5. Read `detail` field in 502 JSON — timeout after **12000** ms indicates core unreachable; **401** indicates tenant isolation boundary breach.
  6. Run `Ironboard/src/services/coreTelemetryBridge.test.ts` to verify header forwarding logic locally.

### 🚨 Alert 12: Boardroom Documentation Brief Missing
* **The Root Cause:** IronBoard Trainer or Writer agent attempted to author documentation without `documentationBrief` in shared-context payload — one-way ingress mandate violation. `runExecutiveDocumentationCommand` now throws when `fetchIronframeDocumentationBrief` fails.
* **How to Resolve It Yourself:**
  1. Confirm Ironframe `GET /api/board/shared-context` returns `documentationBrief` with `communicationDirection: ONE_WAY_IRONFRAME_TO_BOARD`.
  2. Restart IronBoard after Ironframe core is healthy — bridge must hydrate before doc authoring phases.
  3. Run `tests/unit/documentationBrief.test.ts` — verify brief builder includes dual-plane matrix and telemetry mirror.

### 🚨 Alert 13: App Document DB Read Failure
* **The Root Cause:** `/docs/[slug]` slug not found in `app_documents` table — `CompilationIngressPortal` shows staging state (filesystem-only fallback removed).
* **How to Resolve It Yourself:**
  1. Run `npx tsx scripts/seed-app-documents.ts` against development database.
  2. POST `POST /api/documentation/execute` with internal gateway Bearer to upsert missing slug.
  3. Verify migration `20260618120000_init_app_documents` applied: `npx prisma migrate status`.
  4. Run `tests/unit/docsContentDecoupling.test.ts` — decoupling paths pass.

### 🚨 Alert 14: Workspace Invitation Token Required
* **The Root Cause:** Corporate tenant provision attempted without valid `TenantWorkspaceInvitation` token — Phase 1 invitation gate enforced in `corporateTenantProvisionCore.ts`.
* **How to Resolve It Yourself:**
  1. GLOBAL_ADMIN runs `mintWorkspaceInvitation` admin action with target email and tenant slug.
  2. Direct invitee to `/register/{token}` before provision flow — mint panel displays secure activation URL.
  3. Verify invitation `status` is **ACTIVE** and `expiresAt` is in the future.
  4. After consumption, confirm `status` becomes **CONSUMED** — token cannot be reused.

### 🚨 Alert 15: Ironbloom Returns `no_physical_telemetry`
* **The Root Cause:** Threat was marked RESOLVED but `ThreatEvent.ingestionDetails` lacks sealed physical unit payload (kWh, L, km). Severity-based synthetic kWh fallback **removed** in today's delta — Kimbot (Agent 17) rejects monetary-only approximations.
* **How to Resolve It Yourself:**
  1. Inspect threat row `ingestionDetails` JSON — verify `physicalQuantity` and unit fields per `parseThreatIngestionTelemetry` schema.
  2. Re-ingest utility telemetry through Irongate-sanitized threat ingress before marking RESOLVED.
  3. Call `recordSustainabilityImpact` again — verify `mitigated_value_cents BIGINT` persists only after valid physical trace.
  4. Run `lib/sustainability/ironbloomDashboardTelemetry.test.ts` — parse paths pass.

### 🚨 Alert 16: Boardroom Cites Synthetic Ledger/Vault Prospects
* **The Root Cause:** Board persona presented `{Region} Ledger` or `{Region} Vault` template rows as real market research — **BOARD_GTM_MARKET_AUTHENTICITY_MANDATE** violation. `verifyAndOptimizeMarketData` may not have run before flywheel context assembly.
* **How to Resolve It Yourself:**
  1. Click **Load Prospecting Batch** to trigger `verifyAndOptimizeMarketData` with `operatorTriggered: true`.
  2. Verify `marketProspectAuthenticity` purged synthetic rows — authenticity summary shows `polluted=false`.
  3. Re-ask boardroom query — verify prospects labeled `LIVE_WEB_GROUNDING` or `CURATED_DEMO_SEED` (London/Singapore only).
  4. Run `tests/unit/marketProspectAuthenticity.test.ts` — synthetic detection passes.

### 🚨 Alert 17: LiteSpeed KEV Deadline Due Today (June 19, 2026)
* **The Root Cause:** CISA KEV **CVE-2026-54420** (LiteSpeed cPanel symlink root escalation) carries BOD 26-04 tier-1 remediation deadline **June 19, 2026** per June 18 OSINT manifest — shared hosting and Technology profile tenants may remain unpatched.
* **How to Resolve It Yourself:**
  1. Verify CloudLinux/CageFS deployments on affected cPanel hosts — assume breach if deadline elapsed without patch evidence.
  2. Ingest Strategic Intel manifest `ironintel-osint-2026-06-18-live` — confirm `osint-03-joomla-litespeed` chunk in CRM.
  3. Cross-reference Joomla **CVE-2026-48907** (deadline June 18) — both require forensic triage before patch under BOD 26-04.
  4. Document remediation in board packet using formatted ALE strings — internal ledger remains BigInt cents only.

### 🚨 Alert 18: Support Drawer Shows "Workspace Telemetry Unavailable"
* **The Root Cause:** Operator opened the in-tenant support drawer without an active tenant context — `GET /api/support/in-tenant-context` returned non-OK or tenant UUID unresolved after Ironguard validation.
* **How to Resolve It Yourself:**
  1. Confirm `ironframe-tenant` cookie matches assigned workspace or host-bound subdomain slug.
  2. Verify `user_role_assignments` row exists for current Supabase user on target tenant.
  3. Reload cockpit route — expand **Attached diagnostics** — confirm tenant slug chip appears.
  4. Run `tests/unit/inTenantSupportTelemetry.test.ts` — mocked tenant build returns non-null envelope.

### 🚨 Alert 19: DATA_INTEGRITY Ticket Rejected — Telemetry Required
* **The Root Cause:** Operator selected urgency **DATA_INTEGRITY** or **AUDIT_BLOCKER** with **Attach secure workspace diagnostics** unchecked — `POST /api/support/in-tenant-ticket` enforces HTTP **400**.
* **How to Resolve It Yourself:**
  1. Re-open support drawer — ensure telemetry checkbox is checked (default **true**).
  2. For export-scope failures, use `RequestEngineeringHelpTrigger` with `surface="export-scope"` preset.
  3. Verify billing status **ACTIVE** if export entitlement chip shows amber — resolve via `/account/billing-hold` or admin billing activation.

### 🚨 Alert 20: Post-Logout Tenant Cookie Reappears on Subdomain Login
* **The Root Cause:** Stale middleware behavior re-stamping `ironframe-tenant` when cookie absent — fixed in 2026-07-06 delta; if regression occurs, `applySubdomainTenancy` may be stamping without checking cookie presence.
* **How to Resolve It Yourself:**
  1. Sign out — inspect cookies on `{slug}.lvh.me/login` — `ironframe-tenant` must be absent.
  2. Verify navigation uses `/api/auth/session-logout?next=%2Flogin` not direct `/login` link.
  3. Run `tests/unit/middlewareSubdomainTenancy.test.ts` — post-logout login test passes.
  4. Confirm `stampWorkspaceCookieClears` fires in middleware for unauthenticated auth public paths.

### 🚨 Alert 21: Workspace Settings Save Blocked — Read-Only View
* **The Root Cause:** Signed-in operator lacks **GRC_MANAGER** or **CISO** role on active tenant — `canEditWorkspaceProfile` returned false.
* **How to Resolve It Yourself:**
  1. Platform administrator assigns GRC_MANAGER or CISO via `user_role_assignments` for target tenant UUID.
  2. Reload `/settings/workspace` — amber read-only banner should disappear; Save buttons enable.
  3. Run `tests/unit/workspaceProfileEditorAccess.test.ts` — role matrix passes.

### 🚨 Alert 22: GTM Briefing Draft Stuck in Quarantine — Never Appears on Governance Frame
* **The Root Cause:** Expected behavior — autonomous cron and manual requests stage into `docs/briefing-queue/` only. Operator has not clicked **Approve** (promote) in Ops Hub Briefings or Newsletters desk.
* **How to Resolve It Yourself:**
  1. Open `/dashboard/operations?tab=briefings` — locate draft in quarantined list.
  2. Review Section V citations and validation badges — fix validation errors if `validation ok` is amber.
  3. Click **Approve** — verify promotion message cites `/governance-frame/{slug}`.
  4. If draft should be discarded, click **Deny** — confirm `briefing_queue_denials` row and removal from desk.
  5. Run `tests/unit/autonomousGtmBriefingQueue.test.ts` — confirm cron never sets `publishState` to published.

### 🚨 Alert 23: SMS DISPATCH Fails — E.164 or Provider Configuration
* **The Root Cause:** HITL DISPATCH on SMS draft requires valid `contact.phone` in E.164 format and configured provider credentials. Email fallback is intentionally disabled for SMS drafts.
* **How to Resolve It Yourself:**
  1. Verify contact record has phone normalized via `normalizeE164Phone` — US 10-digit numbers become `+1XXXXXXXXXX`.
  2. For Twilio: set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM_NUMBER` (Twilio-owned E.164 — not Google Voice).
  3. For Textbelt: set `SMS_PROVIDER=textbelt` and `TEXTBELT_API_KEY`.
  4. Re-DISPATCH from `/dashboard/admin/approvals` — verify response `channel: SMS` and `messageSid` present.
  5. Run `tests/unit/salesSmsDispatch.test.ts` — provider resolution and branded body pass.

### 🚨 Alert 24: IronBoard Query Stuck on Streaming in Ops Portal Iframe
* **The Root Cause:** Vercel proxy SSE buffering, missing `__IRONBOARD_API_ROOT__`, trailing-slash 308 on console proxy base href, or Gemini stream exceeded **55000** ms round timeout.
* **How to Resolve It Yourself:**
  1. Verify `resolveBoardroomEmbedUrl` selects direct HTTPS Cloud Run upstream when reachable.
  2. Confirm `ironboardConsoleProxyPath` has no trailing slash on root proxy path.
  3. Check `#status` for timeout or rate-limit message from `classifyGeminiStreamFault`.
  4. Validate `GOOGLE_API_KEY` shape (30–64 chars, starts with `AIza`, no `@` contamination).
  5. Run `tests/unit/ironboardConsolePaths.test.ts` and `tests/e2e/ironboardOpsPortalProduction.spec.ts`.

### 🚨 Alert 25: Ironleads Duplicate SUSPECT Rows After Harvest Replay
* **The Root Cause:** Historical clone contacts stacked before ingress dedupe hardened — or race before dedupe key matched.
* **How to Resolve It Yourself:**
  1. POST duplicate ingress — verify API returns `PERIMETER_INGRESS_DEDUPE` with HTTP **200**.
  2. Run `npx tsx scripts/purge-duplicate-suspects.ts` against development CRM scope.
  3. Refresh Ironleads ops portal — verify `collapseSuspectRowsByCompany` shows one row per company.
  4. Run `tests/unit/ironleadsIngressDedupe.test.ts`.

### 🚨 Alert 26: Path B Provision Rejects Operator Email
* **The Root Cause:** `validateClientOwnedOperatorEmail` blocks `@ironframegrc.com` addresses — design partners must use client-owned mailboxes.
* **How to Resolve It Yourself:**
  1. Enter operator email at client domain (e.g. `ciso@acme.com`).
  2. Re-run quick provision or invite flow from admin onboarding.
  3. Run `tests/unit/clientOwnedOperatorEmail.test.ts`.

### 🚨 Alert 27: CRM Scope Missing in Vercel Production
* **The Root Cause:** `IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG` unset in Vercel Production — no medshield fallback when `VERCEL_ENV=production`.
* **How to Resolve It Yourself:**
  1. Set `IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG=pilot1` (or active pilot slug) in Vercel Production environment.
  2. Local dev: unset falls back to medshield; force-require locally with `IRONFRAME_REQUIRE_OPERATIONS_CRM_SCOPE=1`.
  3. Redeploy perimeter workers after CRM scope correction.

### 🚨 Alert 28: Commercial SKUs Active Before GA Approval
* **The Root Cause:** `IRONFRAME_COMMERCIAL_GA` set to `1` before Item 2C approval and live Stripe Prices attached — draft SKUs in `config/commercialSkus.ts` must remain inactive.
* **How to Resolve It Yourself:**
  1. Keep `IRONFRAME_COMMERCIAL_GA=0` (or unset) until GA gate approved.
  2. External copy must say **planned GA** for Command Tier ~**3500000** cents/yr pricing.
  3. Path B checkout uses **499900** cent Stripe metadata — verify `stripeCheckoutParse.test.ts` passes.

### 🚨 Alert 29: Product Knowledge Drift — Pre-Commit or Ops Hub Banner Blocks Progress
* **The Root Cause:** `lib/ironframeProductKnowledge/commercial.ts` changed without running sync, or `docs/sales-enablement/` mirrors drift from `docs/sales/` sources, or stale Path B literals exist in blast-radius consumer files. Pre-commit `pre-commit-knowledge-check.mjs` or CI `knowledge:check` exits **1**.
* **How to Resolve It Yourself:**
  1. Run `npm run knowledge:check` — read findings for mirror drift, missing anchors, or spine-changed info.
  2. Run `npm run knowledge:sync` locally — review `git diff` on enablement mirrors and `.fingerprint.json`.
  3. Commit synced files — retry commit; pre-commit should pass when drift cleared.
  4. Open Ops Hub overview — use **Sync now** on amber banner if on writable host; on Vercel use local sync only.
  5. Restart IronBoard :8082 and redeploy perimeter workers listed in blast-radius report.
  6. Run `tests/unit/ironframeProductKnowledge.test.ts`, `productKnowledgeSync.test.ts`, `productKnowledgeOpsCore.test.ts`.

### 🚨 Alert 30: Governance Frame Legacy Slug Returns 404
* **The Root Cause:** External link or RSS item references a promoted briefing slug that was renamed after publication — canonical ledger row exists under a different filename slug and no redirect entry was added to `PUBLISHED_BRIEFING_SLUG_REDIRECTS`.
* **How to Resolve It Yourself:**
  1. Identify canonical slug in `docs/published-briefings/` filesystem ledger.
  2. Add legacy → canonical mapping in both `app/lib/governanceFrame/publishedBriefingSlugRedirects.ts` and `Ironboard/src/governanceFrame/publishedBriefingSlugRedirects.ts`.
  3. Verify **301** redirect on Next.js app and IronBoard mirror router.
  4. Run `tests/unit/publishedBriefingSlugRedirects.test.ts` — add test case for new mapping.

### 🚨 Alert 31: Ops Worker Chat Invents Docs Hub Layout or Success Portal KB
* **The Root Cause:** Operator asked location question and LLM synthesis bypassed canonical routing — **ANTI-HALLUCINATION** mandate violation. Docs Hub uses `DocsChrome` reader shell, not Command Center 22/48/30 tripane; partner training lives on `/docs` and `/get-started`, not Success Portal Knowledge Base.
* **How to Resolve It Yourself:**
  1. Ask IronBoard directly via boardroom Query — verify `resolveCanonicalBoardResponse` returns deterministic prose for docs/training location queries.
  2. Restart Ironframe core — confirm `opsWorkerChatCore.ts` injects `buildAntiHallucinationMandate()` and per-worker spine blocks.
  3. Run `Ironboard/src/tests/docsLocationCanonicalRouting.test.ts` and `tests/unit/opsWorkerSuccessMandate.test.ts`.

### 🚨 Alert 32: Marketing Archive Shows Empty — No Published Cards
* **The Root Cause:** No briefings promoted to `docs/published-briefings/` yet, or all rows classified internal/staging — `isPublicPublishedClassification()` filters them from `/resources/briefings`.
* **How to Resolve It Yourself:**
  1. Open Ops Hub briefings desk — promote a validated draft via **Approve**.
  2. Verify file lands in `docs/published-briefings/` with public classification frontmatter.
  3. Reload `/resources/briefings` — cards should appear with `governanceFrameBriefingUrl(slug)` canonical links to `https://research.ironframegrc.com/briefings/{slug}`.
  4. Run `tests/unit/publishedBriefingLedgerCards.test.ts` — eligibility and sort pass.

### 🚨 Alert 33: Research Publication Host Returns 403 on Cloud
* **The Root Cause:** Request hit apex cloud host expecting research publication but middleware quarantine blocked before research-host bypass — or host header is not in `isGovernanceFramePublicHost()` allowlist.
* **How to Resolve It Yourself:**
  1. Verify DNS points `research.ironframegrc.com` to Vercel deployment with correct domain binding.
  2. Confirm `deploymentQuarantine.ts` calls `isGovernanceFramePublicHost()` before blocking — research hosts must return false from `shouldBlockProductionIngress`.
  3. For local preview use `/gf-research` on apex or configure `research.localhost` in hosts file.
  4. Run `tests/unit/governanceFramePublic.test.ts` and `tests/unit/deploymentQuarantine.test.ts` — research host bypass passes.

### 🚨 Alert 34: Ops Calendar Tab Empty After Seed
* **The Root Cause:** `OpsActivity` migration not applied, schedule seed not run, or `buildOpsScheduleSnapshot()` caught error and returned empty activities array with console warning `[operations-hub] schedule snapshot unavailable`.
* **How to Resolve It Yourself:**
  1. Run `npx prisma migrate deploy` — verify migration `20260717170000_ops_activities_schedule` applied.
  2. Open Ops Hub Calendar tab — click **Seed all projects 2026** — verify success message listing summer, video, and rollout milestones.
  3. Inspect `ops_activities` table — confirm rows with `due_at` and `kind` populated.
  4. Verify cron route registered in `vercel.json` at `/api/cron/ops-schedule-reminders`.

### 🚨 Alert 35: Promoted Briefing Still Shows on Approve Desk
* **The Root Cause:** Pre-2026-07-18 behavior retained queue file after promote — today's delta filters published slugs from desk via Postgres `publishedBriefing` lookup. If slug mismatch between queue filename derivation and promoted slug, row may still appear.
* **How to Resolve It Yourself:**
  1. Verify promote success message includes `removedFromQueue: true` in API response when filesystem unlink succeeded.
  2. Confirm `slugFromQueueFilename()` matches promoted slug in `PublishedBriefing` row.
  3. Manually delete stale queue file if promote succeeded but unlink failed (EPERM on Windows — close editor handles first).
  4. Reload Ops Hub snapshot — held/active partitions should exclude promoted slug.

### 🚨 Alert 36: IronBoard PDF Export Blocked by Pop-Up Blocker
* **The Root Cause:** Browser blocked `window.open()` for print dialog — `#export-pdf-btn` requires pop-up permission.
* **How to Resolve It Yourself:**
  1. Allow pop-ups for `127.0.0.1:8082` IronBoard origin.
  2. Use **HTML** export button instead — open downloaded file and print to PDF from browser.
  3. Verify `#export-html-btn` downloads `ironboard-boardroom-{stamp}.html` with formatted markdown body.

### 🚨 Alert 37: GF Desk Run Returns 400 — requestPrompt Too Short
* **The Root Cause:** Author mode requires `requestPrompt` with minimum **40** characters — shorter prompts fail validation before gf-researcher generation starts.
* **How to Resolve It Yourself:**
  1. Expand research brief to at least 40 characters with topic scope, jurisdiction, and source hints.
  2. Retry **Author via GF desk** or POST desk-run with `{ mode: "author", requestPrompt: "...", title: "...", tenantSlug: "ironframe-sandbox" }`.
  3. Verify HTTP **201** and `staged: true` in response JSON.

### 🚨 Alert 38: Boardroom Answers Workforce Red Dots with Labor-Market Statistics
* **The Root Cause:** Pre-2026-07-19 boardroom routed workforce indicator questions to web grounding or CRM discovery — conflating Ops product-matrix health with macro labor data.
* **How to Resolve It Yourself:**
  1. Confirm IronBoard build includes `isPerimeterWorkforceHealthQuery()` and `formatPerimeterWorkforceHealthAnswer()`.
  2. Ask explicitly: **"Why is Ironleads red on the product matrix?"** — answer must cite `:8083` health probe and `checkedAt`, not BLS or Conference Board statistics.
  3. Inspect SSE — verify `productMatrixHealth` tool receipt (not `webSearch` or `manageCrmPipeline`).
  4. Run `Ironboard/src/services/boardroomQueryIntent.test.ts` — perimeter health cases pass.

### 🚨 Alert 39: Desk Review Shows ready But Approve Still Blocked
* **The Root Cause:** `readyForHumanOperator: true` is **advisory only** — promote validation (`validateBriefingQueueDraft` with `promotion: true`) may still fail on missing Section V citations, forbidden sales claims, or float cent registers.
* **How to Resolve It Yourself:**
  1. Open draft **Read** modal — inspect validation badge (ok vs needs review).
  2. Review `.desk-reviews/{base}.desk.json` findings for verifier fail or product-boundary fail statuses.
  3. Edit queue markdown or re-run desk review after fixes — human **Approve** remains required regardless of desk ready flag.
  4. Set `IRONFRAME_BRIEFING_DATA_TEST_ACK=1` in local Core before promote in data-test environments.

### 🚨 Alert 40: SUSPECT Report Shows NOT_PROSPECT_POOL Blocker
* **The Root Cause:** Contact ingested under a tenant slug other than `prospect-pool` — SalesTeam PROSPECT poll cycle scopes outreach to prospect-pool CRM only per design-partner launch mandate.
* **How to Resolve It Yourself:**
  1. Open `/dashboard/operations/ironleads/suspects/{contactId}` — read **Why not in the PROSPECT queue** section.
  2. Verify contact `tenantSlug` in report header — must be `prospect-pool` for SalesTeam handoff.
  3. Re-ingest or migrate contact to prospect-pool scope before expecting SalesTeam poll drafts.
  4. Run `tests/unit/ironleadsSuspectReportCore.test.ts` — `NOT_PROSPECT_POOL` blocker path passes.

### 🚨 Alert 41: Approvals Desk Shows Wrong Draft Kind After Filter Change
* **The Root Cause:** Browser bookmark or stale `?kind=` query param filters queue while operator expects all pending drafts — or active draft id not reset when filtered list empties.
* **How to Resolve It Yourself:**
  1. Click **All** chip on `/dashboard/admin/approvals` — verify combined queue loads.
  2. Use Ops Hub overview links (`Sales outreach`, `Support replies`, `CS advisories`) — each sets correct `?kind=` filter.
  3. Confirm `parseApprovalKindFilter()` accepts `CS` alias for customer success.
  4. Reload page — `Suspense` fallback should resolve to filtered desk without stale selection.

---

## 📋 Chapter 7: Unit Test Verification Checklist (Today's Delta)

Independent learners and compliance auditors must confirm the following Vitest suites pass before signing a daily lab receipt:

| Test file | Validates |
|-----------|-----------|
| `tests/unit/governanceFramePublic.test.ts` | Research origin, public host detection, briefing path helpers, internal prefix |
| `tests/unit/researchCatalog.test.ts` | Research paper/series listing, PUBLISHED gate, editorial policy doc readiness |
| `tests/unit/compileRss.test.ts` | RSS item URLs on research origin `/briefings/{slug}` |
| `tests/unit/governanceFrameEmail.test.ts` | Ironcast newsletter deep links to `governanceFrameBriefingUrl` |
| `tests/unit/publishedBriefingSlugRedirects.test.ts` | Legacy slug map, `resolvePublishedBriefingSlug` normalization |
| `tests/unit/publishedBriefingLedgerCards.test.ts` | Marketing archive eligibility, CTA stripping, newest-first sort |
| `tests/unit/appDocsNavigation.test.ts` | App docs nav section order, reading level badges, README hub routing |
| `Ironboard/src/tests/docsLocationCanonicalRouting.test.ts` | Docs hub and training location canonical responses, no tripane bleed |
| `tests/unit/opsWorkerSuccessMandate.test.ts` | SuccessTeam mandate spine injection, forbidden portal claims |
| `tests/unit/governanceFrameGoogleDocsMarkdown.test.ts` | GF-2026-001 markdown parser and Docs formatting pipeline |
| `tests/unit/briefingInfrastructureLock.test.ts` | Published ledger vs queue quarantine boundary |
| `tests/unit/briefingCitations.test.ts` | Citation extraction with editorial section synonyms; multi-line `* **[N] label**` bullet blocks with indented URLs |
| `tests/unit/ironframeProductKnowledge.test.ts` | Spine commercial constants, beachhead resolution, board binding exports |
| `tests/unit/productKnowledgeSync.test.ts` | Sync engine fingerprint, mirror build, stale literal detection, blast radius |
| `tests/unit/productKnowledgeOpsCore.test.ts` | Ops Hub apply gate (Vercel block), drift notice latch, operator hints |
| `tests/unit/autonomousGtmBriefingQueue.test.ts` | Topic rotation, autonomous draft filenames, quarantine-only publish state, cron disable flag |
| `tests/unit/denyBriefingQueueDraftCore.test.ts` | Postgres denial upsert, filesystem unlink, denied filename list |
| `tests/unit/stageBriefingQueueDraftCore.test.ts` | Queue filename pattern, validation gate, overwrite semantics |
| `tests/unit/salesSmsDispatch.test.ts` | SMS provider resolution, E.164 normalize, branded STOP footer, Twilio/Textbelt branches |
| `tests/unit/clientOwnedOperatorEmail.test.ts` | Rejects @ironframegrc.com operator addresses on Path B provision |
| `tests/unit/ironleadsIngressDedupe.test.ts` | SUSPECT identity key normalization, ingress dedupe response |
| `tests/unit/ironleadsSuspectLocation.test.ts` | Website URL normalization from domain/metadata, address line formatting |
| `tests/unit/ironleadsSuspectReportCore.test.ts` | SUSPECT blocker matrix, OSINT title noise, channel readiness flags |
| `tests/unit/opsScheduleCore.test.ts` | Schedule snapshot, checklist serialization, seed spec href links |
| `tests/unit/fetchOpsPortalJson.test.ts` | Ops portal JSON error extraction and HTTP status handling |
| `tests/unit/opsWorkerSpeech.test.ts` | Web Speech voice bind, mute/rate/pitch persistence |
| `tests/unit/ironboardConsolePaths.test.ts` | Console proxy path without trailing slash, `resolveBoardroomEmbedUrl`, base href injection |
| `tests/unit/resolveIronboardBaseUrl.test.ts` | Upstream URL resolution for ops portal embed |
| `tests/unit/operationsApiRedaction.test.ts` | Ops hub API response redaction for portal clients |
| `tests/unit/designPartnerDocumentationPacket.test.ts` | Design partner operator packet doc policy and slug presence |
| `tests/unit/documentationBrief.test.ts` | One-way documentationBrief builder, dual-plane matrix, message-constitution federation |
| `tests/unit/onboardingContentPolicy.test.ts` | Get Started partner index policy, no classroom seed bleed |
| `tests/unit/getStartedOrientationCues.test.ts` | Retimed orientation screenshot cues for partner packet |
| `tests/unit/getStartedOrientationGuide.test.ts` | Orientation guide hash and fallback href to operator packet |
| `tests/unit/getStartedAudioAsset.test.ts` | Regenerated training audio asset paths |
| `tests/unit/getStartedAudioPaths.test.ts` | Step-level MP3 path resolution under `public/training-audio/steps/` |
| `Ironboard/src/tests/orientationAudioScriptGenerator.test.ts` | Partner packet corpus load, retimed section markers, export path narration |
| `tests/e2e/ironboardOpsPortalProduction.spec.ts` | Ops portal IronBoard iframe Query smoke on production upstream |
| `tests/e2e/ironboardCloudRunSmoke.spec.ts` | Cloud Run ironboard health and readiness probes |
| `Ironboard/src/lib/geminiCredentialHealth.test.ts` | GOOGLE_API_KEY shape validation and readiness payload |
| `Ironboard/src/lib/geminiRetry.test.ts` | Rate-limit retry classification and backoff |
| `SalesTeam/tests/outboundDraftsman.test.ts` | Path B $4999 email/SMS drafts, workflow-review CTA, BigInt cents display |
| `tests/unit/inTenantSupportModal.test.ts` | Framework context mapping, Golden Path objective resolution, ticket input parsing and rejection |
| `tests/unit/inTenantSupportTelemetry.test.ts` | Forensic telemetry build with BigInt ALE cents string, billing export entitlement, CRM format block |
| `tests/unit/workspaceProfileEditorAccess.test.ts` | GRC_MANAGER and CISO edit roles; deny without assignment |
| `tests/unit/performClientSessionLogout.test.ts` | Workspace cookie clear + server logout redirect URL |
| `tests/unit/sessionLogoutCore.test.ts` | Safe `next` path resolution; open redirect rejection |
| `tests/unit/middlewareSubdomainTenancy.test.ts` | Post-logout `/login` without tenant cookie stamp; stale cookie realignment |
| `tests/unit/deploymentQuarantine.test.ts` | Narrow funnel public paths, private workspace block, localhost and lvh.me whitelist, dual Stripe webhook bypass, token-gated API bypass, `IRONFRAME_ALLOW_PUBLIC_INGRESS` |
| `tests/unit/dashboardRoleAccess.test.ts` | RBAC gate states, `ensureDashboardTenantSession` cookie hydration |
| `tests/unit/commandCenterTenantAccess.test.ts` | GLOBAL_ADMIN vs scoped tenant switcher, subdomain host lock |
| `tests/unit/grcRouteMatch.test.ts` | Header route matrix, auth public path, constitutional sentinel paths |
| `tests/unit/registrationGate.test.ts` | Invite-only prospect ingress blocking |
| `tests/unit/registrationRoutes.test.ts` | Public registration route classification |
| `tests/unit/phase1Commercial.test.ts` | Phase 1 monetization wire paths |
| `tests/unit/stripeCheckoutParse.test.ts` | Stripe checkout metadata BigInt cent parsing |
| `tests/unit/tenantSubdomain.test.ts` | Subdomain slug resolution, post-auth landing paths |
| `tests/unit/tenantSlugRegistry.test.ts` | Dynamic tenant slug cache and lookup |
| `tests/unit/demoMode.test.ts` | Demo sandbox paths and ALE cent constants |
| `tests/unit/stagedNavSurfaces.test.ts` | Staged nav badge and role block matrix |
| `tests/unit/boardResponseLibrary.test.ts` | YouTube denial strip and rewrite append |
| `tests/unit/platformApplicationBoundary.test.ts` | Ironframe port 3000 vs IronBoard port 8082 |
| `tests/unit/boardroomOrchestrator.test.ts` | Panel routing receipts and sales-lead canonical boundary |
| `tests/unit/videoIngress.test.ts` | Irongate Zod schema quarantine and CLEAN path |
| `tests/unit/videoBoardPrefetch.test.ts` | Timeline injection into boardroom orchestration |
| `tests/unit/strategicIntelIngress.test.ts` | Agent 14 sanitization before CRM persistence |
| `tests/unit/docsMatrixIngress.test.ts` | BigInt `docsMatchedUnits` pipeline counters |
| `tests/unit/linkScraper.test.ts` | YouTube and YouTube Shorts URL extraction |
| `tests/unit/ironframeTheme.test.ts` | Theme ID resolution and body attribute mapping |
| `tests/unit/devConstitutionalElevation.test.ts` | Scoped dev authority match order |
| `tests/unit/publicLeadParse.test.ts` | Prospect lead payload parsing |
| `tests/tenantBrand.test.ts` | Tenant brand accent resolution |
| `tests/unit/governanceFrameBriefingScanner.test.ts` | Published ledger ingest and briefing-queue quarantine warnings |
| `tests/unit/governanceFrameSanitize.test.ts` | Cent register rejection, section II parse, markdown XSS strip |
| `tests/unit/governanceFrameEmail.test.ts` | Ironcast newsletter feed origin and slug deep links |
| `tests/unit/financialIngressInvariant.test.ts` | Unified BigInt cent bridge across Governance Frame, sales intake, canonical baselines |
| `tests/unit/compileRss.test.ts` | Governance Frame RSS item URL encoding |
| `Ironboard/src/services/coreTelemetryBridge.test.ts` | Telemetry bridge cookie forwarding, fail-closed disconnect, successful JSON hydration |
| `Ironboard/src/services/boardroomQueryIntent.test.ts` | Multi-country prefetch intent, `inferRegionsFromQuery`, Germany ICP criteria match, `isPerimeterWorkforceHealthQuery` labor-market exclusion and product-matrix positive cases |
| `Ironboard/src/services/productMatrixHealth.test.ts` | Perimeter health answer formatting, unreachable service listing, HIGH priority static label semantics |
| `Ironboard/src/services/marketIntelligence.test.ts` | Multi-region listProspects filter, `fetchProspectingBatchForTargets` merge, tier score REJECTED path |
| `tests/architecture/gatewayShield.test.ts` | Irongate DMZ markers on all Prisma-importing API routes |
| `tests/unit/agentPerimeter.test.ts` | Sales agent prospect pool tenant isolation; customer service route with in-tenant telemetry mock |
| `tests/unit/approvalQueueCore.test.ts` | Pending draft tier inference and dispatch tags |
| `tests/unit/documentationBrief.test.ts` | One-way documentationBrief builder and plane separation |
| `tests/unit/docsContentDecoupling.test.ts` | APP_DOCS vs GOVERNANCE_BRIEFINGS decoupling |
| `tests/unit/documentationCorpusPlanes.test.ts` | Dual-location output matrix authoritative entries |
| `tests/unit/tenantFeatureEntitlement.test.ts` | Tenant feature entitlement gate on API routes |
| `tests/unit/trainingCorpusPlacement.test.ts` | Trainer/Writer placement target resolution |
| `tests/unit/adminOnboardingDeployments.test.ts` | Admin onboarding deployment snapshot |
| `tests/unit/stripeConfig.test.ts` | STRIPE_CREDENTIAL_MODE and dual webhook secret resolution |
| `tests/unit/supabaseRedirectAllowlist.test.ts` | Auth redirect origin allowlist |
| `tests/unit/industryScoutProspectBridge.test.ts` | Industry scout cron prospect bridge |
| `tests/unit/marketProspectAuthenticity.test.ts` | Regional prospect authenticity scoring |
| `tests/unit/discoverRegionalProspects.test.ts` | Regional fintech discovery engine |
| `tests/unit/serialization.test.ts` | BigInt JSON serialization guards |
| `tests/e2e/ingestionPipeline.spec.ts` | Public lead workflow review CTA, executive lead ledger confirmation copy |
| `tests/e2e/docs-public.spec.ts` | Playwright E2E public `/docs` narrow funnel |
| `Ironboard/tests/trainingCorpus.test.ts` | Training corpus publisher IronBoard package |
| `lib/sustainability/ironbloomDashboardTelemetry.test.ts` | kWh threat ingestion telemetry parse |

Run command: `npm run test` (root Vitest) plus `cd Ironboard && npm test` (IronBoard package suite per `.github/workflows/ci.yml`). CI also runs Stryker mutation on configured modules and Playwright E2E. All suites must pass before GCP deploy readiness per project rules Warden gate.

---

## 📎 Chapter 8: Environment Variable Reference (Delta Additions)

The following `.env.example` entries were added or clarified in today's delta. Never commit live secrets — placeholders only:

| Variable | Purpose |
|----------|---------|
| `IRONBOARD_BOARD_ORG_TENANT_UUID` | Board-level Strategic Intel tenant UUID (default Medshield seed) |
| `IRONBOARD_GRC_ANALYST_VIDEO_URL` | Canonical YouTube URL for GRC Analyst briefing video |
| `IRONFRAME_ALLOW_PUBLIC_INGRESS` | Set `1` to open all cloud ingress paths (default blocked on non-local hosts) |
| `IRONFRAME_SUBDOMAIN_TENANCY` | Set `0` to disable host → tenant binding (enabled by default) |
| `IRONFRAME_TENANT_APEX_DOMAIN` | Production apex for `*.ironframegrc.com` tenant hosts |
| `NEXT_PUBLIC_DEVELOPMENT_DOMAIN` | Local dev tenant suffix (default `lvh.me:3000`) |
| `INTERNAL_SALES_PROVISION_KEY` | Bearer token for `POST /api/register/sales-intake` |
| `NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL` | Hosted Stripe Payment Link on `/pricing` |
| `STRIPE_SECRET_KEY` | Server-only Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `CURSOR_API_KEY` | Headless Cursor CLI auth for `scripts/cron_narrate.ps1` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only corporate invite and admin password provisioning |
| `NEXT_PUBLIC_APP_URL` | Production `https://ironframegrc.com` — auth redirects and apex routing |
| `IRONFRAME_DEV_SUPABASE_EMAIL` | Scoped dev constitutional authority email match |
| `IRONFRAME_DEV_SUPABASE_USER_ID` | Scoped dev constitutional authority user id match |
| `IRONFRAME_CRON_SECRET` / `IRONFRAME_INTERNAL_GATES_SECRET` | Internal gates for slug resolve and platform admin probe |
| `GOVERNANCE_FRAME_UPSTREAM` | Optional IronBoard upstream for local proxy (`http://127.0.0.1:8082`) |
| `GOVERNANCE_FRAME_PUBLIC_FEED_ORIGIN` | Public feed origin for RSS and Ironcast email deep links (default `https://brief.ironframegrc.com`) |
| `IRONFRAME_CORE_ORIGIN` | Ironframe core origin for IronBoard telemetry bridge (default `http://127.0.0.1:3000`) |
| `IRONFRAME_MARKETING_ORIGIN` | Fallback origin when `IRONFRAME_CORE_ORIGIN` unset |
| `GOOGLE_API_KEY` | IronBoard Gemini + Google Search grounding for regional prospect discovery, sales agent, customer service console |
| `IRONFRAME_PROSPECT_POOL_TENANT_UUID` | Prospect pool tenant for unauthenticated sales agent (fallback `tenant_prospect_pool_01`) |
| `INTERNAL_GATEWAY_SECRET_KEY` / `IRONFRAME_INTERNAL_GATES_SECRET` | Bearer token for `POST /api/documentation/execute` internal gateway |
| `STRIPE_CREDENTIAL_MODE` | Explicit `test` or `live` Stripe credential selection |
| `STRIPE_SECRET_KEY_TEST` / `STRIPE_SECRET_KEY_LIVE` | Mode-specific Stripe API keys |
| `STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET` | Webhook secret for `/api/webhooks/stripe` (checkout.session.completed) |
| `STRIPE_BILLING_WEBHOOK_SECRET` | Webhook secret for `/api/billing/webhook` (payment_intent.succeeded) |
| `IRONFRAME_STAGING_APEX_DOMAIN` | Staging Vercel apex for tenant subdomain slug resolution |
| `IRONBOARD_SEMI_AUTONOMOUS_MODE` | Set `1` for rate-limited background web-grounded prospect discovery |
| `RESEND_API_KEY` | IronBoard Resend email package outbound |
| `GTM_BRIEFING_QUEUE_CRON_ENABLED` | Set `false` to disable autonomous weekday GTM briefing-queue authorship |
| `GTM_BRIEFING_QUEUE_TENANT_SLUG` | Tenant slug for autonomous draft frontmatter (default `ironframe-sandbox`) |
| `IRONFRAME_LOCAL_CORE_ORIGIN` | Windows GTM cron prefers local core so queue files persist in repo (default `http://127.0.0.1:3000`) |
| `IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG` | Server-resolved CRM scope for ops portals — **required** in Vercel Production (e.g. `pilot1`); local unset falls back to medshield |
| `IRONFRAME_REQUIRE_OPERATIONS_CRM_SCOPE` | Set `1` locally to force-require CRM scope slug (no medshield fallback) |
| `IRONFRAME_COMMERCIAL_GA` | Set `1` only after Item 2C approval + live Stripe Prices; default `0` keeps draft SKUs inactive |
| `TWILIO_SMS_FROM_NUMBER` | Twilio-owned E.164 From number for sales SMS after HITL DISPATCH |
| `SALESTEAM_SMS_FROM` | Alias read by SalesTeam worker for SMS From number |
| `SMS_PROVIDER` | `twilio` (default) or `textbelt` when Textbelt preferred |
| `TEXTBELT_API_KEY` | Textbelt API key for SMS without Twilio number verification |
| `TEXTBELT_SENDER` | Sender label for Textbelt commercial SMS (default `Ironframe`) |
| `OPERATIONS_IRONBOARD_URL` | IronBoard worker self URL for ops console proxy (deploy sets `http://127.0.0.1:8080` in container) |
| `OPERATIONS_IRONLEADS_URL` | Resolved peer URL for Ironleads Cloud Run service |
| `OPERATIONS_SALESTEAM_URL` | Resolved peer URL for SalesTeam Cloud Run service |
| `OPERATIONS_SUCCESS_TEAM_URL` | Resolved peer URL for IronSuccessTeam Cloud Run service |
| `OPERATIONS_SUPPORT_TEAM_URL` | Resolved peer URL for IronSupportTeam Cloud Run service |
| `IRONFRAME_ALLOW_PRODUCT_KNOWLEDGE_SYNC` | Set `1` on writable production ops host to allow Ops Hub **Sync product knowledge** apply; default blocked on Vercel (`VERCEL=1`) and production without explicit opt-in |
| `GOOGLE_OAUTH_CLIENT_FILE` | Path to OAuth Desktop client JSON for Governance Frame Google Docs utility (never commit) |
| `GOOGLE_OAUTH_TOKEN_FILE` | Path to saved OAuth token JSON for Google Docs sync (never commit) |
| `GOVERNANCE_FRAME_PUBLIC_FEED_ORIGIN` | Canonical public research publication origin (default `https://research.ironframegrc.com`) |
| `GOVERNANCE_FRAME_PUBLIC_HOSTS` | Optional comma-separated extra hosts treated as research publication surface (e.g. `research.localhost,brief.localhost`) |
| `IRONFRAME_BRIEFING_DATA_TEST_ACK` | Set `1` with local Core restart before promote writes to Postgres in data-test environments |
| `IRONFRAME_BRIEFING_DEPLOY_ACK` | Required with `--deploy` when syncing legacy brief static bucket via `sync:brief:gcs` |

---

## ✅ Chapter 9: Daily Writer Receipt (2026-07-20)

**Delta classification:** Backend Logic (`ironleadsSuspectLocation.ts`, `ironleadsSuspectReportCore.ts`, `ironleadsIngressCore.ts` website metadata merge, `approvalDraftKinds.ts`, tri-track `AdminApprovalDashboardClient.tsx`, Ops Calendar checklist expansion in `opsScheduleCore.ts` / `opsScheduleSeedSpecs.ts`, deny/promote hold clear symmetry) + UI (Ironleads suspect forensic report page, Ops Hub CRM website/address columns, approvals kind filter chips and hue-coded quick links, calendar checklist checkboxes and outcome prompts) + Perimeter Workers (Ironleads ingress location enrichment on deduped upsert — no auto PROSPECT promotion) + Retained structural modules from 2026-07-19 (GF Publication Desk, product-matrix health routing, research publication site, Ops Calendar Prisma model).

**Financial boundary verification:** All ALE references in this document use BigInt integer cents exclusively for persistence and internal telemetry. Constitutional Ironframe seed tenant baselines unchanged: Medshield **1110000000**, Vaultbank **590000000**, Gridcore **470000000**, Defense **1600000000** cents. Design Partner Path B on-ramp documented at **499900** cents (**$4,999**) via `DESIGN_PARTNER_PATH_B_CENTS` in `lib/ironframeProductKnowledge/commercial.ts` — single code truth. Planned GA Command **3500000** cents/yr (**$35,000**/yr) via `PLANNED_GA_COMMAND_CENTS`. Planned GA Growth **7500000** cents/yr (**$75,000**/yr) via `PLANNED_GA_GROWTH_CENTS`. July 17 OSINT `riskMetricsCents`: median annual GRC program **4580000000**, audit remediation lag **1015000000**, SaaS consolidation savings **762000000**, board reporting overhead **143000000** cents. Ironleads `priorityScore` and suspect location fields are explicitly non-monetary — website URLs and postal addresses carry no cent values. Stripe `amountTotalCents` and tenant `ale_baseline BIGINT` remain authoritative cent ingress.

**Threat simulation verification:** July 17 OSINT manifest (`ironintel-osint-2026-07-17-live`) FortiSandbox triple-CVE FCEB deadline **July 19** has passed — operators should verify Ironintel dashboard reflects post-deadline remediation posture. SonicWall SMA1000 CVE-2026-15409/15410, SharePoint CVE-2026-56164 machine-key theft, Coca-Cola fairlife OT ransomware, CMMC Phase II C3PAO suspension, AsyncAPI npm Miasma RAT carryover remain in manifest. Today's delta adds `looksLikeOsintTitleNoise()` to quarantine agency advisory titles mis-ingested as SUSPECT company names — reducing false-positive outreach targets without altering `SimThreatEvent` schema. Chaos engineering and `mitigated_value_cents BIGINT` paths unchanged. Shadow-plane self-test controls remain gated on `isSimulationMode === true` per TAS Section 4.3.

**Tenant isolation verification:** Suspect forensic reports load contact rows by `contactId` within ops CRM scope — no cross-tenant workspace bleed into authenticated customer cockpits. Ironleads ingress remains Irongate-sanitized perimeter path with explicit tenant binding on create. Tri-track approvals desk is GLOBAL_ADMIN only — tenant operators cannot DISPATCH sales or support drafts. Schedule activities are global ops desk Postgres rows — not tenant-bound briefing content.

**GTM quarantine verification:** No change to promote/hold/deny gates in today's delta — deny and promote both now call `clearBriefingQueueHold()` symmetrically. Calendar href links may point to quarantined queue drafts for operator navigation — clicking href does not publish. GF desk-run and `.desk-reviews` sidecars remain advisory from prior cycle.

**Product knowledge verification:** Approvals desk kind labels and dispatch copy originate from `APPROVAL_KIND_META` — not duplicated in worker configs. Ops Worker Chat anti-hallucination mandates retained from prior cycle. CI `knowledge:check` and `test:product-knowledge` run before Postgres bootstrap per `.github/workflows/ci.yml`.

**CI verification:** New suites `tests/unit/ironleadsSuspectLocation.test.ts`, `tests/unit/ironleadsSuspectReportCore.test.ts`; retained `Ironboard/src/services/productMatrixHealth.test.ts`, `Ironboard/src/services/boardroomQueryIntent.test.ts`, `tests/unit/opsScheduleCore.test.ts`. Prior-cycle suites from 2026-07-15 through 2026-07-19 remain mandatory. All suites listed in Chapter 7 must pass before deploy.

**Empty-diff pivot:** Not applicable — `daily_code_diff.txt` contains substantial deltas (note: artifact includes recursive self-diff bloat beyond line ~525348; Writer parsed code deltas from lines 1–525347 exclusively). Today's primary modules: Ironleads SUSPECT location enrichment and forensic report, tri-track HITL approvals filter desk, Ops Calendar checklist and multi-project seed expansion, symmetric hold clear on deny/promote, plus retained 2026-07-19 GF Publication Desk and product-matrix perimeter health modules.

---

*End of GRC Master Operations Manual & Technical Feature Glossary — Writer Narrative Architect complete mandate execution for operational date 2026-07-20.*
