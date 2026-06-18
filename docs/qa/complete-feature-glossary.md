# 📖 GRC Master Operations Manual & Technical Feature Glossary
## Standardized Sovereign Command Deck Training Playbook for Independent Learners
### Target Audience: High School Lab Technicians (Grade 11/12) & Independent Compliance Auditors
### System Architecture: Control-First Modular Agent Coordination Framework
### Operational Date: 2026-06-18
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
* **The App Reality:** In our platform, these rules are hardcoded into an electronic constitution known as the **TAS (Tenant Architecture Specifications)** file at `docs/TAS.md`. The software code is physically blocked from ever breaking these rules. Today's delta wires the **IronBoard Core Telemetry Bridge** so every `POST /api/query` on port **8082** must hydrate live Ironframe shared context from `GET /api/board/shared-context` on port **3000** before LLM synthesis — fail-closed HTTP **502** with `CORE_TELEMETRY_DISCONNECTED` when the bridge cannot reach tenant-scoped telemetry. The **Hardened Governance Layers** prompt block (`buildHardenedGovernanceLayers`) enforces a unidirectional read-only diode: the 17-agent boardroom advises from live JSON but holds zero write permissions to production databases. Public Governance Frame briefings must cite `financials.display.*.baselineFormatted` strings verbatim — never raw internal BigInt cent integers. Today's delta wires the **Documentation Brief one-way ingress**: Ironframe emits `documentationBrief` inside `GET /api/board/shared-context`; IronBoard Trainer (`board-trainer`) and Writer (`board-writer`) personas consume it exclusively — zero write-back to port **3000** production stores except via bearer-gated `POST /api/documentation/execute`.

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
  * **Constitutional seed baselines unchanged:** Medshield **1110000000**, Vaultbank **590000000**, Gridcore **470000000**, Defense **1600000000** cents remain the Irontrust verification anchors in `financialIngressInvariant.test.ts` and `verifyCanonicalEnterpriseBaseline`.

* **Mandate 2: Controlled Structural Amendments:** You are strictly forbidden from modifying layout parameters, data ingestion targets, or background agent structures silently. Any alteration requires a formal **TAS Amendment Proposal** routed to the Product Owner. The **Dynamic Discovery Mandate** on IronBoard now permits only **registered canonical responses** in `orchestrator/routing.ts` (for example sales-lead domain boundary text). All other boardroom answers must cite tool receipts.

* **Mandate 3: Verifiable Sustainability Unit Ingress:** Environmental footprint data must be logged using raw, physical units exclusively (such as kWh electricity, Liters water, or Kilometers logistics transport). The platform automatically rejects any sustainability telemetry packets containing purely monetary approximations to protect audit validity. `Ironwatch` system health columns (`sustainability_live_api_degraded`, `sustainability_api_heartbeat_failures`) now use `IF NOT EXISTS` guards for shadow-database replay safety.

* **Mandate 4: Absolute Tenant Isolation Enforcement:** Cross-tenant memory bleed is a critical security failure. Row-Level Security (RLS) constraints strictly isolate customer boundaries. You are completely forbidden from attempting to extract database rows from a separate company profile while logged into another. The dashboard gate (`resolveDashboardAccess`) binds workspace UUIDs exclusively from cookie scope or the operator's own `user_role_assignments` row — never from guessed tenant IDs.

* **Mandate 5: Public Conversion Perimeter & Customer Service Documentation Grounding:** All unauthenticated landing traffic (sales slide-over gateway, `/sales-agent-portal`, `POST /api/agents/sales`) must route to the prospect pool tenant UUID via `process.env.IRONFRAME_PROSPECT_POOL_TENANT_UUID` or fallback **`tenant_prospect_pool_01`** — never into authenticated customer workspaces. The customer service agent (`POST /api/agents/customer-service`) must ground exclusively against `app_documents` rows where `readingLevel: "LEVEL_1"`. Ironguard tenant validation runs before any documentation pull; fail closed with HTTP **403** when perimeter validation drops. All automated GRC reasoning nodes, sales plays, and customer service workers run at **`temperature: 0.0`** with no emojis or creative flourishes in production copy.

---

## 🎨 Chapter 3: True Screen Grid Coordinates & Panel Layout Proportions

The platform interface scales fluidly in sync with your window size using a fixed fractional grid. It divides your display monitor into **three permanent vertical panel columns**, each operating with independent vertical scrolling:

* **The Left Panel (Data Deck) [22% Screen Width]:** Houses active system security metric graphs, system maturity nodes, target asset profiles, and framework selection matrices.
* **The Center Panel (Workspace Canvas) [48% Screen Width]:** Contains the primary navigation path tabs, the horizontal GRC metric rows, and the large workflow control blocks.
* **The Right Panel (Audit Column) [30% Screen Width]:** Houses the **Sustainability Pulse** panel widget and the long, vertically extending **Live Audit Ledger Stream** terminal layout box.

### Layout Refactor Notes (2026-06-18 Delta)

Today's delta consolidates role-based dashboards under `app/(dashboard)/dashboard/*` — the legacy `app/roles/*` tree is deleted. Configuration moves from `/config` to `/settings/config`. Tenant topology and logs placeholder pages (`app/*/topology`, `app/*/logs`) are removed. Public `/docs` renders from PostgreSQL `app_documents` via `CompilationIngressPortal` when slug resolution fails filesystem lookup. Trust Center procurement pages mount at `/trust/*` inside the dashboard route group.

**Narrow public ingress funnel (2026-06-18):** Cloud hosts without `IRONFRAME_ALLOW_PUBLIC_INGRESS=1` permit only the narrow public funnel — not a full-host **403** on every path. Allowed cloud paths include `/`, `/terms`, `/privacy`, `/pricing`, `/marketing`, `/register/*`, `/sales-agent-portal`, `/governance-frame`, auth surfaces, `/account/billing-hold`, `/docs`, and `/api/auth/callback`. Private workspace surfaces (`/integrity`, `/dashboard/*`, `/cockpit`) remain **403** blocked until full ingress opt-in. Dual Stripe webhooks bypass quarantine: `/api/webhooks/stripe` and `/api/billing/webhook`. Token-gated API paths bypass quarantine — route handlers enforce Bearer secrets.

| Surface | Route examples | Chrome mounted | Scroll behavior |
|---------|----------------|----------------|-----------------|
| Public marketing landing | `/` (guest), `/marketing` | `MarketingHomepage` — no TopNav | Full-page vertical scroll |
| Public legal and pricing | `/terms`, `/privacy`, `/pricing`, `/register/contact` | Theme tokens only | Full-page scroll |
| Sales agent portal | `/sales-agent-portal` | `MarketingSalesPortalTrigger` + `SalesAgentSlideOver` | Full-page scroll |
| App docs reader | `/docs`, `/docs/[slug]` | `DocsChrome` — DB-backed `AppDocument` | Full-page scroll |
| Governance Frame reader | `/governance-frame`, `/governance-frame/[slug]` | `GovernanceFrameLayout` | Full-page scroll; `robots: index false` |
| Auth public paths | `/login`, `/forgot-password`, `/reset-password`, `/unauthorized`, `/legal/accept` | Themed forms | Full-page scroll |
| Dashboard command center | `/`, `/integrity` (authenticated), `/dashboard/*` | `DashboardCommandCenterLayout` → `AppShell` → `TopNav` | Tripane columns scroll independently |
| Trust Center | `/trust`, `/trust/dpa`, `/trust/subprocessors`, `/trust/data-residency` | Dashboard chrome — `TrustProcurementDocument` | Standalone scroll |
| Tenant subdomain workspace | `http://{slug}.lvh.me:3000/integrity` | Host-bound tenant switcher lock | Tripane or standalone |
| Platform admin onboarding | `/admin/onboarding` | `AdminOnboardingDeployments` panel | Standalone scroll within gate |
| Standalone dashboard pages | `/evidence`, `/board-report`, `/reports/audit-trail` | TopNav chrome | `standaloneScroll` on AppShell |

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
  4. Pathname is **not** a narrow public funnel path (`isPublicCloudIngressPath`: `/`, `/terms`, `/privacy`, `/pricing`, `/marketing`, `/sales-agent-portal`, `/register/*`, auth surfaces, `/legal/accept`, `/account/billing-hold`, `/docs`, `/governance-frame`, `/api/auth/callback`)
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
* **Technical Mechanics:** Powered by the `Ironbloom` agent (Agent 17), which mandates physical hardware metrics (kWh electricity, Liters water, Kilometers logistics transport) and completely rejects flat monetary data. Today's delta adds `parseThreatIngestionTelemetry` in `lib/sustainability/ironbloomDashboardTelemetry.ts` — extracts kWh from `ThreatEvent.ingestionDetails` JSON for `recordSustainabilityImpact` carbon trace (`mitigatedValueCents` as **BigInt**). `productionCarbonLedger.ts` and `tenantPhysicalTelemetry.ts` feed dashboard telemetry. `resolveDashboardMitigatedValueCents` feeds the Command Center hero with **BigInt** mitigated cents displayed through `formatCentsToUSD` — display layer only.
* **Step-by-Step Lab Validation:**
  1. Read the active footprint calculation line (e.g., **`382 gCO₂eq/kWh`**) and confirm the orange **`FALLBACK ACTIVE`** badge when offline.
  2. Swap tenant context from Vaultbank (**590000000** cent baseline) to Gridcore (**470000000** cent baseline).
  3. Verify graph cache flush and redraw for the new company's physical infrastructure footprint.

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
* **Technical Mechanics:** Conversation plane header `x-ironframe-conversation-plane: ironboard-boardroom` gates boardroom-specific orchestration on IronBoard port **8082**. `POST /api/query` execution order (2026-06-18):
  1. **Core telemetry bridge prefetch** — `fetchIronframeSharedContext({ incomingRequest, tenantId })` performs server-to-server `GET {IRONFRAME_CORE_ORIGIN}/api/board/shared-context` with forwarded `ironframe-tenant` cookie or injected tenant UUID/slug headers (`x-ironboard-telemetry-bridge: 1`). Timeout **12000** ms. On failure → HTTP **502** JSON `{ ok: false, error: "CORE_TELEMETRY_DISCONNECTED", detail }` — no LLM stream starts.
  2. **SSE tool receipt** — `coreTelemetryBridge` complete with byte count logged before link scraper phase.
  3. **Hardened governance layers** — `buildHardenedGovernanceLayers(liveSystemTelemetryJson)` prepended to system instruction via `buildBoardroomSystemInstruction`. Six layers: unidirectional diode (read-only), live metric hydration JSON block, de-classification matrix (no raw BigInt cents in public copy), Governance Frame triad scaffold, executive persona ratios, mandatory Sources & Citations section for briefing drafts.
  4. **Multi-region workspace prefetch** — when `shouldPrefetchProspects(query)` matches, `inferRegionsFromQuery(query, activeHub)` resolves target countries from query text, `matchCountriesInQuery`, or `parseActiveTargetCountries(activeHub)` stream payload; passes `{ region }` or `{ regions: [...] }` to `queryLocalWorkspace` active_prospects.
  5. **Panel routing** — `routeExecutivePanel` attaches a `BoardroomOrchestrationReceipt`:
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
  6. Inspect server logs for `[LAYER 2: LIVE METRIC HYDRATION]` block presence in system instruction assembly.
  7. Run `Ironboard/src/services/coreTelemetryBridge.test.ts` — all pass including cookie forwarding and fail-closed 401 handling.

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
  * `isScrollableStandalonePath` — drives `DashboardGroupShell` overflow behavior; includes `/docs`, `/settings/config`
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
  2. Sign out via profile menu — verify redirect to `/login` and guest state on return.
  3. Confirm no duplicate auth listeners in TopNav (network tab — single session refresh path).

---

<a id="cron-001"></a>

### 🌙 Feature 18: 03:00 Documentation Engine (Cron Narrate)
* **GRC Function ID:** `CRON-001`
* **Exact Screen Coordinates:** No UI — scheduled Windows Task Scheduler or headless PowerShell invocation at 03:00 local.
* **Operational Purpose:** Executes three Cursor CLI agent phases nightly: Writer (this glossary), Ironintel OSINT sweep, and Ironlogic/Irontally governance memo.
* **Technical Mechanics:** `.cursorrules` simplified — removed cron persona JSON block; Writer/Trainer mandates remain in project rules and this glossary. `scripts/cron_narrate.ps1` delta improvements:
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
* **Technical Mechanics:** `app/(dashboard)/DashboardCommandCenterLayout.tsx` renders a flex column with `AppShell` as the sole child. Root `app/layout.tsx` provides fonts, `IronframeThemeProvider`, and global CSS only. This satisfies TAS UI separation: presentation tokens are global; tenant-scoped navigation is dashboard-group only.
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
* **Technical Mechanics:** `app/lib/auth/dashboardTenantSession.ts`:
  * `IRONFRAME_TENANT_COOKIE` = `ironframe-tenant`
  * `tenantCookieValueForUuid` — resolves canonical slug via `tenantKeyFromUuid` or Prisma `tenant.slug` lookup
  * `applyDashboardTenantSessionCookie` — sets secure cookie in production (`sameSite: lax`, 180-day max-age)
  * `ensureDashboardTenantSession` in `dashboardRoleAccess.ts` — calls apply only when `tenantFallbackApplied: true`
  * `resolveDashboardActiveTenantUuid` — React `cache()` wrapper; cookie scope first, then RBAC assignment, Medshield UUID fallback
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
  * `buildCanonicalGrcVideoBriefingResponse` — timecoded transcript from `grcAnalystDayVideoSeed.ts`
  * `resolveCanonicalBoardResponse` — deterministic bypass before LLM synthesis
  * `boardroomQueryIntent.ts` (2026-06-18): `inferRegionsFromQuery` returns country array from `matchCountriesInQuery`, query London/Singapore tokens, or `parseActiveTargetCountries(activeHub)`; `shouldPrefetchProspects` matches Germany/Australia/Canada ICP questions; `shouldPrefetchWeb` skips when `payloadSignalsVideoIntelligence(query)`
* **Agent Boundary:** **Ironlogic** (Agent 4) synthesis guardrails; **Ironquery** (Agent 15) discovery receipts required for non-canonical paths.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/boardroomOrchestrator.test.ts` — verify sales-lead canonical match and video briefing builder.
  2. Submit boardroom query "Do you actively look for sales leads?" — verify canonical CRM engine response, not external crawl claim.
  3. Submit GRC analyst video reference — verify timecoded findings without AI limitation disclaimer.

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

### 🛰️ Feature 25: June 15 Live Strategic Intel OSINT Manifest
* **GRC Function ID:** `INTEL-001`
* **Exact Screen Coordinates:** IronBoard Strategic Intel dashboard — rows in `ironboard_crm_interactions` with manifest `ironintel-osint-2026-06-15-live`.
* **Operational Purpose:** Delivers fresh external OSINT for June 15, 2026 through Irongate-sanitized CRM persistence for board briefings: Check Point CVE-2026-50751 IKEv1 VPN authentication bypass (CVSS 9.3, Qilin ransomware affiliates, CISA KEV June 8 with June 11 remediation deadline), CVE-2026-50752 certificate-validation MITM flaw, Gentlemen RaaS (483 victims across 66 countries, 380 in 2026 alone, operational database of **14700** exploited FortiGate devices and **969** brute-forced VPN credentials, May 2026 internal chat leak exposing affiliate AI tooling), ShinyHunters UNC6240 Oracle PeopleSoft CVE-2026-35273 zero-day (CVSS 9.8 unauthenticated RCE, May 27 through June 9, 2026, Google GTIG notified **100** plus organizations with **68** percent higher-education, MeshCentral RMM masquerading as Azure endpoints), Infinite Campus breach (**137123** unique email addresses via Have I Been Pwned from ShinyHunters Salesforce-linked extortion), Arch Linux AUR supply-chain hijack (**1900** plus community packages deploying rootkit and credential harvester), CSA CISO Daily Briefing self-replicating AI worm PoC (**62** percent network penetration in seven days with locally hosted open-weight LLM), CMMC Phase 2 mandatory Level 2 C3PAO certification effective November 10, 2026 (assessments remain NIST SP 800-171 Revision 2 per DoD class deviation, C3PAO lead times **4** to **10** weeks), and GSA CIO-IT Security-21-112 Rev 1 (effective January 5, 2026) mandating NIST SP 800-171 Rev 3 with nine showstopper controls and one-hour incident reporting for GSA CUI contractors diverging from DoD Rev 2 baseline.
* **Technical Mechanics:** `Ironboard/src/knowledge/grcProfessionalResearch.manifest.json`:
  * `manifestId`: `ironintel-osint-2026-06-15-live`
  * `generatedAt`: `2026-06-15T18:00:00.000Z`
  * Ingestion script: `npx tsx scripts/ingest-strategic-intel-manifest.ts`
  * RAG chunks renamed from workday reconciliation tags to live OSINT vectors: `osint-01-checkpoint-qilin`, `osint-02-gentlemen-fortinet`, `osint-03-peoplesoft-shinyhunters`, `osint-04-cmmc-rev2-phase2`, `osint-05-aur-supply-chain`, `osint-06-ai-worm-agentic`, `osint-07-gsa-rev3-divergence`, `saas-01-dmz-ingress`
  * `priorityAgents` schema includes **Ironwatch** alongside Ironintel and Ironscribe per `strategicIntelResearch.ts` Zod enum
  * All industry `peerAleBaselineCents` and `riskMetricsCents` values are **string-encoded BigInt integers** — never floats
  * Technology sector `continuousAuditPriority` elevated from **HIGH** to **CRITICAL**; Finance regulatory pressure index **88** → **91**; Healthcare **91** → **95**; Defense **96** → **99**
* **Industry Profile Peer ALE Baselines (BigInt cents only):**
  * Finance: **1800000000** cents
  * Healthcare: **1210000000** cents
  * Technology: **950000000** cents
  * Defense: **2500000000** cents
  * Public Sector: **1500000000** cents
* **Manifest Risk Metrics (BigInt cents only):**
  * `medianAnnualGrcProgramCents`: **4200000000**
  * `medianAuditRemediationLagCents`: **875000000**
  * `saasConsolidationSavingsOpportunityCents`: **650000000**
  * `boardReportingOverheadCents`: **120000000**
* **Constitutional tenant ALE baselines (Ironframe seed tenants — unchanged):** Medshield **1110000000**, Vaultbank **590000000**, Gridcore **470000000**, Defense **1600000000** cents.
* **Agent Boundary:** **Ironintel** (Agent 16) OSINT correlation; **Ironwatch** (Agent 13) healthcare Infinite Campus HIBP entry, AUR supply-chain telemetry, and AI worm behavioral anomaly correlation in RAG chunks `osint-05-aur-supply-chain` and `osint-06-ai-worm-agentic`; **Irongate** (Agent 14) DMZ sanitization via `validateStrategicIntelManifest` before `ingestGrcProfessionalResearchCorpus` — manifest chunk `saas-01-dmz-ingress` binds refresh to `ironintel-osint-2026-06-15-live`.
* **Step-by-Step Lab Validation:**
  1. Run ingest script — verify manifest schema validation passes BIGINT-cent gate.
  2. Re-run ingest — verify `skippedDuplicate` when manifest `ironintel-osint-2026-06-15-live` already persisted.
  3. Query Strategic Intel dashboard — confirm Check Point CVE-2026-50751, Gentlemen FortiOS CVE-2024-55591, PeopleSoft CVE-2026-35273, CMMC Phase 2 November 10 2026 countdown, and GSA Rev 3 divergence findings visible under tenant scope.
  4. Run `tests/unit/strategicIntelIngress.test.ts` — all pass.
  5. Verify RAG chunk `osint-04-cmmc-rev2-phase2` cites SSP, SPRS, and POA&M truth with BIGINT-cent exposure — no float placeholders.

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
* **Operational Purpose:** Establishes Phase 1 revenue architecture: **sales-assisted invite only** for first design-partner revenue, with Stripe instant-checkout as the async self-serve provisioning tunnel. Public self-serve multi-subdomain provisioning is hardcoded **OFF** in `config/registration.ts` — not env-driven.
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
* **Exact Screen Coordinates:** `app/(public)/register/setup/` and `/register/demo` redirect to `/register/contact` when public registration is disabled; workspace invitation activation at `/register/[token]`; sales contact page for prospect intake.
* **Operational Purpose:** Enforces Phase 1 sales-assisted onboarding — prospects cannot self-provision tenants via public registration API. Sales engineers use bearer-authenticated `POST /api/register/sales-intake` instead.
* **Technical Mechanics:** `config/registration.ts` single source of truth:
  * `IRONFRAME_PUBLIC_REGISTRATION_ENABLED = false` (hardcoded — no env override)
  * `shouldBlockProspectIngress` blocks `/register/setup`, `/register/demo`, `/api/register/public-intake`, and `/demo/*` when `BLOCK_DEMO_SANDBOX_WHEN_REGISTRATION_DISABLED` is true
  * Public lead capture remains at `POST /api/register/public-lead` (middleware passthrough for guests)
  * Sales intake requires `INTERNAL_SALES_PROVISION_KEY` bearer token per `salesIntakeAuth.ts`
* **Agent Boundary:** **Ironguard** (Agent 12) ingress policy; **Ironwatch** (Agent 13) prospect ledger audit on successful intake.
* **Step-by-Step Lab Validation:**
  1. Navigate to `/register/setup` on local host — verify redirect to `/register/contact`.
  2. POST to `/api/register/public-intake` — verify 404 JSON when registration disabled.
  3. POST to `/api/register/sales-intake` with valid bearer — verify tenant provision receipt.
  4. Run `tests/unit/registrationGate.test.ts` and `tests/unit/registrationRoutes.test.ts` — all pass.

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
* **Exact Screen Coordinates:** `/admin/onboarding` — `CorporateOnboardingClient` + `AdminOnboardingDeployments` panel inside dashboard route group; `AdminOnboardingDashboardHeader` surfaces deployment posture.
* **Operational Purpose:** Gives GLOBAL_ADMIN operators a UI to provision corporate tenants, set billing status, list provisioned workspaces, and issue B2B invites without direct database access.
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
* **Exact Screen Coordinates:** Public reader at `/governance-frame` (index card grid) and `/governance-frame/[slug]` (article view). IronBoard mirror feed at `http://127.0.0.1:8082/governance-frame` when IronBoard engine is running locally.
* **Operational Purpose:** Serves chronological institutional governance briefings compiled exclusively from `docs/published-briefings/*.md`. Draft files in `docs/briefing-queue/` remain quarantined and never enter the published feed — mirroring Irongate DMZ publish-before-persist semantics for executive intelligence artifacts.
* **Technical Mechanics:**
  * Next.js App Router: `app/governance-frame/layout.tsx` — standalone slate chrome, `GovernanceFrameBrandLockup`, metadata `robots: { index: false, follow: false }`
  * `app/governance-frame/page.tsx` — `loadPublishedBriefings()` index with cent-register badge from Section II impact metrics
  * `app/governance-frame/[slug]/page.tsx` — `BriefingFrameContent` + `BriefingMarkdown` with sanitized react-markdown compilation
  * `app/lib/governanceFrame/briefingLoader.ts` — `enforceBriefingQuarantine()` warns on non-allowlisted `.md` files in `briefing-queue/` with `[SECURITY AUDIT] Unauthorized compilation attempt blocked for unvetted draft:` prefix
  * `app/lib/governanceFrame/parseBriefingSections.ts` — splits body into zones I (Exposure Vector), II (Calculated Quantitative Impact), III (Machine-Rule Technical Translation), IV (Verification Protocol)
  * `app/lib/governanceFrame/parseCentBigInt.ts` — rejects float and scientific notation cent literals; coerces whole integers to stringified BigInt
  * `app/lib/governanceFrame/sanitizeMarkdown.ts` — strips `<script>`, `javascript:` URIs, and `onerror=` attributes before render
  * IronBoard parallel router: `Ironboard/src/governanceFrame/router.ts`, `briefingScanner.ts`, `renderBlog.ts` — HTML blog renderer for direct IronBoard access
  * `next.config.ts` `outputFileTracingIncludes` ships `./docs/published-briefings/**/*` on Vercel for `/governance-frame` lambdas
  * Published seed briefing: `docs/published-briefings/2026-06-07-staging-boundary-check.md` — provisioning tunnel test exposure **499900** cents, reported ALE delta **0** cents
  * `ConditionalAppShell.tsx` excludes governance-frame paths from dashboard AppShell mount — no TopNav bleed
* **Agent Boundary:** **Ironscribe** (Agent 05) briefing structure and export lineage; **Irongate** (Agent 14) markdown sanitization before client render; **Ironlogic** (Agent 4) board federation reads monetization blueprint alongside TAS for strategic context.
* **Step-by-Step Lab Validation:**
  1. Open `http://127.0.0.1:3000/governance-frame` — verify index lists published briefings chronologically with cent-register badges where Section II defines `(¢)` metrics.
  2. Open `/governance-frame/2026-06-07-staging-boundary-check` — verify four-section frame renders without dashboard chrome.
  3. Place `secret-draft.md` in `docs/briefing-queue/` — reload index — verify draft does not appear; server log emits quarantine audit warning.
  4. Start IronBoard on port **8082** — verify startup log `[GOVERNANCE FRAME] Briefing feed at http://127.0.0.1:8082/governance-frame · published=N` where N equals count from `scanPublishedBriefings(resolveDocsRoot())`.
  5. Run `tests/unit/governanceFrameBriefingScanner.test.ts`, `tests/unit/governanceFrameSanitize.test.ts`, and `tests/unit/governanceFrameEmail.test.ts` — all pass.

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
  * `GOVERNANCE_FRAME_FEED_ORIGIN` from `GOVERNANCE_FRAME_PUBLIC_FEED_ORIGIN` env or default `https://brief.ironframegrc.com`
  * Email HTML uses table layout, inline styles, no `<button>` elements — Outlook-compatible patterns per Resend email requirements
  * `lib/agents/ironcast/workers/compileNewsletter.ts` writes compiled HTML under `out/governance-frame/newsletters/`
  * Link pattern: `{origin}/governance-frame/{slug}`
* **Agent Boundary:** **Ironcast** outbound communications; **Ironscribe** (Agent 05) content attribution from published briefing frontmatter.
* **Step-by-Step Lab Validation:**
  1. Run newsletter compile worker against published briefing slug — verify HTML output contains feed deep link.
  2. Run `tests/unit/governanceFrameEmail.test.ts` — verify origin URL and slug encoding.

---

<a id="governance-004"></a>

### 📡 Feature 49: Governance Frame RSS Feed Compiler
* **GRC Function ID:** `GOVERNANCE-004`
* **Exact Screen Coordinates:** Generated RSS XML — item links target `{RSS_ITEM_LINK_ORIGIN}/governance-frame/{slug}`.
* **Operational Purpose:** Publishes machine-readable RSS items for each published briefing so external subscribers and board ingestion pipelines can poll chronological updates without scraping the HTML index.
* **Technical Mechanics:** `scripts/compile-rss.ts` reads published briefings and emits RSS XML with governance-frame deep links. Default link origin aligns with `GOVERNANCE_FRAME_PUBLIC_FEED_ORIGIN`. `tests/unit/compileRss.test.ts` validates encoded slug URLs in XML output.
* **Agent Boundary:** **Ironintel** (Agent 16) external feed correlation; content sourced only from published ledger — never `briefing-queue/`.
* **Step-by-Step Lab Validation:**
  1. Run `npx tsx scripts/compile-rss.ts` — verify RSS item link contains `/governance-frame/` path segment.
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
  1. Initialize demo sandbox via `/register/demo` or `initializeDemoSandbox()`.
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
  * Pitch generation calls `generateGroundedPitch(domain)` — outreach cites **BigInt Integrity + Autonomous {compliancePressure} Guard** value proposition
  * Harvest buttons apply `±25` to `aiFitnessScore` and transition deal stage to `QUALIFIED` or `REJECTED`
* **Agent Boundary:** IronBoard commercial plane (port **8082**) — **Ironlogic** (Agent 4) synthesis consumes `buildFlywheelWorkspaceContext`; **Irongate** (Agent 14) sanitizes web-grounded discovery JSON before Prisma upsert; no cross-tenant prospect bleed — `marketProspect` domain key is global to board org database.
* **Step-by-Step Lab Validation:**
  1. Open `http://127.0.0.1:8082/` — locate Market Flywheel panel in left rail.
  2. Enter `Germany, Australia, Ireland, Canada` in target countries field — click **Load Prospecting Batch**.
  3. Verify status line shows loaded count and country label; `localStorage.ironboard_target_countries` matches input.
  4. Click **London Hub** shortcut — verify input resets to `London`, hub toggle highlights, batch reloads preset London seeds.
  5. Select a prospect — verify pitch pane generates outreach mentioning BigInt numeric precision guarantees.
  6. Click **Harvest Signal (+)** — verify `aiFitnessScore` increments by **25** and deal stage moves toward `QUALIFIED`.
  7. Run `Ironboard/src/services/marketIntelligence.test.ts` — verify multi-region `fetchProspectingBatchForTargets(['London','Singapore'])` returns **8** qualified rows.

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
  * **Layer 5 — Executive persona ratios:** CFO/board-bot anchor on sanitized USD; board-writer prose; board-compliance DORA validation
  * **Layer 6 — Sources & Citations:** mandatory `### V. Sources & Citations` with reviewable locators (`GET /api/board/shared-context`, `docs/TAS.md`, published briefing paths)
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
  * `discoverRegionalProspects(region)` — skips when `listProspects(normalized, false).length >= 3`
  * Gemini prompt: find **4** companies, 5–50 employees, SOC2/ISO27001/KYC/AML pressure; returns JSON array only
  * `parseDiscoveryJson(text)` — extracts JSON array from model response; clamps employee count **5–50**
  * `fetchProspectingBatchForTargets(targets)` — London/Singapore use preset seed batches (`LONDON_BATCH`, `SINGAPORE_BATCH`); other countries call discovery
  * `calculateTierScore` — region presence **+50**, SOC2/ISO27001 **+50**, SEED/SERIES_A funding **+100**, compliance hire **+75**; any non-empty region qualifies (not hub-only)
  * `listProspects(region?: string | string[])` — Prisma filter supports `{ region: { in: regions } }` for multi-country queries
  * `buildFlywheelWorkspaceContext(activeHub)` — reports `Active Target Countries:` label and batch summary including per-prospect region
* **Agent Boundary:** **Irongate** (Agent 14) should treat discovered domains as external intel — ingestion path uses structured JSON parse, not raw HTML persistence; **Ironintel** (Agent 16) OSINT patterns inform discovery prompt criteria.
* **Step-by-Step Lab Validation:**
  1. Set `GOOGLE_API_KEY` in `Ironboard/.env.local`.
  2. POST `{ "targetCountries": ["Germany"] }` to `/api/prospects/trigger` — verify prospects returned with `region: "Germany"`.
  3. Re-trigger same region — verify discovery short-circuits when **3+** rows already exist.
  4. Run `marketIntelligence.test.ts` — verify `fetchProspectingBatchForTargets(['London','Singapore'])` merges **8** hub seed prospects.
  5. Confirm sub-threshold accounts (`tierScore < 100`) persist as `dealStage: REJECTED` and exclude from active cockpit list.

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
* **Operational Purpose:** Provides unauthenticated prospect-facing sales agent chat isolated to the **prospect pool tenant** — no customer environment bleed.
* **Technical Mechanics:**
  * `app/api/agents/sales/route.ts` — public POST; tenant UUID from `IRONFRAME_PROSPECT_POOL_TENANT_UUID` or fallback `tenant_prospect_pool_01`
  * `app/lib/server/salesAgentConsoleCore.ts` — Gemini synthesis at temperature **0.0**; CRM contact upsert with `fullName` field
  * `isPublicProspectOnboardingPath` includes `/sales-agent-portal` and `/api/agents/sales` for quarantine funnel bypass
  * `scripts/smoke-test-sales.mjs` — sales agent smoke validation
* **Agent Boundary:** **Ironguard** (Agent 12) prospect pool isolation; **Ironlogic** (Agent 4) synthesis; zero authenticated tenant context required.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/agentPerimeter.test.ts` — verify prospect pool tenant binding.
  2. Open `/sales-agent-portal` on cloud preview without full ingress — verify **200** (narrow funnel).
  3. POST message to `/api/agents/sales` — verify CRM row scoped to prospect pool UUID only.
  4. Run `scripts/smoke-test-sales.mjs` — smoke pass.

---

<a id="support-001"></a>

### 🎧 Feature 62: Customer Service Console API
* **GRC Function ID:** `SUPPORT-001`
* **Exact Screen Coordinates:** Authenticated API `POST /api/agents/customer-service` — no default marketing UI chip.
* **Operational Purpose:** Grounds authenticated tenant support replies against `app_documents` where `readingLevel: "LEVEL_1"` — fail-closed **403** when Ironguard tenant validation drops.
* **Technical Mechanics:** `app/lib/server/customerServiceConsoleCore.ts`:
  * `assertIronguardApiTenantOr403` on every request
  * Documentation rows filtered strictly to LEVEL_1 reading level
  * Gemini synthesis temperature **0.0**; channel `SYSTEM_AGENT` on CRM interactions ledger
  * Prisma `ironboardCrmContact.fullName` — never `name` or `firstName`/`lastName`
* **Agent Boundary:** **Ironguard** (Agent 12) tenant perimeter; **Ironscribe** (Agent 05) doc citation lineage.
* **Step-by-Step Lab Validation:**
  1. POST without tenant session — verify **403**.
  2. POST with valid tenant — verify reply cites LEVEL_1 doc slugs only.
  3. Confirm no LEVEL_2 technical corpus rows appear in grounded context.

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

<a id="support-002"></a>

### ✅ Feature 68: Customer Service Approval Queue
* **GRC Function ID:** `SUPPORT-002`
* **Exact Screen Coordinates:** `/api/admin/approvals` — admin approval queue API; pending draft tags in CRM interactions.
* **Operational Purpose:** Holds AI-drafted customer service replies for human operator approval before dispatch — tier inference from contact metadata (Gridcore, Vaultbank, Medshield baseline alignment).
* **Technical Mechanics:** `app/lib/server/approvalQueueCore.ts`:
  * `PENDING_DRAFT_TAG`, `DISPATCHED_DRAFT_TAG`, `PURGED_DRAFT_TAG`
  * `inferTierFromContact` — reads `initialBaselineAlignment` metadata or title Baseline: prefix
  * `listPendingApprovalDrafts` — queries CRM interactions with pending tag
  * `app/api/admin/approvals/route.ts` — dispatch and purge actions
* **Agent Boundary:** **Ironwatch** (Agent 13) audit on dispatch; human operator holds execution keys.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/approvalQueueCore.test.ts` — tier inference and draft parse pass.
  2. Create pending draft interaction — list via admin API — verify tier assignment.
  3. Dispatch approved reply — verify `DISPATCHED_DRAFT_TAG` replaces pending tag.

---

<a id="board-012"></a>

### 🏛️ Feature 69: Founding Agent LLM Module Refactor
* **GRC Function ID:** `BOARD-012`
* **Exact Screen Coordinates:** IronBoard boardroom — CEO, CFO, CCO, Legal founding personas on port **8082**.
* **Operational Purpose:** Centralizes founding-agent Gemini calls in `boardAgentLlm.ts` with temperature **0.0** — separates persona synthesis from orchestrator routing noise.
* **Technical Mechanics:**
  * `Ironboard/src/agents/boardAgentLlm.ts` — shared `GoogleGenAI` client wrapper for founding agents
  * `Ironboard/src/agents/founding.ts` — delegates to boardAgentLlm
  * `Ironboard/src/services/email/` — Resend email package for board outbound
  * `queryLocalWorkspace.ts` — `stringifyWorkspaceBigIntFields` prevents JSON serialization drift on CRM BigInt columns
* **Agent Boundary:** **Ironlogic** (Agent 4) persona routing; **Irontrust** (Agent 3) BigInt stringify at tool boundary.
* **Step-by-Step Lab Validation:**
  1. Run `Ironboard/tests/agentValidation.test.ts` — founding agent paths pass.
  2. Inspect boardroom SSE — verify BigInt fields arrive as strings in tool receipts.
  3. Trigger email ingress — verify Resend package loads without constructor mock crash in Vitest.

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
* **Exact Screen Coordinates:** `/admin/onboarding` — `AdminOnboardingDeployments.tsx` section below provision form.
* **Operational Purpose:** Surfaces deployment posture, quarantine state, and ingress configuration for GLOBAL_ADMIN operators during design-partner onboarding drills.
* **Technical Mechanics:**
  * `app/lib/server/adminOnboardingDeployments.ts` — deployment snapshot builder
  * `AdminOnboardingDashboardHeader.tsx` — header chrome for onboarding console
  * `assertGlobalAdminForOnboarding` in `middleware.ts` — hard GLOBAL_ADMIN gate before page render
* **Agent Boundary:** **Ironguard** (Agent 12) GLOBAL_ADMIN RBAC; **Ironlock** (Agent 6) quarantine state display.
* **Step-by-Step Lab Validation:**
  1. Run `tests/unit/adminOnboardingDeployments.test.ts` — snapshot fields pass.
  2. Sign in as non-admin — verify `/admin/onboarding` redirect before deployments panel loads.
  3. Sign in as GLOBAL_ADMIN — verify deployments panel shows quarantine and ingress flags.

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

## 🧬 Chapter 5: Nineteen-Agent Architecture Cross-Reference (Delta Verification)

Today's code delta touches the following agents. Use this matrix during audits to confirm boundary integrity for operational date **2026-06-18**:

| Agent # | Codename | Today's Delta Touchpoints |
|---------|----------|-------------------------|
| 1 | Ironcore | Route consolidation under `app/(dashboard)/dashboard/*`; `AppShellRouter`; documentation execute pipeline mount; shared-context `documentationBrief` emission |
| 3 | Irontrust | BigInt cent storage unchanged; dual Stripe webhook cent parsing; threat validate ActiveRisk id extraction; procurement.ts trust exhibits |
| 4 | Ironlogic | `boardAgentLlm.ts` founding agent refactor; sales and customer service agents at temperature **0.0**; documentation brief consumption in knowledge.ts |
| 5 | Ironscribe | Dual-location output matrix; APP_DOCS vs GOVERNANCE_BRIEFINGS plane separation; Trainer/Writer placement targets |
| 6 | Ironlock | Narrow funnel quarantine complements constitutional freeze — private workspace blocked, public funnel open on cloud |
| 9 | Irontech | Threat validate route ghost card reconciliation; chaos simulation shadow plane unchanged |
| 11 | Irontally | Board governance memo cron consumes documentation brief mandate |
| 12 | Ironguard | `assertGlobalAdminForOnboarding`; prospect pool tenant isolation for sales agent; customer service fail-closed **403**; gateway shield architecture test |
| 13 | Ironwatch | Live shared-context + documentationBrief hydration; admin onboarding deployment snapshots |
| 14 | Irongate | Gateway shield DMZ markers on all Prisma API routes; CompilationIngressPortal unresolved slug guard; documentation corpus plane isolation |
| 15 | Ironquery | `stringifyWorkspaceBigIntFields` on queryLocalWorkspace tool receipts |
| 16 | Ironintel | Training corpus and documentation pipeline feeds; OSINT manifest unchanged |
| 17 | Ironbloom | `parseThreatIngestionTelemetry` kWh extraction from threat ingestionDetails; productionCarbonLedger updates |
| 18 | Ironcast | Resend email package in IronBoard services/email |

**IronBoard commercial plane note:** Sales agent (`/api/agents/sales`) and customer service agent (`/api/agents/customer-service`) operate on distinct tenancy boundaries — sales uses prospect pool UUID; customer service requires authenticated tenant with LEVEL_1 doc grounding. Documentation Trainer (`board-trainer`) and Writer (`board-writer`) personas consume `documentationBrief` one-way from port **3000** — zero write-back except via `POST /api/documentation/execute` bearer gate.

**Documentation corpus plane note:** APP_DOCS (`/docs`, `app_documents` table) and GOVERNANCE_BRIEFINGS (`/governance-frame`, `published-briefings/`) must never cross-write. board-trainer owns Level 1 user manuals and training tracks; board-writer owns Level 2 technical corpus.

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
* **The Root Cause:** You are hitting a **private workspace** path (`/integrity`, `/dashboard/*`, `/cockpit`, authenticated tripane `/`) on a cloud-hosted URL while production quarantine is active without `IRONFRAME_ALLOW_PUBLIC_INGRESS=1`. Today's **narrow funnel** allows public paths (`/terms`, `/privacy`, `/marketing`, `/docs`, `/pricing`, `/register/*`, `/sales-agent-portal`, `/governance-frame`, auth surfaces) on cloud hosts — only private workspace surfaces return **403**.
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

### 🚨 Alert 7: Self-Serve Registration Redirects to Sales Contact
* **The Root Cause:** `IRONFRAME_PUBLIC_REGISTRATION_ENABLED` is hardcoded **false** in `config/registration.ts` — `/register/setup` and `/demo/*` are blocked by `shouldBlockProspectIngress`.
* **How to Resolve It Yourself:**
  1. Direct prospects to `/register/contact` for sales-assisted intake.
  2. Sales engineers POST to `/api/register/sales-intake` with `INTERNAL_SALES_PROVISION_KEY` bearer token.
  3. Do not attempt env-var override — registration gate is constitutionally hardcoded for Phase 1.

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

---


### 🚨 Alert 12: Boardroom Documentation Brief Missing
* **The Root Cause:** IronBoard Trainer or Writer agent attempted to author documentation without `documentationBrief` in shared-context payload — one-way ingress mandate violation.
* **How to Resolve It Yourself:**
  1. Confirm Ironframe `GET /api/board/shared-context` returns `documentationBrief` with `communicationDirection: ONE_WAY_IRONFRAME_TO_BOARD`.
  2. Restart IronBoard after Ironframe core is healthy — bridge must hydrate before doc authoring phases.
  3. Run `tests/unit/documentationBrief.test.ts` — verify brief builder includes dual-plane matrix.

### 🚨 Alert 13: App Document DB Read Failure
* **The Root Cause:** `/docs/[slug]` slug not found in `app_documents` table and filesystem mirror absent — CompilationIngressPortal shows staging state.
* **How to Resolve It Yourself:**
  1. Run `npx tsx scripts/seed-app-documents.ts` against development database.
  2. POST `POST /api/documentation/execute` with internal gateway Bearer to upsert missing slug.
  3. Verify migration `20260618120000_init_app_documents` applied: `npx prisma migrate status`.
  4. Run `tests/unit/docsContentDecoupling.test.ts` — decoupling paths pass.

### 🚨 Alert 14: Workspace Invitation Token Required
* **The Root Cause:** Corporate tenant provision attempted without valid `TenantWorkspaceInvitation` token — Phase 1 invitation gate enforced in `corporateTenantProvisionCore.ts`.
* **How to Resolve It Yourself:**
  1. GLOBAL_ADMIN runs `mintWorkspaceInvitation` admin action with target email and tenant slug.
  2. Direct invitee to `/register/{token}` before provision flow.
  3. Verify invitation `status` is **ACTIVE** and `expiresAt` is in the future.
  4. After consumption, confirm `status` becomes **CONSUMED** — token cannot be reused.

## 📋 Chapter 7: Unit Test Verification Checklist (Today's Delta)

Independent learners and compliance auditors must confirm the following Vitest suites pass before signing a daily lab receipt:

| Test file | Validates |
|-----------|-----------|
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
| `Ironboard/src/services/boardroomQueryIntent.test.ts` | Multi-country prefetch intent, `inferRegionsFromQuery`, Germany ICP criteria match |
| `Ironboard/src/services/marketIntelligence.test.ts` | Multi-region listProspects filter, `fetchProspectingBatchForTargets` merge, tier score REJECTED path |
| `tests/architecture/gatewayShield.test.ts` | Irongate DMZ markers on all Prisma-importing API routes |
| `tests/unit/agentPerimeter.test.ts` | Sales agent prospect pool tenant isolation |
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
| `RESEND_API_KEY` | IronBoard Resend email package outbound |

---

## ✅ Chapter 9: Daily Writer Receipt (2026-06-18)

**Delta classification:** Backend Logic (narrow public ingress funnel via `isPublicCloudIngressPath` and `isPrivateWorkspaceIngressPath`; dual Stripe webhook paths `/api/webhooks/stripe` and `/api/billing/webhook` with `STRIPE_CREDENTIAL_MODE`; documentation corpus dual-plane system `lib/documentationCorpusPlanes.ts` with `documentationBrief` one-way ingress; `AppDocument` Prisma model and DB-backed `/docs` reader; `POST /api/documentation/execute` bearer-gated pipeline; IronBoard `boardAgentLlm.ts` founding agent refactor; sales agent prospect pool isolation; customer service LEVEL_1 doc grounding; workspace invitation token gate; trust center procurement plane; gateway shield architecture test; approval queue core; Ironbloom `parseThreatIngestionTelemetry` kWh extraction; admin onboarding deployments panel; threat validate BigInt ActiveRisk id extraction; route consolidation `app/roles/*` → `app/(dashboard)/dashboard/*`; `assertGlobalAdminForOnboarding` middleware gate) + UI (`CompilationIngressPortal`, `MarketingSalesPortalTrigger`, `SalesAgentSlideOver`, `AdminOnboardingDeployments`, Trust Center `/trust/*` pages, `/settings/config` redirect).

**Financial boundary verification:** All ALE references in this document use BigInt integer cents exclusively for persistence and internal telemetry. Constitutional Ironframe seed tenant baselines unchanged: Medshield **1110000000**, Vaultbank **590000000**, Gridcore **470000000**, Defense **1600000000** cents. Dual Stripe webhook paths parse `amountTotalCents` as BigInt at fulfillment — `parsePaymentIntent.ts` rejects float coercion. Trust center `procurement.ts` legal exhibits reference same cent anchors. De-classification matrix (Layer 3) mandates Governance Frame public copy cites `financials.display.*Formatted` strings — never raw cent literals. Market prospect `aiFitnessScore` remains integer ICP tier composite — not monetary.

**Threat simulation verification:** `POST /api/threats/validate` extracts ActiveRisk numeric ids as BigInt-safe strings for ghost card reconciliation. `parseThreatIngestionTelemetry` reads kWh from `ThreatEvent.ingestionDetails` for Ironbloom carbon trace — monetary-only payloads return `no_physical_telemetry`. Shadow-plane `SimThreatEvent.mitigated_value_cents BIGINT` isolation from production `ThreatEvent` unchanged. June 15 OSINT manifest remains ingested — today's delta extends documentation and commercial agent planes without replacing manifest chunks.

**Irongate DMZ verification:** `tests/architecture/gatewayShield.test.ts` enforces DMZ markers on all Prisma-importing API routes. CompilationIngressPortal fails closed on unresolved doc slugs without briefing-queue leak. Documentation corpus planes forbid cross-write between APP_DOCS and GOVERNANCE_BRIEFINGS. Sales agent JSON parse and customer service tenant guard pass Ironguard perimeter.

**Platform boundary verification:** Ironframe port **3000** emits `documentationBrief` in shared-context. IronBoard port **8082** consumes via core telemetry bridge and documentation execute ingress — read-only diode Layer 1 forbids direct DB writes except bearer-gated execute endpoint. Both engines bind **127.0.0.1** only. Route consolidation eliminates duplicate `app/roles` layout tree. Narrow funnel permits public GTM surfaces on cloud without opening command center.

**Documentation corpus verification:** `DUAL_LOCATION_OUTPUT_MATRIX` authoritative in `documentationCorpusPlanes.ts`. board-trainer owns `docs/user-manuals/` and `docs/training/`; board-writer owns `docs/technical/`. `app_documents` table seeded via `scripts/seed-app-documents.ts`. Training corpus publisher and chapter generator in IronBoard services. `tests/unit/trainingCorpusPlacement.test.ts` and `Ironboard/tests/trainingCorpus.test.ts` pass.

**Phase 1 commercial verification:** Dual webhook billing activation path live at `/api/billing/webhook`. Sales agent isolated to `IRONFRAME_PROSPECT_POOL_TENANT_UUID`. Workspace invitation required before corporate provision. `IRONFRAME_PUBLIC_REGISTRATION_ENABLED` hardcoded false unchanged. Admin onboarding deployments panel surfaces quarantine posture for GLOBAL_ADMIN.

**CI verification:** `.github/workflows/ci.yml` runs root Vitest, Ironboard `npm test`, Stryker mutation, Playwright E2E (`tests/e2e/docs-public.spec.ts`), and gateway shield architecture test. All new unit suites listed in Chapter 7 must pass before deploy.

**Empty-diff pivot:** Not applicable — `daily_code_diff.txt` contains substantial deltas across deployment quarantine narrow funnel, documentation corpus dual-plane system, AppDocument Prisma model, sales and customer service agents, workspace invitations, trust center, route consolidation, Stripe billing dual path, Ironbloom physical telemetry, CI gates, and IronBoard agent refactor spanning Ironframe and Ironboard packages.

---

*End of GRC Master Operations Manual & Technical Feature Glossary — Writer Narrative Architect complete mandate execution for operational date 2026-06-18.*
