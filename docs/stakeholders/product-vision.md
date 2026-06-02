# Product Vision — Ironframe GRC

## Purpose

Ironframe is a **control-first** Governance, Risk, and Compliance (GRC) platform that replaces qualitative heatmaps and manual spreadsheets with **defensible, quantitative risk**—Annualized Loss Expectancy (ALE) in BigInt cents—and **zero-trust ingestion** for every external payload.

Organizations use Ironframe to:

- Quantify cyber and operational risk in financial terms auditors and boards accept
- Operate a multi-tenant Command Center with strict isolation (Medshield, Vaultbank, Gridcore, Defense)
- Automate threat intake, sustainability (ESG) telemetry, and compliance mapping via a specialized 19-agent workforce
- Maintain forensic evidence chains suitable for SOC 2 / ISO 27001 audit programs

## Strategic goals (2026)

1. **GA reliability** — Production cron, PKI vault gates, WORM evidence, and sustainability live-data paths green on Vercel
2. **Financial integrity** — No float math on money paths; all ALE and mitigated value in integer cents
3. **Tenant sovereignty** — No cross-tenant data bleed via RLS, cookies, Ironguard headers, and server actions
4. **Observable AI** — LangGraph checkpoints, human-in-the-loop attestations, no black-box LLM scoring
5. **Sustainability truth** — Physical units (kWh, gCO₂eq) enforced at Irongate; monetary-only ESG proxies rejected

## Key performance indicators (KPIs)

| KPI | Definition | Target (GA+) |
|-----|------------|--------------|
| **Tenant isolation incidents** | Confirmed cross-tenant reads/writes | 0 |
| **Dashboard availability** | Command Center `/api/dashboard` success rate | ≥ 99.5% |
| **Ironwatch fidelity** | Electricity Maps / sustainability heartbeat healthy | ≥ 99% (with LKG fallback) |
| **Mean time to triage** | Threat ingest → Active Risk assignment | < 15 min (automated path) |
| **Evidence immutability** | WORM-sealed artifacts with signed attestation | 100% of sealed exports |
| **Integration gate pass rate** | `test:vercel-integration:cloud` on main | 100% before promote |
| **Maturity score accuracy** | Governance maturity recalc without float drift | 100% unit test pass |

## Non-goals

- Replacing full GRC content libraries (NIST, ISO) — Ironframe maps controls, it does not rewrite standards
- Unauthenticated public multi-tenant APIs — all tenant scope requires Supabase session + Ironguard context
- Hotfixes that bypass Irongate (Agent 14) or invent missing tenant rows to force tests green

## Success narrative

When Ironframe succeeds, a CISO sees **one Command Center** with live threat posture, carbon pulse, insurance savings modeling, and audit-ready exports—backed by math that survives regulatory scrutiny, not slide-deck colors.

## Related documents

- [Product Roadmap](./product-roadmap.md)
- [Technical Requirements](./technical-requirements.md)
- [TAS.md](../TAS.md)
