---
Document Type: Sales Enablement Documentation
Status: ACTIVE
Security Classification: INTERNAL ONLY (Tenant Boundaries Enforced)
Last Updated: 2026-07-15
---

# Competitive Pricing Map

> Board docs-matrix ingest (`sales-enablement`). Internal only — do not publish peer dollar bands on marketing `/pricing`.  
> Narrative companion: [`docs/sales/competitive-analysis.md`](../sales/competitive-analysis.md).

## Purpose

Give board and sales personas honest peer ACV context so Path B ($4,999) and planned GA ($35k / $75k / Vault quote) sit in a real market frame.

## Scope

- Internal enablement and IronBoard federation only.
- Bands are approximate research ranges — never invent a precise competitor price as fact.
- Ironframe amounts remain whole cents from `lib/ironframeProductKnowledge/commercial.ts`.

## Ironframe commercial anchors

| Offer | Amount | Notes |
|-------|--------|-------|
| Path B / Command Tier on-ramp | **$4,999** (499900¢) | Design-partner co-builder; sales-assisted |
| Planned GA Command | **~$35,000/yr** | Label “planned GA” until commercial GA flag |
| Planned GA Growth / Sustainability | **~$75,000/yr** | Ironbloom path |
| Vault / MSSP | Quote | Custom enclaves / dual-gate |

## Peer ACV bands (research ranges)

| Peer category | Typical buyer | Illustrative ACV band | Buying job |
|---------------|---------------|----------------------|------------|
| Vanta / Drata–class | Startup SOC 2 / ISO runway | ~$10k–$40k+ | Speed to certification + connectors |
| Mid-market GRC / IRM suites | Regulated mid-market | ~$50k–$150k+ | Workflow tickets, qualitative risk |
| Enterprise IRM (Archer-class) | Large enterprise | ~$150k–$500k+ services-heavy | Broad control libraries + SI |
| MSSP / vCISO platforms | 5–50 client firms | ~$15k–$80k platform + services | Multi-client evidence / white-label |
| Spreadsheet / Notion programs | Any | Soft cost (people time) | Ad-hoc board packs |

## Win / lose frames

**Win when** buyer needs board-defendable **dollar** risk, hard **tenant isolation**, or zero-trust ingest — not checkbox theater.

**Lose / defer when** buyer only wants fastest SOC 2 badge with max SaaS connectors and no cents-grade ALE.

## Honest gaps (do not oversell)

- Full 19-agent roster still expanding
- WORM productization in progress
- Public GA Stripe catalog may still be Path B–led until `IRONFRAME_COMMERCIAL_GA`

## Related documents

- [Competitive analysis (sales)](../sales/competitive-analysis.md)
- [Pricing & packaging](./pricing-and-packaging.md)
- [Battlecard vs Vanta/Drata](../sales/battlecard-ironframe-vs-vanta-drata.md)
