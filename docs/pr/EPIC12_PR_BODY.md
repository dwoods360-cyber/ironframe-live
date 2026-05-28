## Overview
This PR fully implements **Epic 12 (Evidence Immutability)** by introducing a strict, multi-plane validation barrier before any destructive digital shred operations are executed. By cross-checking identities across both the shadow-plane (`RiskEvent`) and the production-plane (`ThreatEvent`), the platform prevents structural evidence tampering.

## Core Implementations
- **`signedAttestationGuard.ts`**: Implements programmatic lookups for forensic seals, Bank Vault HITL signatures, dual-gate attestations, and shadow CISO handshakes.
- **`shredderActions.ts`**: Intercepts `executeDigitalShred`. Interventions trigger an explicit fail-closed `EPIC_12_ATTESTATION_IMMUTABILITY_BLOCK` error if an active signature exists.

## Verification & Testing Matrix
- **Unit Isolation Testing** (`tests/unit/signedAttestationGuard.test.ts`): Validates individual signature detection and ledger alignment blocks.
- **Integration Validation** (`tests/integration/epic12-shredder-attestation-guard.test.ts`): Verifies the explicit block/allow logic constraints across standard lab and multi-tenant scenarios.
- **Vercel live smoke** (`scripts/vercel-integration-suite.mjs` + `scripts/staging-smoke-cron.mjs`): Cron auth matrix against preview deployment when `STAGING_SMOKE_BASE_URL` is set.
- **CI**: `vercel-integration-smoke.yml` runs Epic 12 vitest on every PR; optional live smoke when repo variable `VERCEL_PREVIEW_SMOKE_ENABLED=true` and secrets are configured.

## Test plan
- [x] `npm run test:integration:epic12` — 5/5 passing
- [ ] Preview deploy: `npx vercel` on `feat/epic12-evidence-immutability`
- [ ] `STAGING_SMOKE_BASE_URL=<preview> node scripts/vercel-integration-suite.mjs`
- [ ] Merge to `main` and confirm production deploy includes guard

**Result score:** 5/5 passing tests (local vitest). Total repository static coverage maintained with zero `as any` type escapes in Epic 12 modules.
