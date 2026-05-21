# Ironframe General Availability (GA) Open Roadmap

**Status:** Active — May 2026  
**Authoritative epic percentages:** [`EPIC_STATUS.md`](../EPIC_STATUS.md) · [`BUILD_GAP_REPORT.md`](../BUILD_GAP_REPORT.md)  
**Do not treat commit messages claiming “100% production completion” as audit truth.**

---

## Tier A: Production Operationalization (highest priority)

| Task | Status | Implementation notes |
|------|--------|----------------------|
| **Vault Supervisor PKI** | Open | Set `PUBLIC_KEY_ID` + `PUBLIC_KEY_<NORMALIZED_ID>` (PEM SPKI) or `VAULT_SUPERVISOR_PUBLIC_KEY` / `PUBLIC_KEY` fallback. See `lib/security/vaultCrypto.ts`, `src/services/bankVault/vaultResolution.ts`, `tests/integration/pki-verification.test.ts`. UI: `/admin/clearance/vault`. |
| **Hosted scheduler hooks** | Partial | `vercel.json` registers `carbon-budget-reallocation` only. Add: `POST /api/internal/cron/health-posture-triage`, `POST /api/internal/cron/gridcore-rate-poll` (Bearer `IRONFRAME_CRON_SECRET` / `CRON_SECRET`). Alternative: Supabase `pg_cron` calling same routes. |
| **Production credentials** | Open | Inject per environment (never commit): `ELECTRICITY_MAPS_API_KEY`, `GOOGLE_API_KEY` (Ironquery / sovereign bus), `RESEND_API_KEY` + `THREAT_CONFIRMATION_RECIPIENTS`. Template: [`.env.example`](../.env.example). |

### Tier A verification

```bash
npx tsc --noEmit
npx vitest run tests/integration/pki-verification.test.ts tests/integration/epic13-telemetry-triage.test.ts
# After crons registered: hit gridcore-rate-poll and health-posture-triage with CRON_SECRET
```

---

## Tier B: Auditor-ready UI assets (market parity)

| Task | Status | Implementation notes |
|------|--------|----------------------|
| **Evidence table view** | Done (UI) | `IrontallyGovernancePanel` → `GET /api/grc/irontally?readiness=1`. Compiler: `src/services/compliance/irontallyEngine.ts`. Smoke: ingest → bus → refresh ledger. |
| **Epic 16 export packs** | Open | RAG live (`src/services/agents/ironquery.ts`); need branded PDF + CSV download UI (parity with `downloadComplianceReadinessPdfAction`). |
| **Epic 12 WORM hardening** | Open | `EvidenceVaultClient.tsx`; DB-level immutability + block shredder on signed rows. |

---

## Tier C: Architectural scale and hardening

| Task | Status | Implementation notes |
|------|--------|----------------------|
| **Epic 10 expansion** | Open | Live bus ~6–8 nodes (`compileSovereignOrchestrationBus` in `src/services/orchestration/graph.ts`); ingest bridge `ingestBusBridge.ts`. Document or implement remaining specialist sidecars. |
| **Epic 14 DEI salt matrix** | Open | No-PII pre-persist salting before diversity metrics touch disk (`simulationSignature.ts`, TAS policy). |
| **Stryker mutation gates** | Open | Target ≥85% mutation on BigInt accounting (`src/services/irontrust/mathEngine.ts`, `core/irontrust/`). |

---

## Suggested execution order

1. Tier A credentials + PKI on staging.  
2. Tier A crons in `vercel.json` (or pg_cron).  
3. Tier B evidence table + readiness smoke (ingest → bus → `?readiness=1`).  
4. Merge `feat/epic-11-clean-rebuild` with gap-report test matrix.  
5. Tier B Epic 16 exports, then Tier C.

---

## Checkbox tracker (copy for PRs)

### Tier A

- [ ] Vault Supervisor PKI: staging/production `PUBLIC_KEY_*` (no dev fallback strings)
- [x] Hosted crons registered in `vercel.json` (verify secrets + route auth in staging)
- [ ] Production: `ELECTRICITY_MAPS_API_KEY`, `GOOGLE_API_KEY`, `RESEND_API_KEY`

### Tier B

- [x] Evidence table in `IrontallyGovernancePanel` (`?readiness=1`)
- [ ] Epic 16 Ironquery PDF + CSV export packs
- [ ] Epic 12 WORM / object-lock on forensic attestations

### Tier C

- [ ] Epic 10: 19-agent roster doc or bus expansion
- [ ] Epic 14: DEI salted ingest (no raw PII on disk)
- [ ] Stryker ≥85% on BigInt accounting modules
