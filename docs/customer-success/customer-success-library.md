# Ironframe Customer Success Library

**Classification:** Corporate Documentation Matrix — `customer-success`  
**Audience:** `board-customer-success`, IronSuccessTeam worker, operator CSMs  
**Status:** Shipped — authoritative post-sale playbook index

## Purpose

This library codifies how Ironframe retains, expands, and proves value for regulated mid-market tenants after `CLOSED_WON`. It complements sales enablement (`docs/sales-enablement/`) and marketing strategy (`docs/marketing-strategy/`) with post-sale motions only.

## Core principles

1. **Outcomes over activity** — success is measured in audit readiness, dollar-denominated risk reduction, and board-ready evidence — not login counts alone.
2. **Whole-cent economics** — ROI narratives use BigInt cents from CRM and Irontrust ALE; never float-based loss estimates in client-facing advisories.
3. **Human-in-the-loop** — IronSuccessTeam drafts advisories; operators co-sign before any CISO or board-facing message ships.
4. **Beachhead tailoring** — `HEALTH_HIPAA`, `REGIONAL_BHC`, `UTILITY_NERC`, and `MSSP_ENCLAVE` each have distinct health gates and expansion plays (never cite demo seed tenant names as customers).
5. **Land → adopt → expand** — onboarding success precedes upsell; churn risk triggers retention plays before expansion outreach.

## Authoritative documents

| Document | Use |
|----------|-----|
| [retention-playbook.md](./retention-playbook.md) | Churn prevention, health interventions, save plays |
| [health-score-framework.md](./health-score-framework.md) | Deterministic health scoring for poll worker |
| [qbr-expansion-framework.md](./qbr-expansion-framework.md) | QBR structure, expansion signals, land-and-expand |
| [onboarding-success-playbook.md](./onboarding-success-playbook.md) | First 90 days, time-to-value, adoption milestones |

## Knowledge corpus (code)

- `SuccessTeam/src/knowledge/customerSuccessCorpus.ts` — books, frameworks, and tactics (Gainsight, Mehta, Murphy, Lemkin, Tzuo, Peppers, Dixon, etc.)
- `Ironboard/src/staticContext.ts` — `CUSTOMER_SUCCESS_KNOWLEDGE_BINDING` for `board-customer-success`

## Poll worker integration

IronSuccessTeam (`:8085`) polls:

- `GET /api/v1/ingress/success-team/accounts` — active `CLOSED_WON` accounts
- `GET /api/v1/ingress/success-team/health-snapshot` — read-only health + pilot metadata
- `POST /api/v1/ingress/success-team/advisory` — queue `[PENDING CS ADVISORY APPROVAL]` drafts

Default cadence: hourly (configurable). Never auto-sends client email.

## Strategic vault alignment

Primary book alignments for customer success personas:

- **Customer Success** (Mehta / Murphy) — outcome-based retention
- **The Discipline of Market Leaders** — Customer Intimacy value discipline
- **Measure What Matters** — CS OKRs and health metrics
- **Crossing the Chasm** — bowling-alley expansion within beachhead
- **The Challenger Sale** — teach-tailor-take-control in QBRs
- **They Ask, You Answer** — trust through transparent ROI proof
