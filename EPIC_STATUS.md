# EPIC STATUS MANIFEST & GOVERNANCE RECORD

**Branch:** `feat/epic-11-clean-rebuild`  
**Evaluation Horizon:** May 2026 Audit Milestone  
**System Class:** CONTROL-FIRST Multi-Tenant Architecture  
**Compiler Baseline:** `npx tsc --noEmit` → **PASSING [EXIT 0]** (source); verify `.next/types` layout exports in CI if needed  
**Last reconciled:** 2026-05-18 (git `06d41c0`, `0601c4b`, `cc890b6`, `697e141`, `711f7f8`)

---

## SECTION 1 — ARCHITECTURAL STATE SUMMARY

This manifest is the single source of truth for the Ironframe Core Platform rebuild. It cross-references file-level implementation, the Git ledger, Prisma schema, and integration test gates.

Structural mandates (non-negotiable):

1. **Financial Integrity:** No floating-point money math. USD pipelines use `BigInt` cents (`mitigatedValueCents`, `financial_ale_cents`).
2. **Sustainability Plane:** Physical units only (`kWh`, `L`, `gCO₂eq`). Monetary-only ingestion is rejected at Irongate / Ironbloom gates.
3. **Isolation:** Tenant boundaries via RLS, cookie-scoped server actions, and DMZ sanitization (**Irongate**, Agent 14).

---

## SECTION 2 — CORE WORKFORCE STATUS SUBSTRATE

### 1. Closed or Baseline Epics (Verified Complete)

| Epic | Subsystem | Verification proof | Status |
| :--- | :--- | :--- | :--- |
| **Epic 4** | Ironwave — Executive telemetry | `91f1d6e`; TAS `[COMPLETED]`; `docs/completed-modules.md` | **[ CLOSED ]** |
| **Epic 6** | Threat state machine | `5697029`; `epic6-concurrency`, `epic6-disconnect`, `epic6-ttl-timeout` | **[ CLOSED ]** |
| **Epic 7** | Ironcast escalation | `completed-modules.md` (2026-04-01); Resend / Ironcast integration tests | **[ CLOSED ]** |
| **Epic 8** | Governed liability | `governed_impact` chips; `formatCentsToAccountingUSD` unit tests | **[ CLOSED ]** |

### 2. Product Owner Active Sprint

| Epic | Subsystem | Notes | Status |
| :--- | :--- | :--- | :--- |
| **Epic 5** | Kimbot — Sustainability plane | Physical metrics (`kWh`, `L`, CO₂e). Overlaps **Epic 9 (Ironbloom)**. | **[ ACTIVE ]** |

### 3. Outstanding Pipeline (Epics 9–16)

| Epic | Module | ~% Done | Remaining to GA | Proof & location |
| :--- | :--- | :--- | :--- | :--- |
| **Epic 9** | Ironbloom | **80%** | Production `ELECTRICITY_MAPS_API_KEY`; Kimbot vs Ironbloom UI split; Gridcore cron in Vercel/pg_cron | `app/services/ironbloom/` · `36c4382` · `256dfc4` |
| **Epic 10** | 19-agent orchestration | **55%** | Production ingest→graph→persist for full roster; specialist depth beyond Ironsight/Ironquery/Irontally stubs | `cc890b6` · `forensicPipelineGraph.ts` · `256dfc4` |
| **Epic 11** | Bank Vault | **92%** | **Mount `BankVaultSupervisorGate` on live threat/clearance pages**; tripartite / evidence sign-off polish; staging PKI key rotation | `0601c4b` · `06d41c0` · `bank-vault-*.test.ts` |
| **Epic 12** | Evidence Locker | **70%** | WORM / object-lock; external immutability audit | `EvidenceVaultClient.tsx` · `d69627c` |
| **Epic 13** | Self-healing | **65%** | Global ops validation; single Agent-12 freeze contract documentation; production cron schedule | `0601c4b` · `711f7f8` · DMS/chaos in `app/lib/` |
| **Epic 14** | DEI / Ironethic | **25%** | No-PII ingest; salt aggregation before persist | TAS policy only · `simulationSignature.ts` |
| **Epic 15** | Checkpoint freeze | **70%** | Checkpoint pool lifecycle / test-env docs; full CI with `DATABASE_URL` | `checkpointer.ts` · `infrastructure/db.ts` · `697e141` |
| **Epic 16** | Ironquery | **45%** | Branded PDF/CSV analyst packs; checkpoint export matrices | `src/services/agents/ironquery.ts` (RAG handler **shipped**) |

#### Recently closed milestones (verified completions)

| Milestone | Evidence |
| :--- | :--- |
| **Epic 11.4 — Dual-gate backend** | `src/services/bankVault/vaultResolution.ts` · `lib/security/vaultCrypto.ts` · `verifyAndCommitVaultResolution` + integrity hash chain (`0601c4b`) |
| **Epic 11.4 — Supervisor UI** | `app/components/BankVaultSupervisorGate.tsx` · `app/actions/bankVaultActions.ts` (`06d41c0`) |
| **Epic 11 — Integration gates** | `tests/unit/bankVaultDualGate.test.ts` · `tests/integration/bank-vault-success.test.ts` (Next.js `cookies` mock) (`0601c4b`) |
| **Epic 13 — Health posture monitor** | `src/services/irontech/healthPostureMonitor.ts` · `POST /api/internal/cron/health-posture-triage` · Ironwatch `apiHeartbeat` telemetry hook (`0601c4b`) |
| **Epic 13 — Live ledger integration** | `evaluateSystemTriage` → `AuditLog` + `integrityEvent` chain; `tests/integration/epic13-telemetry-triage.test.ts` (`0601c4b`) |
| **Epic 15 — Postgres Ironguard facade** | `infrastructure/db.ts` uses `getPostgresCheckpointer()` (`697e141`) |
| **Epic 10/16 — Ironquery analyst node** | `ironqueryAnalystNode` in `graph.ts`; forensic `ironquery` node (`cc890b6`) |
| **Epic 13 — Triage router** | `src/services/irontech/triageRouter.ts` · `tests/unit/triageRouter.test.ts` (`711f7f8`) |

**Roster note:** TAS Agent **15** = Ironquery (Interactive Analyst). Agent **16** = Ironscout (ephemeral recon).

#### Epic 11 & 13 — verified delivery detail

**Epic 11 (~92%)**

- **Gate A (crypto):** `cryptoVerifySignature` (RSA-SHA256) over challenge `threatId:tenantId:operatorId`.
- **Gate B (persistence):** transactional `verifyAndCommitVaultResolution` → `updateThreatWithIntegrity` + `BANK_VAULT_DUAL_GATE_ATTESTATION` + `BANK_VAULT_OVERRIDE_COMMITTED` audit row.
- **Client:** `BankVaultSupervisorGate` displays challenge string and submits via `verifyAndCommitVaultResolutionAction` (server action; no browser import of server-only module).

**Epic 13 (~65%)**

- **`healthPostureMonitor`:** binds sub-50% health bars to `evaluateSystemTriage`; seeds LangGraph threads; mirrors `AUTOMATED_SELF_HEALING_ENGAGED` to Audit Intelligence.
- **Cron:** `app/api/internal/cron/health-posture-triage/route.ts` (`IRONFRAME_CRON_SECRET`).
- **Live workspace ledger:** Ironwatch stale telemetry invokes `invokeTelemetryDropTriage`; triage outcomes flow through existing audit + integrity pipelines.

---

## SECTION 3 — VERIFIED TESTING PIPELINE

| Test | Epic | Role |
| :--- | :--- | :--- |
| `tests/integration/bank-vault-success.test.ts` | 11 | HITL positive attestation chain + `next/headers` cookie mock |
| `tests/unit/bankVaultDualGate.test.ts` | 11 | Dual-gate signature + tenant scope |
| `tests/integration/epic13-telemetry-triage.test.ts` | 13 | TAS §4.3 freeze + `REGISTERED` registry stamp + audit rows |
| `tests/unit/healthPostureMonitor.test.ts` | 13 | Telemetry → health bar mapping |
| `tests/unit/triageRouter.test.ts` | 13 | TAS §4.3 triage routing (mocked checkpointer) |
| `tests/integration/epic15-forensic-rollback.test.ts` | 15 | Postgres saver atomic rollback on downstream fault |
| `tests/forensicPipelineGraph.test.ts` | 10 | Carbon routing; Irongate tenant-stamp rejection |
| `__tests__/integration/epic6-concurrency.test.ts` | 6 / 15 | Ironguard optimistic-lock serialization (Postgres) |
| `__tests__/integration/epic6-disconnect.test.ts` | 6 / 15 | Irontech freeze + resume via sovereign graph |

All Postgres integration tests require `DATABASE_URL` (and sovereign graph paths may require `GOOGLE_API_KEY`).

---

## SECTION 4 — STRATEGIC RESOLUTION MAP (EXECUTION ORDER)

1. **Phase 1 — Epic 11 UI mount (P0)** — Embed **`BankVaultSupervisorGate`** on the **live threat page** (and/or `/admin/clearance`) so supervisors can submit hardware signatures against the displayed challenge string. Backend dual-gate engines are **complete**; this phase closes the last mile for Epic 11 GA.
2. **Phase 2 — Epic 11 merge & staging PKI** — Run `bank-vault-success` + `bankVaultDualGate` in CI; configure supervisor `PUBLIC_KEY_*` / PEM in staging; tripartite + evidence sign-off polish.
3. **Phase 3 — Epic 13 production validation** — ~~`healthPostureMonitor` + cron + Ironwatch hook~~ **Done (`0601c4b`)**. Next: Vercel/pg_cron schedule for `health-posture-triage`; smoke-test Audit Intelligence fidelity under real telemetry drops.
4. **Phase 4 — Sustainability seals (Epic 9 / 5)** — Gridcore cron; production Electricity Maps keys; Kimbot vs Ironbloom UI separation; CFO carbon ALE line.
5. **Phase 5 — Checkpoint hardening (Epic 15)** — ~~Postgres Ironguard facade~~ **Done (`697e141`)**. Pool teardown docs; full integration gate in CI.
6. **Phase 6 — Orchestration bus (Epic 10)** — ~~Ironquery RAG nodes~~ **Done (`cc890b6`)**. Production ingest→graph→persist for remaining specialists.
7. **Phase 7 — Evidence locker (Epic 12)** — WORM / external immutability audit (pairs with Epic 11 sign-off).
8. **Phase 8 — Analyst exports (Epic 16)** — Ironquery-branded PDF/CSV packs.
9. **Phase 9 — DEI pipeline (Epic 14)** — No-PII salted aggregation ingest.

---

## SECTION 5 — GIT LEDGER (EPIC-SIGNAL COMMITS)

| Commit | Signal |
| :--- | :--- |
| `06d41c0` | Epic 11.4 `BankVaultSupervisorGate` + `bankVaultActions` |
| `0601c4b` | Epic 11.4 vault engines + Epic 13 health posture/cron + integration tests |
| `cc890b6` | Epic 10/16 Ironquery RAG across sovereign + forensic graphs |
| `697e141` | Epic 15 Postgres Ironguard facade; manifest lock |
| `711f7f8` | Epic 13 triage routers + type alignment |
| `256dfc4` | Epics 5/9/10/15 handlers, Postgres checkpointer authority |
| `5697029` | Epic 6 closed |
| `91f1d6e` | Epic 4 closed |
| `8b0b80c` / `ea51ec2` | Epic 11 governance substrate |

---

*Re-run after each epic merge: `git log --oneline -n 20` + `npx tsc --noEmit` + gap audit (`BUILD_GAP_REPORT.md`).*
