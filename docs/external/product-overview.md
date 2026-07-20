# Product Overview — Ironframe GRC

## What it is

Ironframe is a **multi-tenant Governance, Risk, and Compliance (GRC) platform** built on Next.js 15, Supabase, and LangGraph.js. It provides a **Global Command Center** for security and compliance leaders to monitor threats, financial risk (ALE), sustainability pulse, insurance posture, and audit intelligence—in one workspace with strict tenant isolation.

## Who it's for

| Persona | Value |
|---------|-------|
| **CISO / Security lead** | Active risks, threat pipeline, Ironwatch telemetry, quarantine controls |
| **CFO / Risk officer** | ALE exposure, insurance savings modeling, cost of non-compliance |
| **GRC / Compliance** | Irontally control mapping, drift detection, analyst exports |
| **Sustainability / ESG** | Carbon pulse, dirty-grid alerts, Ironbloom (Agent 17) physical-unit enforcement |
| **Internal audit** | Audit Intelligence ledger, forensic playback, signed evidence |
| **MSSP / multi-org ops** | Tenant switcher, aggregate vs scoped dashboards |

## Core features

### Command Center dashboard
- Enterprise heat map, predictive overlays, threat boards
- Tenant switcher (demo seed baselines for engineering labs — Medshield, Vaultbank, Gridcore, Defense — plus Global aggregate). **Not real customers.**
- Handshake / shadow-plane modes for staging and simulation

### Threat & risk pipeline
- Ingest → Irongate sanitize → Active Risks
- Governed impact in BigInt cents
- Realtime sync via Supabase `postgres_changes`

### Sustainability (Ironbloom — Agent 17)
- Live carbon intensity (Electricity Maps) with forensic LKG fallback
- Ironlock (Agent 6) autonomous throttling on dirty grid windows
- 24h sparkline and governance dividend modeling

### Simulation drills (shadow plane)
- **Kimbot (Bot B):** Bot B — Red Team Adversary Simulation for drills — separate from the 19-agent workforce

### Governance & audit
- Maturity scoring with Ironwatch stale-data penalties
- Audit Intelligence feed with simulation filtering
- Ironquery analyst exports (CSV/PDF) at `/exports`

### Security & vault
- Bank Vault dual-gate (Epic 11)
- WORM evidence path (Epic 12)
- Constitutional override / restoration APIs for break-glass

## Deployment

- **Production:** Vercel (`ironframe-live`)
- **Auth:** Invite-only / sales-assisted operator login for tenant-scoped routes
- **Integration proof:** Cloud suite (`test:vercel-integration:cloud:epic17`)

## Related documents

- [Design Partner Operator Packet](../user-manuals/design-partner-operator-packet.md)
- [User Guide](../user-manuals/user-guide.md)
- [Competitive Analysis](../sales/competitive-analysis.md)
- [TAS.md](../TAS.md)
