## Overview
This PR completes **Epic 16 (Ironquery Analyst Pack Exports)** PDF extension: a binary `application/pdf` streaming path alongside the existing CSV export, with BigInt ALE baselines and kWh-only physical units.

## Core Implementations
- **`app/api/internal/ironquery/export/route.ts`**: Handles `format=pdf` (query or POST body); streams PDF with `content-disposition: attachment`.
- **`app/utils/ironquery/pdfReportEncoder.ts`**: jsPDF + autotable layout; `tenantUtilityLocation` context; ALE cents as `.toString()` + accounting USD display.
- **`scripts/vercel-integration-suite.mjs`**: `npm run test:vercel-integration` (tsc) and `:live` (cron smoke + CSV/PDF probes).

## Verification & Testing Matrix
- **TypeScript**: `npx tsc --noEmit` — pass
- **ESLint**: `npx eslint .` — 0 errors
- **Live preview** (`feat/ironquery-pdf-exports`): https://ironframe-live-4wdykau9r-dwoods360-6345s-projects.vercel.app
  - Cron smoke: **21/21** (`freezeGateGreen=true`)
  - Ironquery CSV probe: **200** `text/csv`
  - Ironquery PDF probe: **200** `application/pdf` (`%PDF-1.3`)

## GRC invariants
- ALE baselines: Medshield `1110000000n`, Vaultbank `590000000n`, Gridcore `470000000n` cents
- Physical unit gate: `kWh` only (non-kWh rejected)
- Tenant isolation: `x-tenant-id` + Bearer cron auth via `internalTokenGatedApiPath()`

## Test plan
- [x] `npm run test:vercel-integration`
- [x] `STAGING_SMOKE_BASE_URL=<preview> npm run test:vercel-integration:live`
- [ ] Merge to `main` and production deploy
