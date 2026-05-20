# EPIC STATUS MANIFEST & GOVERNANCE RECORD

**Branch:** `feat/epic-11-clean-rebuild`  
**Evaluation Horizon:** May 2026 Audit Milestone  
**System Class:** CONTROL-FIRST Multi-Tenant Architecture  
**Compiler Baseline:** `npx tsc --noEmit` → **PASSING [EXIT 0]**  
**Last reconciled:** 2026-05-18 (git `697e141`, `711f7f8`, `256dfc4`)

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
| **Epic 10** | 19-agent orchestration | **55%** | Production ingest→graph→persist for full roster; specialist depth beyond Ironsight/Ironquery/Irontally stubs | `src/services/orchestration/` · `forensicPipelineGraph.ts` · `256dfc4` |
| **Epic 11** | Bank Vault | **85%** | HITL attestation polish; tripartite / evidence sign-off hardening | `8b0b80c` · `ea51ec2` · `bank-vault-*.test.ts` |
| **Epic 12** | Evidence Locker | **70%** | WORM / object-lock; external immutability audit | `EvidenceVaultClient.tsx` · `d69627c` |
| **Epic 13** | Self-healing | **55%** | Single Agent-12 freeze contract; wire `evaluateSystemTriage` globally (`healthBarPercent < 50%`) | `triageRouter.ts` · `711f7f8` · DMS/chaos in `app/lib/` |
| **Epic 14** | DEI / Ironethic | **25%** | No-PII ingest; salt aggregation before persist | TAS policy only · `simulationSignature.ts` |
| **Epic 15** | Checkpoint freeze | **65%** | Postgres authority live; optional pool lifecycle / test env docs | `checkpointer.ts` · `infrastructure/db.ts` (Postgres facade) · `697e141` |
| **Epic 16** | Ironquery | **45%** | Branded PDF/CSV analyst packs; checkpoint export matrices | `src/services/agents/ironquery.ts` (RAG handler **shipped**) |

#### Recently closed milestones (since prior manifest)

| Milestone | Evidence |
| :--- | :--- |
| **Epic 15 — Postgres Ironguard facade** | `infrastructure/db.ts` uses `getPostgresCheckpointer()`; `epic6-concurrency.test.ts` skips without `DATABASE_URL` |
| **Epic 10/16 — Ironquery analyst node** | `ironqueryAnalystNode` in `graph.ts`; `ironquery` node in `forensicPipelineGraph.ts`; `generateIronqueryAnalystInsight` + `summarySignature` |
| **Epic 13 — Triage router committed** | `src/services/irontech/triageRouter.ts` · `tests/unit/triageRouter.test.ts` · `711f7f8` |

**Roster note:** TAS Agent **15** = Ironquery (Interactive Analyst). Agent **16** = Ironscout (ephemeral recon).

---

## SECTION 3 — VERIFIED TESTING PIPELINE

| Test | Epic | Role |
| :--- | :--- | :--- |
| `tests/integration/epic15-forensic-rollback.test.ts` | 15 | Postgres saver atomic rollback on downstream fault |
| `tests/forensicPipelineGraph.test.ts` | 10 | Carbon routing; Irongate tenant-stamp rejection |
| `__tests__/integration/epic6-concurrency.test.ts` | 6 / 15 | Ironguard optimistic-lock serialization (Postgres) |
| `__tests__/integration/epic6-disconnect.test.ts` | 6 / 15 | Irontech freeze + resume via sovereign graph |
| `tests/integration/bank-vault-success.test.ts` | 11 | HITL positive attestation chain |
| `tests/unit/triageRouter.test.ts` | 13 | TAS §4.3 health triage routing |

All Postgres integration tests require `DATABASE_URL` (and sovereign graph paths may require `GOOGLE_API_KEY`).

---

## SECTION 4 — STRATEGIC RESOLUTION MAP (EXECUTION ORDER)

1. **Phase 1 — Checkpoint consolidation (Epic 15)** — ~~Retire in-memory `Map` in `infrastructure/db.ts`~~ **Done (`697e141`)**. Next: document pool teardown in long-running test suites.
2. **Phase 2 — Orchestration ingress (Epic 10)** — ~~Wire Ironquery RAG into `graph.ts`~~ **Done (`697e141`)**. Next: deepen remaining specialist nodes + production ingest bus.
3. **Phase 3 — Sustainability seals (Epic 9 / 5)** — Gridcore `pg_cron` / Vercel cron; production Electricity Maps keys; CFO carbon ALE line.
4. **Phase 4 — Resilience activation (Epic 13)** — ~~Commit triage router~~ **Done (`711f7f8`)**. Next: mount triage on cron / Ironwatch health feeds globally.
5. **Phase 5 — RBAC & evidence (Epic 11 & 12)** — Dual-gate handshake polish; WORM evidence locker.
6. **Phase 6 — Analyst exports (Epic 16)** — Ironquery-branded PDF/CSV packs (handler exists; export templates do not).
7. **Phase 7 — DEI pipeline (Epic 14)** — No-PII salted aggregation ingest.

---

## SECTION 5 — GIT LEDGER (EPIC-SIGNAL COMMITS)

| Commit | Signal |
| :--- | :--- |
| `697e141` | Epic 15 Postgres Ironguard facade; Epic 10/16 Ironquery graph wiring |
| `711f7f8` | Epic 13 triage routers + type alignment |
| `256dfc4` | Epics 5/9/10/15 handlers, Postgres checkpointer authority |
| `5697029` | Epic 6 closed |
| `91f1d6e` | Epic 4 closed |
| `8b0b80c` / `ea51ec2` | Epic 11 governance substrate |

---

*Re-run after each epic merge: `git log --oneline -n 20` + `npx tsc --noEmit` + gap audit (`BUILD_GAP_REPORT.md`).*
