---
Document Type: Sales Enablement Documentation
Status: ACTIVE
Security Classification: INTERNAL ONLY (Tenant Boundaries Enforced)
Last Updated: 2026-07-16
GeneratedBy: scripts/sync-product-knowledge.ts
---

# Competitive Analysis

> Board docs-matrix ingest path (`sales-enablement`). Canonical narrative mirrors [`docs/sales/competitive-analysis.md`](../sales/competitive-analysis.md).  
> Code truth: `lib/ironframeProductKnowledge/commercial.ts` (Path B $4,999 / 499900¢ · planned GA Command $35,000/yr).

Summary for sales and product. Full analysis: [competitive-landscape.md](../competitive-landscape.md).

## Market context

Legacy GRC and IRM platforms (Archer, ServiceNow IRM, MetricStream, etc.) optimize for workflow tickets and qualitative ratings. Ironframe competes on **financial defensibility**, **zero-trust ingest**, and **observable agent orchestration**.

## Ironframe differentiators

| Dimension | Legacy GRC | Ironframe |
|-----------|------------|-----------|
| Risk quantification | Heatmaps, qualitative tiers | BigInt ALE cents, tenant-frozen baselines |
| External ingest | Often direct to DB/API | Irongate DMZ — sanitize before persist |
| AI / automation | Bolt-on chatbots | 19 named agents, LangGraph checkpoints |
| Multi-tenant | Add-on or separate instances | Native Command Center + RLS + Ironguard |
| ESG | Checkbox / spend proxies | Physical units (kWh, gCO₂eq); Ironbloom gates |
| Evidence | Attachments | WORM path, SHA-256 forensic manifests, Ironquery exports |
| Ops resilience | Manual failover | Ironwatch heartbeat, LKG pulse, stale lockdown with waiver |

## Agent-level competitive map

| Agent | Solves legacy failure |
|-------|----------------------|
| Irongate (14) | Poisoned data lakes |
| Irontrust (3) | Qualitative guesswork |
| Ironwatch (13) | Undetected API / insider anomaly |
| Ironguard (12) | Secret leakage, scope violations |
| Ironlock (6) | Slow manual lockdown |
| Ironbloom (17) | Greenwashing / monetary ESG proxies |
| Kimbot (Bot B) | Red-team drill antagonist (shadow plane; not Agent 17) |
| Ironquery | Black-box AI reports → exportable analyst packs |

## Win themes by competitor type

**vs. spreadsheet / Notion programs**  
Governance at scale: audit log, tenant isolation, automated ingest.

**vs. enterprise GRC suite**  
Faster time-to-value on serverless; transparent agent math; lower services lock-in when exports and TAS are open.

**vs. exposure management / ASM point tools**  
Ironframe connects telemetry → financial impact → compliance mapping in one Command Center.

## Risks / honest gaps (GA)

- Full 19-agent roster still expanding (Epic 10 ~90%)
- WORM productization in progress (Epic 12)
- DEI salted pipeline early (Epic 14)
- Pricing/packaging not yet public SKU sheet

Use gaps as **roadmap transparency**, not oversell.

## Related documents

- [competitive-landscape.md](../competitive-landscape.md)
- [Sales Enablement](./sales-enablement.md)
- [Product Vision](../stakeholders/product-vision.md)
