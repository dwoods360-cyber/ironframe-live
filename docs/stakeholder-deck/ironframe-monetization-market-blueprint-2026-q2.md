# Ironframe Monetization & Market Blueprint — Q2 2026 (Board Priority Brief)

**Classification:** Board / Executive — Strategic Intel Update companion  
**Version:** 2026-06-14  
**Decision locked:** Phase 1 = **sales-assisted invite-only** (not self-serve multi-subdomain provisioning)

---

## Where the app is today

Ironframe is **past prototype** and into **design-partner / demo-ready** territory. Docs baseline: **v0.1.0-ga-epic17** (`docs/hub.md`).

**Core (real, shippable):**

- Auth & sessions — Supabase login, middleware, password recovery
- Multi-tenant GRC dashboard — Command Center, integrity hub, threat pipeline, role-gated views
- Financial integrity — BigInt ALE baselines, governed liability math (Medshield / Vaultbank / Gridcore)
- Operational depth — Irongate ingest, Vercel crons, Resend email alerts, exports, substantial test coverage
- Documentation engine — 3 AM cron; glossary updating from code deltas

**Position:** Credible **technical platform for pilots and demos** — not yet **commercial SaaS on autopilot**.

---

## P0 — Hard stops before taking money

| Gap | Why it matters |
|-----|----------------|
| No billing rail | No Stripe/PSP, no subscription model in Prisma, no checkout/webhooks. `SaaSPricingModel.tsx` / `useComputeBilling.ts` = simulation UI only. |
| No published pricing | `docs/sales/pricing-and-packaging.md` is internal; tiers say **Contact sales**. |
| No legal surface | No `/terms`, `/privacy`, DPA in app. |
| Production quarantine | Cloud blocks `/` and `/login` without bypass — customers cannot sign up on preview/prod. |
| Invite-only, no admin UI | `inviteCorporateTenantUserAction` exists; **nothing in UI calls it**. Manual scripts + Supabase dashboard. |
| No self-serve signup | Login only — no signup → pay → tenant flow. |
| Ops checklist open | `docs/GA_OPEN_ROADMAP.md`, `docs/TIER_A_VERCEL_STAGING_CHECKLIST.md` — PKI keys, cron smoke, Electricity Maps key. |

**Minimum first dollar:** billing + legal pages + customer entry path (self-serve OR sales-assisted invite UI) + narrow production quarantine for public routes.

---

## P1 — Credible paid pilots (design partners)

| Gap | Reality |
|-----|---------|
| Tenant lifecycle | Tenants mostly from seed; invites limited to known slugs. |
| Tier entitlements | No server-side plan gating (Vault, Sustainability, export quotas). |
| WORM / Epic 12 (~70%) | Do not sell immutable evidence locker as GA until closed. |
| 19-agent story vs code | Marketing says 19; orchestration partial — label stubs or finish Epic 10. |
| Stub surfaces | Vendor risk, Ironintel OSINT, some governance pages = demo placeholders. |
| Compliance marketing | **SOC 2–aligned, not certified** — keep in sales collateral. |
| Customer-facing docs | Many `/docs/*-enablement/` = STAGED DRAFT scaffolds. |

---

## Phase 1 — First revenue (4–6 weeks) — **SALES-ASSISTED INVITE ONLY**

**Tactical choice:** Human-in-the-loop validation + `inviteCorporateTenantUserAction` + Stripe billing hook. Defer self-serve multi-subdomain automation.

1. **Stripe** — Products for proposed tiers; webhook → `TenantBilling`; gate dashboard on subscription status.
2. **Legal** — `/terms`, `/privacy`; link from marketing + login.
3. **Onboarding** — Admin invite UI → `inviteCorporateTenantUserAction` → `tenantId` for Stripe metadata on manual payment links.
4. **Production access** — Quarantine policy: allow `/`, `/login`, auth callbacks on production URL.
5. **Pricing page** — Approved SKUs (even “starting at $X/mo” for Command tier only).

### Database — `TenantBilling` (Prisma)

```prisma
model TenantBilling {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId             String   @unique @db.Uuid
  stripeCustomerId     String?  @unique
  stripeSubscriptionId String?  @unique
  planTier             String   @default("COMMAND") // COMMAND, GOVERNANCE, ENTERPRISE
  status               String   @default("INACTIVE") // ACTIVE, PAST_DUE, CANCELED, INACTIVE
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  tenant               Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

### Stripe webhook — `app/api/webhooks/stripe/route.ts`

- Verify `stripe-signature` with `STRIPE_WEBHOOK_SECRET`
- Handle `customer.subscription.created|updated|deleted`
- Upsert `TenantBilling` via `subscription.metadata.tenant_id` and `plan_tier`
- Map `active` → `ACTIVE`, else `PAST_DUE`; deletion → `CANCELED`

### Launch sequence

```
[ Step 1: prisma migrate ] → [ Step 2: Admin invite UI ] → [ Step 3: De-quarantine marketing/auth ]
```

- **Step 1:** `npx prisma migrate dev --name init_tenant_billing_rails`
- **Step 2:** `app/(admin)/admin/tenants/page.tsx` — GLOBAL_ADMIN gate; provision tenant + invite; attach `tenantId` to Stripe invoice metadata
- **Step 3:** Middleware — public paths: `/`, `/login`, `/terms`, `/privacy`; maintain dashboard isolation

---

## Phase 2 — Defensible paid pilots

6. Entitlements by tier (server-side module flags)  
7. Metering — `AgentComputeLog` → usage billing  
8. Ops green — Tier A checklist + cloud integration gate  
9. Honest product map — hide/badge stubs; ship support guide  

---

## Phase 3 — Enterprise / MSSP

10. Epic 12 WORM GA  
11. Epic 10 full 19-agent orchestration  
12. MSSP multi-tenant ops, DPA pack, optional SOC 2 audit path  

---

## Bottom line (board)

- **Strength:** Real GRC platform — suitable for **paid design partners** with manual invoicing today.
- **Not ready:** Self-serve SaaS, website checkout, enterprise procurement without billing + legal + onboarding + prod ingress.
- **Fastest move:** One tier (**Command**), one price, Stripe Checkout or invoice links, invite/admin UI, legal pages, open prod login — sell 2–3 design partners while hardening P1.

---

## 2026 GRC market landscape (mid-year)

Industry shift: manual point-in-time audits → **continuous, telemetry-driven, agentic GRC**. Drivers: DORA enforcement, EU AI Act high-risk (Aug 2, 2026), UK CS&R Bill, NYDFS Part 500 MFA (Nov 1, 2026), CMMC 2.0 Phase 2 C3PAO (Nov 10, 2026).

### Competitor matrix (selected)

| Platform | Target | Core strength | Mid-market fit |
|----------|--------|---------------|----------------|
| ServiceNow GRC | Enterprise | CMDB workflow | Low |
| MetricStream | Regulated enterprise | UCF mapping | Low |
| Drata / Vanta | Startups | SOC2 automation | High basic / low complex GRC |
| Sprinto | Cloud mid-market | 35+ frameworks | Very high |
| Risk Cognizance | Mid-market | GRC + dark web | High ($6/user/mo) |
| Compyl | Enterprise + mid | Single-tenant isolation | Very high |
| SureCloud | Regulated mid | CCM + GRACiE AI | High |
| **Optro** (ex-AuditBoard) | Enterprise audit | MCP server (Apr 2026) | Moderate |
| Enactia | FinTech / healthcare | Parallel multi-reg mapping | High |

**Ironframe differentiation:** Built-in **continuous telemetry validation (Irongate)** vs Optro-style query of existing records; **BigInt ALE math** vs qualitative heatmaps; **self-hosted agent sandbox** pattern (Anthropic May 2026) for enterprise containment narrative.

---

## Agentic AI governance risk surface (2026)

- **Privilege drift** — agents accumulate excessive permissions  
- **Shadow agents** — personal no-code agents persist after employee departure  
- **MCP bypass** — agents route around governance to scrape data  

**Mitigation blueprint:** Self-hosted sandboxes + MCP tunnels (Anthropic May 19, 2026) — orchestration in cloud; tool execution in customer VPC (Cloudflare microVMs, Daytona, Modal, Vercel VPC).

---

## Engineering backlog — regulatory alignment (Epics 8–12)

| Epic | Focus | 2026 deadline hook | Effort |
|------|-------|-------------------|--------|
| **8** Audit Intelligence & framework mapping | RAG readiness, Irontally crosswalk | EU AI Act Art. 9–15 (Aug 2, 2026) | 2 sprints |
| **9** External ingress & zero-trust telemetry | Irongate Zod schemas, webhooks | Anthropic sandbox pattern; NYDFS MFA (Nov 1, 2026) | 2 sprints |
| **10** ALE math engine | BigInt baselines (Medshield $11.1M, Vaultbank $5.9M, Gridcore $4.7M) | CMMC Phase 2 / NIST 800-171 Rev 2 (Nov 10, 2026); FCA liability on false SPRS | 2–3 sprints |
| **11** Full 19-agent orchestration | LangGraph, MCP control plane | Privilege drift / immutable agent logs | 3 sprints |
| **12** Production hardening & GA | RLS, Playwright 85%+, VAPT | UK CS&R 24h/72h incident reporting; DORA TLPT | 2–3 sprints |

### Irongate validation (reference)

All external telemetry must pass Zod schemas at API boundary — UUID alert IDs, BigInt `assetValueCents`, ISO-8601 timestamps, enum `source` / `telemetryType`.

### UI/UX state borders (RiskCard)

- Assigned: `border-cyan-400`  
- Processing: `border-amber-500 animate-pulse`  
- Verified: `border-emerald-500`  
- Quarantine fault: `border-red-500` (TTL breach / Ironlock interrupt)

### Financial stress

- 1,000-packet stress accumulator — zero float drift  
- Stryker mutation score ≥ 85% on ALE ordering  
- SHA-256 manifests for agent runtimes post-orchestration stability  

---

## Executive value drivers (pitch)

1. **Automation** — Up to 80% reduction in manual compliance mapping (Enactia / continuous GRC benchmarks)  
2. **Quantitative CRQ** — ALE = ARO × SLE; SLE = AV × EF; ROSI justification to CFO (e.g. MFA $200k → ALE $2.3M → $800k)  
3. **Immutable GRC chronicle** — Continuous auditable ledger vs point-in-time PDFs (~40% audit hour reduction cited industry-wide)  
4. **Time-to-value** — Vs multi-month legacy GRC implementations; Optro customer refs: PetSmart 1,400h/yr, Lennar 64% control dedup, Edgewell 400h/qtr  

---

## Board agent directives

- **CFO / Sales Leader:** Phase 1 = Command tier flat annual fee (BigInt cents); reject seat-based pricing in all models.  
- **CTO / Engineer:** Implement `TenantBilling` + Stripe webhook before marketing “paid pilot” language.  
- **Legal:** Terms/privacy/DPA stubs before first design-partner MSA.  
- **GRC Evangelist:** Never claim SOC 2 certification — aligned only.  
- **Ironintel / Ironscribe:** Prioritize Aug 2026 EU AI Act and Nov 2026 CMMC/NYDFS hooks in board packets (LP-10 / LP-16).  
- **CEO:** Fastest revenue = 2–3 design partners on sales-assisted invite + manual Stripe until Phase 2 entitlements ship.

---

*End board brief — ingest via IronBoard docs federation + stakeholder-deck matrix.*
