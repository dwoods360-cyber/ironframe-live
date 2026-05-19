# Ironframe Build Gap Report (Epic 9–16)

**Audit date:** 2026-05-15  
**Auditor role:** Principal GRC Systems Auditor (Gap-to-Epic)  
**Record of truth:** Master manifest Epics 9–16 vs. current `/app`, `/services`, `/prisma`, `docs/TAS.md`

---

## Executive summary

| Epic | Manifest % | Verified % | Verdict |
|------|------------|------------|---------|
| **9 — Ironbloom** | In Progress | **~75%** | Physical-unit gates **live**; Gridcore polling **live**; Sustainability ALE **added this sprint** |
| **10 — Orchestration** | 20% | **~35%** | LangGraph + Ironcore routing **upgraded**; specialist stubs remain |
| **11 — Bank Vault** | 85% | **~85%** | Confirmed — RBAC, attestation, hashes, 3-key override |
| **12 — Evidence Locker** | Not started | **~70%** | **Refute “not started”** — SHA-256 artifacts in Prisma + upload path exist |
| **13 — Self-Healing** | 40% | **~45%** | DMS + Chaos UI confirmed; Agent 12 freeze **split across Ironlock/Ironguard/Irontech** |
| **14 — DEI / Ironethic** | Not started | **~25%** | Simulation salted hashing only; no full DEI ingest pipeline |
| **15 — Checkpoint freeze** | Not started | **~40%** | Postgres LangGraph saver + in-memory Epic 6 paths (not unified) |
| **16 — Ironquery exports** | Not started | **~35%** | Platform PDF/CSV exist; **Agent 15 product surface incomplete** |

---

## ✅ Completed (Forensic foundation)

| Feature | Evidence |
|---------|----------|
| Constitutional hashing (TAS.md SHA-256) | `app/utils/tasFingerprint.ts`, `GET /api/grc/tas-fingerprint` |
| Attestation gate (50+ char justification) | `app/utils/forensicAttestation.ts`, `app/utils/validateJustification.ts` |
| Nuclear / tripartite 3-key override | `app/utils/constitutionalOverrideVerify.ts`, `SecurityPosture.TRIPARTITE_LOCK` |
| Chaos “Constitutional Collapse” UI | `app/config/chaosRegistry.ts`, `app/lib/constitutionalCollapseChaos.ts`, `ChaosMenu.tsx` |
| Dead Man’s Switch (24h) | `app/lib/deadMansSwitch.ts`, `SystemConfig.deadManSwitch` |
| Witness logging (IP + fingerprint) | `app/lib/entryWitness.ts`, `EntryWitness` model |
| BIGINT financial discipline | `prisma/schema.prisma`, `src/services/agents/warden.ts` |
| Integrity hash chain (Bank Vault) | `src/services/integrityService.ts`, `IntegrityEvent` |

---

## ⚠️ In progress (active build)

### Epic 9 — Ironbloom (Agent 18) — **~75%**

| Item | Status | Evidence |
|------|--------|----------|
| TAS sustainability amendment | ✅ | `docs/TAS.md` Kimbot/Ironbloom physical-unit mandate |
| Physical-unit hard block | ✅ | `lib/sustainability/constants.ts` — `validateIronbloomEsgEntry`, `CRITICAL_INGESTION_FAILURE` |
| Gridcore utility polling (NREL / GlobalPetrol) | ✅ | `app/services/ironbloom/rateEngine.ts`, `POST /api/internal/cron/gridcore-rate-poll` |
| Sealed `mitigatedValueCents` (BigInt) | ✅ | `app/services/ironbloom/sealedRateNode.ts`, `SustainabilityMetric.mitigated_value_cents` |
| **Sustainability ALE formula** | ✅ **New** | `app/services/ironbloom/scoring.ts` — `(kWh × CI) × P_offset × R_tax` |
| Electricity Maps live CI | ⚠️ | Wired; requires `ELECTRICITY_MAPS_API_KEY` (dev fallback 385 g/kWh) |
| Kimbot vs Ironbloom UI separation | ⚠️ | Production CSRD vs simulation injector still shared in some pipeline paths |

**Refutation of manifest claim:** Physical-unit rejection and utility polling are **not** “not live” — they are enforced at API (`/api/sustainability/ironbloom`), server actions, and LangGraph node.

### Epic 10 — Orchestration — **~35%**

| Item | Status | Evidence |
|------|--------|----------|
| LangGraph installed | ✅ | `@langchain/langgraph`, `src/services/orchestration/graph.ts` |
| Ironcore router (Agent 1) | ⚠️ **Upgraded** | Routes `SUSTAINABILITY_ESG` → `IRONBLOOM` → `IRONTRUST` |
| Ironbloom graph node | ✅ **New** | `src/services/agents/ironbloom.ts` |
| State BIGINT fields | ✅ **New** | `financial_ale_cents`, `sustainability_ale_cents`, `mitigated_value_cents` on `SovereignGraphState` |
| Ironsight / Ironquery / Irontally nodes | ❌ Stubs | Pass-through placeholders in `graph.ts` |
| End-to-end agent payload bus | ❌ | No production ingest → graph → persist loop for all 19 agents |

**Refutation:** LangGraph **is** initialized; Agent 1 **does** route (including sustainability). BigInt state migration on graph **started**; full Epic 10 completion blocked on specialist implementations.

### Epic 11 — Bank Vault — **~85%** (confirmed)

| Item | Status | Evidence |
|------|--------|----------|
| RBAC | ✅ | `UserRoleAssignment`, `ensureAuditorOrAdminRole` |
| Attestation gate | ✅ | Forensic attestation + void elevated bar |
| Hash chain | ✅ | `integrityService.ts` |
| 3-key override | ✅ | Tripartite downgrade + constitutional override |

### Epic 12 — Evidence Locker — **~70%** (manifest understated)

| Item | Status | Evidence |
|------|--------|----------|
| SHA-256 artifact storage | ✅ | `EvidenceArtifact.sha256`, `app/actions/evidenceActions.ts` |
| Immutable locker UX | ⚠️ | `EvidenceVaultClient.tsx`; local gap ledger coexists |
| Cross-tenant partition guarantees | ✅ | HASH partitions on `AuditLog` / `SimThreatEvent` (GRC Gold migration) |

### Epic 13 — Self-Healing — **~45%**

| Item | Status | Evidence |
|------|--------|----------|
| DMS | ✅ | `deadMansSwitch.ts`, scorch + LWT |
| Chaos UI | ✅ | `chaosActions.ts`, `IrontechChaosDeploy.tsx` |
| Agent 12 state-freeze nodes | ❌ **Not a single module** | Freeze spread: Ironlock (`tasFingerprint`), Irontech checkpoint (`agents/irontech.ts`), Ironguard API guard |

### Epic 14 — DEI / Ironethic — **~25%**

| Item | Status | Evidence |
|------|--------|----------|
| Salted simulation hashing | ⚠️ | `app/utils/simulationSignature.ts` |
| Anonymized benchmarks | ⚠️ | `MarketBenchmarkSnapshot`, `benchmarkActions.ts` |
| No-PII ingest enforcement | ❌ | Policy in TAS only |

### Epic 15 — LangGraph checkpoint freeze — **~40%**

| Item | Status | Evidence |
|------|--------|----------|
| Postgres checkpointer | ⚠️ | `src/services/orchestration/checkpointer.ts` |
| Irontech in-memory checkpoints | ⚠️ | `infrastructure/db.ts`, `agents/irontech.ts` |
| Unified Irontech ↔ Postgres saver | ❌ | Dual stores |

### Epic 16 — Ironquery analyst exports — **~35%**

| Item | Status | Evidence |
|------|--------|----------|
| Platform PDF exports | ✅ | Budget, Irontally readiness, post-mortem PDFs |
| Generic CSV | ⚠️ | `ExportCSVButton.tsx`, audit logs |
| Ironquery-branded analyst pack | ❌ | `app/lib/agents/ironquery.ts` insights only; graph stub |
| RAG + checkpoint reporting | ❌ | TAS-described; not implemented |

---

## ❌ Not started / remaining milestones

1. **Epic 10 completion:** Wire real Ironsight, Ironquery, Irontally nodes; production orchestration ingress.
2. **Epic 14:** Full Ironethic DEI salted pipeline with aggregation-before-persist.
3. **Epic 15:** Single checkpoint authority (Postgres saver) for Irontech freeze/resume.
4. **Epic 16:** Ironquery-dedicated PDF/CSV export templates + RAG.
5. **Agent 12 clarity:** Document and implement one “state-freeze” contract (TAS Agent 12 vs Ironguard vs Ironlock).

---

## Sustainability ALE (Agent 18) — implementation reference

**Formula:**

```
ALE_carbon = (Units_kWh × CI_gCO2) × P_offset × R_tax
```

| Term | Source |
|------|--------|
| `Units_kWh` | Mandatory ingest field / threat-derived kWh |
| `CI_gCO2` | Electricity Maps API (`ELECTRICITY_MAPS_API_KEY`) |
| `P_offset` | `CARBON_OFFSET_PRICE_USD_PER_TON` (default $90/t) |
| `R_tax` | `app/config/tenantCarbonZones.ts` per tenant |

**Persistence:** `mitigatedValueCents` BigInt on `SustainabilityMetric`; graph state `mitigated_value_cents` string for orchestration.

**Tenant ALE mapping:** Carbon cents vs `TENANT_INDUSTRY_BASELINE_ALE_CENTS` (e.g. Medshield **$11.1M** = `1110000000` cents) as `carbonShareOfTenantAleBps`.

---

## Recommended next sprints

| Sprint | Focus |
|--------|--------|
| **9.2** | Live Electricity Maps key in staging; CFO dashboard carbon ALE line |
| **10.2** | ✅ Ironcore → Ironbloom → Irontrust chain (started); complete Irongate loop |
| **10.3** | Replace pass-through nodes with real agent handlers |
| **12.1** | Evidence locker immutability audit + external object-lock |
| **16.1** | Ironquery export templates |

---

*Generated by Gap-to-Epic audit. Re-run after each epic merge; do not treat manifest percentages as authoritative without file evidence.*
