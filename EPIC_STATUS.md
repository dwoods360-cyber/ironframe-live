# EPIC STATUS MANIFEST & GOVERNANCE RECORD

**Branch:** `feat/epic-11-clean-rebuild`  
**Evaluation Horizon:** May 2026 Audit Milestone  
**System Class:** CONTROL-FIRST Multi-Tenant Architecture  
**Definitive baseline (orchestration + vault + ingest bridge):** `6425e1e`  
**Remote tracking:** `origin/feat/epic-11-clean-rebuild` @ `6425e1e` (synced)  
**Compiler Baseline:** `npx tsc --noEmit` → **PASSING [EXIT 0]** (source)  
**Last reconciled:** 2026-05-20 (post-push audit; commit `6425e1e`)

---

## POST-PUSH AUDIT TRAIL (May 2026)

| Epic | Feature-complete | GA gap (honest) |
| :--- | :--- | :--- |
| **Epic 10** | **~90%** | Expand bus from 6–8 specialist nodes toward full 19-agent roster; CI with `DATABASE_URL` + `GOOGLE_API_KEY` on ingest path |
| **Epic 11** | **~95%** | Staging/production supervisor PKI (`PUBLIC_KEY_*` / PEM); tripartite polish; CI vault gates on every PR |
| **Epic 13** | **~75%** | Production cron for `health-posture-triage`; ops smoke under real telemetry drops |
| **Epic 9 / 5** | **~85%** | Production `ELECTRICITY_MAPS_API_KEY`; hosted Gridcore cron schedule |
| **Epic 12** | **~70%** | WORM / object-lock; block shredder on signed attestations |
| **Epic 15** | **~70%** | Checkpoint pool docs; full CI with `DATABASE_URL` |
| **Epic 16** | **~45%** | Ironquery-branded PDF/CSV analyst packs |
| **Epic 14** | **~25%** | No-PII DEI ingest interceptor + salted aggregation |

**Baseline commit `6425e1e` (8 files, +453 / −196 lines):** non-blocking **`ingestBusBridge`** on `POST /api/threats/ingest`, `SovereignGraphState` routing keys, `tests/unit/ingestBusBridge.test.ts`, `tests/integration/ingestApi.test.ts` safety mocks.

**Prior substrate on branch:** `b3692c5` `compileSovereignOrchestrationBus` · `eb0c67e` vault UI @ `/admin/clearance/vault` · `b0fbaf6` `SustainabilityAnalyticsPlane` · `0601c4b` vault + triage engines.

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
| **Epic 7** | Ironcast escalation | `completed-modules.md`; Resend / Ironcast integration tests | **[ CLOSED ]** |
| **Epic 8** | Governed liability | `governed_impact` chips; `formatCentsToAccountingUSD` unit tests | **[ CLOSED ]** |

### 2. Product Owner Active Sprint

| Epic | Subsystem | Notes | Status |
| :--- | :--- | :--- | :--- |
| **Epic 5** | Kimbot — Sustainability plane | Physical metrics; UI isolated in `SustainabilityAnalyticsPlane` (`b0fbaf6`). Overlaps **Epic 9**. | **[ ACTIVE ]** |

### 3. Outstanding Pipeline (Epics 9–16)

| Epic | Module | ~% Done | Remaining to GA | Proof & location |
| :--- | :--- | :--- | :--- | :--- |
| **Epic 9** | Ironbloom | **85%** | Production Electricity Maps key; Vercel/pg_cron for `gridcore-rate-poll` | `gridcoreCarbonLedgerSync.ts` · `SustainabilityAnalyticsPlane` · `b0fbaf6` |
| **Epic 10** | 19-agent orchestration | **90%** | Full roster in bus; forensic + sovereign graph parity; ingest CI with live keys | **`6425e1e`** · `ingestBusBridge.ts` · `graph.ts` (`b3692c5`) · `forensicPipelineGraph.ts` |
| **Epic 11** | Bank Vault | **95%** | Staging/production supervisor PKI; tripartite / evidence sign-off | `eb0c67e` · `06d41c0` · `0601c4b` · `/admin/clearance/vault` |
| **Epic 12** | Evidence Locker | **70%** | WORM / object-lock; immutability vs digital shredder | `EvidenceVaultClient.tsx` · `d69627c` |
| **Epic 13** | Self-healing | **75%** | Production cron schedule; global ops validation | `0601c4b` · `epic13-telemetry-triage.test.ts` · `711f7f8` |
| **Epic 14** | DEI / Ironethic | **25%** | No-PII ingest; salt aggregation before persist | TAS policy · `simulationSignature.ts` |
| **Epic 15** | Checkpoint freeze | **70%** | Pool lifecycle docs; CI with `DATABASE_URL` | `checkpointer.ts` · `697e141` |
| **Epic 16** | Ironquery | **45%** | Branded PDF/CSV analyst packs | `ironquery.ts` · RAG in graph (`cc890b6`) |

#### Recently closed milestones (verified completions)

| Milestone | Evidence |
| :--- | :--- |
| **Epic 10.5 — Ingest → bus bridge (non-blocking)** | `src/services/orchestration/ingestBusBridge.ts` · `app/api/threats/ingest/route.ts` · `orchestrationBusCycle` on `ingestionDetails` · **`6425e1e`** |
| **Epic 10.4 — Sovereign workforce bus** | `compileSovereignOrchestrationBus()` in `graph.ts` — Ironcore → Ironscribe → Ironsight → Ironquery → Ironlock/Ironcast · `b3692c5` · `tests/unit/sovereignOrchestrationBus.test.ts` |
| **Epic 10/16 — Ironquery RAG** | `ironqueryAnalystNode` + `generateIronqueryAnalystInsight` · `cc890b6` |
| **Epic 11.4 — Dual-gate backend** | `vaultResolution.ts` · `vaultCrypto.ts` · `0601c4b` |
| **Epic 11.4 — Supervisor UI** | `BankVaultSupervisorGate.tsx` · `bankVaultActions.ts` · mounted at **`/admin/clearance/vault`** (`eb0c67e`, `06d41c0`) |
| **Epic 11 — Integration gates** | `bankVaultDualGate.test.ts` · `bank-vault-success.test.ts` |
| **Epic 9/5 — Sustainability control plane** | `SustainabilityAnalyticsPlane.tsx` · Kimbot vs Ironbloom ledger split · `b0fbaf6` |
| **Epic 13 — Health posture + triage** | `healthPostureMonitor.ts` · `evaluateSystemTriage` · `epic13-telemetry-triage.test.ts` (`0601c4b`) |
| **Epic 15 — Postgres checkpointer** | `infrastructure/db.ts` · `getPostgresCheckpointer()` (`697e141`) |

**Roster note:** TAS Agent **15** = Ironquery. Agent **16** = Ironscout. Ironcast (Agent 7) is a **notification sidecar** in the bus terminal node, not a LangGraph ingest specialist for all 19 agents.

#### Epic 10 — architecture detail (~90%)

**Ingest → bridge → bus (live):**

1. `POST /api/threats/ingest` completes existing GRC / acknowledgement / chaos paths unchanged.
2. When not skipped (`skipOrchestrationBus` or `IRONFRAME_INGEST_BUS_DISABLED=1`), **`invokeIngestOrchestrationBus`** runs **`compileSovereignOrchestrationBus`** with Postgres `thread_id` = `threatId`.
3. Response may include `orchestrationBus.executionAuditTrail`, `ironquerySignature`, or `orchestrationBusError` (ack **always** succeeds if bus fails).

**Specialist loop today (~6–8 nodes):** Irongate (forensic graph) · Ironcore router · Ironscribe · Ironsight · Ironquery · Ironlock (health &lt;50%) · Ironcast audit/notify · Irontrust/Irontally on parallel graphs.

**Not yet GA:** Full 19-agent continuous loop; automatic invoke from every threat-creation path (only post-ack ingest today).

#### Epic 11 — architecture detail (~95%)

- **Gate A:** RSA-SHA256 over `threatId:tenantId:operatorId`.
- **Gate B:** `verifyAndCommitVaultResolution` + integrity chain + audit rows.
- **UI:** `BankVaultSupervisorGate` on **`/admin/clearance/vault`**; legacy disposition table at `/admin/clearance`.

#### Epic 13 — architecture detail (~75%)

- **`healthPostureMonitor`** + **`evaluateSystemTriage`** (TAS §4.3, &lt;50% health bar).
- **Cron:** `POST /api/internal/cron/health-posture-triage`.
- **Ironwatch:** stale Electricity Maps → `invokeTelemetryDropTriage`.
- **Test:** `tests/integration/epic13-telemetry-triage.test.ts` (requires `DATABASE_URL`).

---

## SECTION 3 — VERIFIED TESTING PIPELINE

| Test | Epic | Role |
| :--- | :--- | :--- |
| `tests/unit/ingestBusBridge.test.ts` | 10.5 | Skip flags; tenant/threat validation |
| `tests/integration/ingestApi.test.ts` | 10.5 / 8 | GRC gate; bus mocked off in unit suite |
| `tests/unit/sovereignOrchestrationBus.test.ts` | 10 | Bus compile smoke |
| `tests/integration/bank-vault-success.test.ts` | 11 | HITL attestation + cookie mock |
| `tests/unit/bankVaultDualGate.test.ts` | 11 | Dual-gate signature + tenant scope |
| `tests/integration/epic13-telemetry-triage.test.ts` | 13 | TAS §4.3 freeze + audit rows (Postgres) |
| `tests/unit/healthPostureMonitor.test.ts` | 13 | Telemetry → health bar mapping |
| `tests/unit/triageRouter.test.ts` | 13 | Triage routing (mocked checkpointer) |
| `tests/integration/epic15-forensic-rollback.test.ts` | 15 | Postgres saver rollback |
| `tests/forensicPipelineGraph.test.ts` | 10 | Irongate tenant stamp; carbon routing |
| `tests/unit/ironbloomCarbonTelemetry.test.ts` | 9 | Gridcore ledger sync; ALE math |
| `__tests__/integration/epic6-concurrency.test.ts` | 6 / 15 | Ironguard serialization (Postgres) |
| `__tests__/integration/epic6-disconnect.test.ts` | 6 / 15 | Irontech freeze + resume |

Postgres integration tests require `DATABASE_URL`. Sovereign bus / Ironscribe paths require `GOOGLE_API_KEY` when the bus is not skipped.

---

## SECTION 4 — STRATEGIC RESOLUTION MAP (PR → MAIN)

1. **P0 — Documentation** — ~~Refresh `EPIC_STATUS.md` to `6425e1e`~~ **Done (this file).** Optionally align `BUILD_GAP_REPORT.md`.
2. **P0 — PR hygiene** — Open PR from `feat/epic-11-clean-rebuild`; CI matrix: `bank-vault-*`, `epic13-telemetry-triage`, `ingestApi`, `sovereignOrchestrationBus`, `tsc --noEmit`.
3. **Epic 11 GA** — Staging supervisor PKI; smoke `/admin/clearance/vault` with real `ThreatEvent.id`.
4. **Epic 13 ops** — Schedule `health-posture-triage` + `gridcore-rate-poll` in production.
5. **Epic 10 GA** — Register remaining TAS agents or document sidecars; optional strict bus failure mode; threat-creation paths invoke bus.
6. **Epic 12** — WORM / immutability audit.
7. **Epic 16** — Ironquery PDF/CSV exports.
8. **Epic 14** — DEI No-PII pipeline.

---

## SECTION 5 — GIT LEDGER (EPIC-SIGNAL COMMITS)

| Commit | Signal |
| :--- | :--- |
| **`6425e1e`** | **Baseline — Epic 10.5 non-blocking `ingestBusBridge` + ingest route + unit/API test safety** |
| `a23af5c` | Storage reconcile (post bus compile) |
| `b3692c5` | `compileSovereignOrchestrationBus` + state keys + sovereign bus unit test |
| `b0fbaf6` | `SustainabilityAnalyticsPlane` + CFO BigInt ALE line |
| `eb0c67e` | Layout typing fix; vault clearance panel mount |
| `06d41c0` | `BankVaultSupervisorGate` + `bankVaultActions` |
| `0601c4b` | Vault engines + Epic 13 cron/tests |
| `cc890b6` | Ironquery RAG (sovereign + forensic graphs) |
| `697e141` | Postgres Ironguard facade; manifest lock |
| `711f7f8` | Epic 13 triage routers |
| `256dfc4` | Agent handlers + Postgres checkpointer |
| `5697029` | Epic 6 closed |
| `91f1d6e` | Epic 4 closed |

---

*Re-run after each epic merge: `git log --oneline -n 20` + `npx tsc --noEmit` + gap audit (`BUILD_GAP_REPORT.md`). Exclude uncommitted `storage/constitutional/*.json` runtime drift from PR unless intentional.*
