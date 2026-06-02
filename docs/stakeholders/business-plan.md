# Business Plan — Ironframe GRC

*Internal stakeholder document. Financial figures are planning assumptions unless marked as audited.*

## Executive summary

Ironframe targets mid-market and enterprise organizations that outgrew spreadsheet GRC and legacy heatmap tools but cannot afford opaque, services-heavy enterprise suites. The platform combines **quantitative ALE**, **multi-tenant Command Center UX**, and an **observable 19-agent workforce** on a modern serverless stack (Vercel + Supabase).

## Market problem

Legacy GRC platforms fail in three areas Ironframe addresses directly (see [competitive-landscape.md](../competitive-landscape.md)):

1. **Financial opacity** — Red/yellow/green heatmaps instead of defensible loss expectancy
2. **Perimeter vulnerability** — Direct API ingestion without a sanitization DMZ
3. **Black-box AI** — LLM wrappers without persistent state or human attestation

## Target customers

| Segment | Profile | Primary use case |
|---------|---------|------------------|
| **Regulated finance** | Vaultbank-style tenants | ALE baselines, audit exports, vault dual-gate |
| **Energy / grid** | Gridcore-style tenants | Carbon pulse, utility rates, sustainability ALE |
| **Healthcare / defense** | Medshield, Defense profiles | Compliance drift, maturity scoring, threat pipeline |
| **MSSPs / advisors** | Multi-tenant operators | Global Command Center + per-tenant isolation |

## Revenue model (framework)

| Stream | Description |
|--------|-------------|
| **Platform subscription** | Per-tenant seat + module bundles (GRC core, sustainability, vault) |
| **Usage / telemetry** | Optional meter for agent orchestration cycles and export volume |
| **Professional services** | Implementation, TAS-aligned customization, audit readiness workshops |
| **Evidence / WORM storage** | Tiered immutable storage for sealed attestations |

*Specific price points: see [Pricing & Packaging](../sales/pricing-and-packaging.md).*

## Go-to-market

1. **Design partners** — Shadow-plane demos with Medshield/Vaultbank/Gridcore seed tenants
2. **Compliance narrative** — SOC 2 / ISO mapping via Irontally controls and audit intelligence
3. **Technical proof** — Public integration suite (`test:vercel-integration:cloud`) and release evidence packs
4. **Content** — Role-based rebuild pages (CISO, CFO, Board, Audit) under product marketing

## Financial planning assumptions (illustrative)

| Year | ARR target | Notes |
|------|------------|-------|
| Y1 | Design-partner revenue + 3–5 paid tenants | GA epic completion |
| Y2 | Expand MSSP channel | Multi-tenant Command Center as differentiator |
| Y3 | Enterprise tier + WORM compliance upsell | Epic 12 fully productized |

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Sustainability API outage | LKG pulse loop, `IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED` |
| Tenant isolation breach | Ironguard, RLS, integration tests, TAS gatekeeper protocol |
| AI hallucination in scoring | Irontrust frozen ALE math; LLM limited to narrative/RAG (Ironquery) |
| Vendor lock-in concerns | Export APIs, Ironquery CSV/PDF, constitutional TAS documentation |

## Related documents

- [Product Vision](./product-vision.md)
- [Competitive Analysis](../sales/competitive-analysis.md)
- [Marketing Plan](../marketing/marketing-plan.md)
