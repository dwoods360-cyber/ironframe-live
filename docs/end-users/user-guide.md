# User Guide — Ironframe Command Center

## Prerequisites

- Supabase account provisioned for your organization
- Browser: Chrome, Edge, or Firefox (latest)
- Tenant assigned by administrator (or Global Command Center access)

## Signing in

1. Navigate to your Ironframe URL (e.g. `https://ironframe-live.vercel.app`)
2. Open **Login** and authenticate via Supabase
3. After login, land on the **Command Center** dashboard

## Tenant scope

Use the **tenant switcher** (building icon, top navigation):

| Selection | Behavior |
|-----------|----------|
| **Global Command Center** | Aggregate dashboard across tenants (no single-tenant cookie) |
| **Medshield / Vaultbank / Gridcore / Defense** | Scoped data, carbon pulse, and exports for that tenant |

After switching tenants, the dashboard refetches automatically. Brief loading states are normal; panels should not remain blank after load completes.

## Main areas

### Dashboard (home)
- **Enterprise heat map** — scrutiny and agent activity by asset
- **Active Risks** — triage queue for confirmed threats
- **Threat Pipeline** — intake and staging
- **Strategic Intel** — longer-horizon risk signals
- **Audit Intelligence** — GRC ledger and forensic tools (right pane)

### Sustainability Pulse
- Live grid intensity (gCO₂eq/kWh) and sustainability ALE
- **Agent 6 throttling** status when grid is “dirty”
- **Forensic** button — SHA-256 manifest when verified
- If live API is unavailable, **Offline / Verified** LKG bundle displays automatically

### Analyst exports
- Path: **`/dashboard/exports`**
- Download **CSV** or **PDF** ledger for the active tenant
- Requires tenant cookie scope and login

### Simulation / shadow plane
When enabled by your administrator (`SHADOW_PLANE_ACTIVE`), handshake banners may show **verified** without live tenant cookie—used for staging demos only.

## Common workflows

### Triage a new threat
1. Confirm threat appears in **Pipeline** or **Active Risks**
2. Open risk card → review score (cents), controls, assignee
3. Add budget justification or remediation notes as required
4. Check **Audit Intelligence** for ledger entry

### Review carbon / ESG posture
1. Select tenant (e.g. Gridcore)
2. Open Sustainability Pulse in Audit Intelligence area
3. Note intensity source: **live**, **forensic fallback**, or **verified local (LKG)**
4. Review dirty-grid alert if threshold exceeded

### Export for audit
1. Set tenant scope in switcher
2. Go to **Dashboard → Exports** (`/dashboard/exports`)
3. Download CSV/PDF; optional **Seal → WORM** when enabled

## Troubleshooting

| Symptom | Action |
|---------|--------|
| Blank center panels after tenant switch | Wait for refetch; refresh page; confirm tenant cookie set |
| “No active tenant” on exports | Select a tenant (not Global) in switcher |
| Carbon pulse “unavailable” | Check login; retry; LKG loads within ~60s poll |
| 401 on dashboard | Re-login; session may have expired |

See [FAQ](./faq.md) and [Error Messages](../support/error-messages.md).

## Related documents

- [Onboarding](./onboarding.md)
- [Release Notes](./release-notes.md)
