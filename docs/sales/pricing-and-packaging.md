# Pricing & Packaging — Ironframe GRC

*Authoritative for sales + `/pricing` during design-partner phase.*  
*Code truth: `lib/ironframeProductKnowledge/commercial.ts`.*

## Phase 1 — Design-partner / Command Tier

| SKU | Audience | Price | How they pay |
|-----|----------|-------|--------------|
| **Command Design Partner** (internal: Path B / Command Tier) | Co-builder cohort (3–5) | **$4,999** (499900¢) flat | Tenant-scoped Stripe activation after sales-assisted provision |
| **Command Design Partner — public list** | Visitors on `/pricing` | **$4,999** published | Workflow-review CTA only — no public Buy now / generic Payment Link |

**Rules**

- No per-seat / per-month licensing.  
- Existing **PENDING** workspaces: Path B link from `/admin/onboarding` only — **never** generic `/pricing` (duplicate workspace risk).  
- **Entity scope (hard cap):** 1 Primary Entity + up to **2** Subtenant Enclaves for the Path B window. Expansion requires a Multi-Entity Change Order — not ad-hoc provisioning.  
- Planned GA **Ironframe Command ~$35,000/yr** (`FINTECH_SEED`) — label “planned GA” until commercial GA flag is on.  
- **Multi-year discounts:** not on the published list. Annual billing only. Founder/CFO discretionary ≤10% (2-yr) / ≤15% (3-yr) prepaid — **never** on Path B.

## Planned GA — Motion 1 (Mid-Market & Holding Companies)

| SKU | List (USD/yr) | Entities included |
|-----|---------------|-------------------|
| **Command Core** | **$35,000** | 1 Primary + 3 Subtenant Enclaves (4 total) |
| **Paid Enclave** | **$3,500** list | 1 additional Subtenant; volume: $2,625 (11–50 Paid), $1,750 floor (51+) |
| **Command Multi** | **$55,000** | Up to 10 Entities (quote mask over Core + Paid) |
| **Command Enterprise** | **$95,000** | Up to 25 Entities (quote mask over Core + volume) |
| Series A Growth / Sustainability | ~$75,000 | Capability track (Ironbloom) — separate from entity count |

Volume tiers apply to **Paid Enclaves beyond the 3 included in Core** only.

## Planned GA — Motion 2 (MSSP & Managed Partners)

Requires Partner MSA, partner L1 support, and enclaves = unaffiliated end-clients (not buyer subsidiaries).

| Tier | Annual commit | Included enclaves | Overage / enclave / yr | Included WORM |
|------|---------------|-------------------|------------------------|---------------|
| Partner Silver | $50,000 | 15 | $2,800 | 375 GB |
| Partner Gold | $100,000 | 40 | $2,100 | 1 TB |
| Partner Platinum | $200,000 | 100 | $1,500 | 2.5 TB |

## COGS fair-use (per active enclave)

| Meter | Included | Expansion SKU |
|-------|----------|---------------|
| WORM evidence storage | 25 GB / enclave / year | **$25 / 50 GB / month** (or $250/yr prepaid) |
| Telemetry ingestion | 5M events / month | **$20 / 5M events / month** |

Hard stop at 3× fair-use without Expansion SKU.

## Packaging modules (capabilities)

| Module | Includes |
|--------|----------|
| **Command** | Dashboard, Active Risks, pipeline, basic exports, multi-tenant isolation |
| **Governance+** | + mapping, maturity, Ironquery PDF/CSV |
| **Sustainability** | Carbon pulse, Ironbloom physical units |
| **Vault** | Dual-gate / PKI clearance UI |
| **MSSP Platform** | Multi-client enclaves, scoped tenants, API — sold via Partner book |

## Promotions (internal)

- **Design partner:** $4,999 Path B · 90-day default window · 1+2 entity cap · capped eng syncs · convert-or-exit  
- **Not offered:** free 30-day pilots; published multi-year list discounts; unlimited enclaves at flat Core

## Procurement notes

- SOC 2 / ISO mapping: [Security & Compliance](../technical/security-and-compliance.md)  
- Order form: [design-partner-order-form.md](./design-partner-order-form.md)  
- Offer sheet: [design-partner-offer-sheet.md](./design-partner-offer-sheet.md)

## Related documents

- [Sales Enablement](../sales-enablement/sales-enablement.md)
- [Design partner recruitment](./design-partner-recruitment.md)
- [Market entrance playbook](./market-entrance-playbook.md)
