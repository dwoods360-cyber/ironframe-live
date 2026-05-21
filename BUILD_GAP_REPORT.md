# Hardened Production Build Gap Report // May 2026

**Supersedes:** prior Gap-to-Epic audit (2026-05-15 skeleton).  
**Aligned with:** `EPIC_STATUS.md` @ commit `24911f0`.  
**Code delivery baseline:** `6425e1e` (ingest bus bridge); **doc baseline:** `24911f0`.

---

## Current operational context

| Item | State |
|------|--------|
| **Definitive baseline commit** | `24911f0` (`feat/epic-11-clean-rebuild` synced with `origin`) |
| **Ingest / orchestration code marker** | `6425e1e` — `ingestBusBridge.ts` + `app/api/threats/ingest/route.ts` |
| **Working tree** | Exclude uncommitted `storage/constitutional/*.json` runtime drift from PRs unless intentional |
| **Static verification** | `npx tsc --noEmit` → **exit code 0** |

---

## Reconciled epic posture matrix

Verified functional engineering milestones as of `24911f0`. Percentages are **feature-complete**, not full production GA.

| Epic target | Current % | Verified code delivery block | Operational gaps to full GA |
|:---|:---|:---|:---|
| **Epic 10 — 19-Agent Bus** | **~90%** | Non-blocking `src/services/orchestration/ingestBusBridge.ts` + post-ack graph hook in `app/api/threats/ingest/route.ts`; `compileSovereignOrchestrationBus()` (`b3692c5`). | Expand LangGraph sequence from ~6–8 core nodes to full 19-agent roster or documented sidecars; CI with `GOOGLE_API_KEY` on non-skipped ingest. |
| **Epic 11 — Bank Vault** | **~95%** | RSA-SHA256 `verifyAndCommitVaultResolution` + `BankVaultSupervisorGate.tsx` @ `/admin/clearance/vault` (`0601c4b`, `eb0c67e`). | Staging/production supervisor PEM (`PUBLIC_KEY_*`); vault integration tests in CI on every PR. |
| **Epic 13 — Self-Healing** | **~75%** | `healthPostureMonitor.ts` + `evaluateSystemTriage` + `tests/integration/epic13-telemetry-triage.test.ts` (`0601c4b`). | Hosted cron for `health-posture-triage` and ops smoke on live telemetry drops. |
| **Epic 9 / 5 — Sustainability** | **100% (Eng)** | `SustainabilityAnalyticsPlane.tsx` — Kimbot dialog vs Ironbloom BigInt CFO ALE; `gridcoreCarbonLedgerSync` + cron route (`b0fbaf6`, `6425e1e` chain). | Production `ELECTRICITY_MAPS_API_KEY`; schedule `POST /api/internal/cron/gridcore-rate-poll`. |

### Secondary pipeline (unchanged scope; not blocking this PR)

| Epic | ~% | GA gap |
|------|-----|--------|
| **12 — Evidence Locker** | ~70% | WORM / object-lock; immutability vs digital shredder |
| **15 — Checkpoint freeze** | ~70% | Postgres saver live; pool docs + CI `DATABASE_URL` gate |
| **16 — Ironquery exports** | ~45% | RAG live (`cc890b6`); branded PDF/CSV analyst packs |
| **14 — DEI / Ironethic** | ~25% | No-PII ingest interceptor + salted aggregation |

---

## Key file evidence (quick index)

| Epic | Paths |
|------|--------|
| 10.5 | `src/services/orchestration/ingestBusBridge.ts`, `app/api/threats/ingest/route.ts`, `src/services/orchestration/graph.ts` |
| 10.4 | `tests/unit/sovereignOrchestrationBus.test.ts`, `tests/unit/ingestBusBridge.test.ts` |
| 11 | `src/services/bankVault/vaultResolution.ts`, `lib/security/vaultCrypto.ts`, `app/components/BankVaultSupervisorGate.tsx` |
| 13 | `src/services/irontech/healthPostureMonitor.ts`, `src/services/irontech/triageRouter.ts`, `app/api/internal/cron/health-posture-triage/route.ts` |
| 9/5 | `app/components/SustainabilityAnalyticsPlane.tsx`, `app/services/ironbloom/gridcoreCarbonLedgerSync.ts` |

---

## Recommended PR verification review check

Run against an active `DATABASE_URL` (and `GOOGLE_API_KEY` if exercising the sovereign bus on ingest without `skipOrchestrationBus`).

```bash
# Static compliance
npx tsc --noEmit

# Unit + graph compile assertions
npx vitest run tests/unit/bankVaultDualGate.test.ts tests/unit/ingestBusBridge.test.ts tests/unit/sovereignOrchestrationBus.test.ts

# Relational / API integration gates (Postgres-backed tests skip without DATABASE_URL)
npx vitest run tests/integration/bank-vault-success.test.ts tests/integration/epic13-telemetry-triage.test.ts tests/integration/ingestApi.test.ts
```

**Optional extended matrix:**

```bash
npx vitest run tests/unit/healthPostureMonitor.test.ts tests/unit/triageRouter.test.ts
npx vitest run tests/forensicPipelineGraph.test.ts
npx vitest run tests/unit/ironbloomCarbonTelemetry.test.ts
```

---

## PR body checklist (copy-ready)

- [ ] Baseline cited: `24911f0` / code `6425e1e`
- [ ] Epic 10: ingest → bridge → bus documented; 19-agent GA gap stated
- [ ] Epic 11: vault UI path + PKI ops follow-up
- [ ] Epic 13: triage test + cron scheduling follow-up
- [ ] Epic 9/5: analytics plane; Electricity Maps ops follow-up
- [ ] No accidental `storage/constitutional/*.json` in diff
- [ ] `EPIC_STATUS.md` + this report agree on percentages

---

## Post-merge priorities

1. **Ops:** Vault PKI + health/gridcore crons in production.
2. **Epic 10:** Roster expansion or sidecar documentation; bus on additional ingress paths.
3. **Epic 12:** WORM hardening.
4. **Epic 16:** Ironquery PDF/CSV exports.
5. **Epic 14:** DEI No-PII pipeline.

---

*Generated for PR gate review. Do not treat older commit messages (“100% production completion”) as audit evidence — use this matrix and `EPIC_STATUS.md`.*
