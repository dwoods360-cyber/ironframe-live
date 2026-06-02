# Product Overview — Ironframe GRC

## What it is

Ironframe is a **multi-tenant Governance, Risk, and Compliance (GRC) platform** built on Next.js 15, Supabase, and LangGraph.js. It provides a **Global Command Center** for security and compliance leaders to monitor threats, financial risk (ALE), sustainability pulse, insurance posture, and audit intelligence—in one workspace with strict tenant isolation.

## Who it's for

| Persona | Value |
|---------|-------|
| **CISO / Security lead** | Active risks, threat pipeline, Ironwatch telemetry, quarantine controls |
| **CFO / Risk officer** | ALE exposure, insurance savings modeling, cost of non-compliance |
| **GRC / Compliance** | Irontally control mapping, drift detection, analyst exports |
| **Sustainability / ESG** | Carbon pulse, dirty-grid alerts, Kimbot physical-unit enforcement |
| **Internal audit** | Audit Intelligence ledger, forensic playback, signed evidence |
| **MSSP / multi-org ops** | Tenant switcher, aggregate vs scoped dashboards |

## Core features

### Command Center dashboard
- Enterprise heat map, predictive overlays, threat boards
- Tenant switcher (Medshield, Vaultbank, Gridcore, Defense, Global aggregate)
- Handshake / shadow-plane modes for staging and simulation

### Threat & risk pipeline
- Ingest → Irongate sanitize → Active Risks
- Governed impact in BigInt cents
- Realtime sync via Supabase `postgres_changes`

### Sustainability (Ironbloom / Kimbot)
- Live carbon intensity (Electricity Maps) with forensic LKG fallback
- Agent 6 (Ironlock) autonomous throttling on dirty grid windows
- 24h sparkline and governance dividend modeling

### Governance & audit
- Maturity scoring with Ironwatch stale-data penalties
- Audit Intelligence feed with simulation filtering
- Ironquery analyst exports (CSV/PDF) at `/dashboard/exports`

### Security & vault
- Bank Vault dual-gate (Epic 11)
- WORM evidence path (Epic 12, in progress)
- Constitutional override / restoration APIs for break-glass

## Deployment

- **Production:** Vercel (`ironframe-live`)
- **Auth:** Supabase login required for tenant-scoped routes
- **Integration proof:** Cloud suite (`test:vercel-integration:cloud:epic17`)

## Related documents

- [User Guide](../end-users/user-guide.md)
- [Competitive Analysis](../sales/competitive-analysis.md)
- [TAS.md](../TAS.md)
