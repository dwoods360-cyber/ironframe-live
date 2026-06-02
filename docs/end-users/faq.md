# FAQ — Ironframe GRC

## General

**What is Ironframe?**  
A multi-tenant GRC platform with quantitative ALE, threat pipeline, sustainability pulse, and audit exports—powered by a 19-agent LangGraph workforce.

**Who should use it?**  
CISOs, GRC teams, CFO/risk officers, internal audit, and MSSPs managing multiple client tenants.

**Is it cloud-only?**  
Production targets Vercel + Supabase. Local dev uses `npm run dev` with `.env.local`.

## Tenants and access

**What tenants exist in demo/staging?**  
Medshield, Vaultbank, Gridcore, Defense—each with isolated UUID, ALE baseline, and carbon zone.

**What is Global Command Center?**  
Aggregate view without a single-tenant cookie. Some features (exports, tenant-scoped carbon) require selecting a specific tenant.

**Why do I see “Tenant context required”?**  
You need an active tenant cookie or path scope. Select a tenant in the switcher or log in again.

## Risk and financial data

**Why are amounts in cents?**  
Financial integrity mandate: all ALE and mitigated values use BigInt cents—no floating-point money math.

**What is ALE?**  
Annualized Loss Expectancy—the expected financial impact of a risk over a year, tenant-baseline calibrated.

## Sustainability

**Why does carbon pulse show “Fallback Active”?**  
Live Electricity Maps data is unavailable; the platform uses a forensic baseline or last-known-good (LKG) bundle so the UI stays functional.

**What is a “dirty grid”?**  
Grid carbon intensity exceeds tenant threshold; Agent 6 (Ironlock) may suppress background workloads.

## Simulation and shadow plane

**What is shadow plane?**  
Staging/simulation mode (`SHADOW_PLANE_ACTIVE`) for demos without mutating production audit semantics.

**Why are GRCBOT cards hidden in Audit Intelligence?**  
Simulation entries are filtered from the production audit sidebar by design.

## Exports and audit

**Where are analyst exports?**  
`/dashboard/exports` — CSV/PDF for the active tenant.

**What is WORM?**  
Write-Once-Read-Many storage for sealed evidence (Epic 12)—prevents deletion after attestation.

## Technical

**How do I report a bug?**  
Support channel with: tenant UUID, timestamp, browser, and `/api/dashboard` or sustainability route status code.

**Where is API documentation?**  
[API Documentation](../technical/api-documentation.md)

## Related documents

- [User Guide](./user-guide.md)
- [Support Guide](../support/support-guide.md)
