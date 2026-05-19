# Build Delta Report (Git-Verified)

**Generated:** 2026-05-15  
**Method:** `git log --oneline -n 100` + repository file inspection  
**Scope:** Epic 9, 10, 11, 13 manifest claims

---

## [VERIFIED]

### Epic 11 — Bank Vault (~85%)

| Claim | Git / file evidence |
|-------|---------------------|
| `resolutionApprovalId` in Prisma | `8b0b80c` feat(schema): Epic 11 governance substrate; `prisma/schema.prisma` `ThreatEvent.resolutionApprovalId` → `ThreatApproval` |
| HITL resolution pipeline | `d21ad62` two-stage HITL; `c35170c` resolution attestation modal |
| RBAC (tenant-scoped roles) | `8b0b80c` `UserRoleAssignment`; `app/actions/auditActions.ts` `ensureAuditorOrAdminRole`; `app/actions/threatActions.ts` approver roles |
| API tenant guards | `app/lib/security/ironguardApiGuard.ts` used by `app/api/dashboard/route.ts`, `app/api/chaos/trigger/route.ts` |
| Tripartite / emergency seal in DB | `SystemConfig.securityPosture` enum `TRIPARTITE_LOCK`; `SystemConfig.emergencySeal` JSON (`app/lib/emergencySeal.ts`) |
| Integrity hash chain | `6172a7d` IntegrityEvent; `src/services/integrityService.ts` |
| Integration tests | `tests/integration/bank-vault-rejection.test.ts` |

**Note:** Literal column name `TRIPARTITE_EMERGENCY_SEAL` does **not** exist; tripartite data lives in `security_posture` + `emergency_seal` JSON — functionally equivalent.

### Epic 13 — Self-Healing (~40–45%)

| Claim | Git / file evidence |
|-------|---------------------|
| Dead Man's Switch 24h TTL | `app/lib/deadMansSwitch.ts` — `DEAD_MAN_SWITCH_TTL_MS_DEFAULT`, `SystemConfig.deadManSwitch` JSON |
| Scorched Earth wipe | `app/lib/scorchProtocol.ts` `performHardWipe`; invoked from DMS (`deadMansSwitch.ts`) |
| Chaos UI | `105eddb`, `e79ea77` chaos lifecycle; `app/components/ChaosDashboard/`, `app/actions/chaosActions.ts` |
| Constitutional collapse | `app/lib/constitutionalCollapseChaos.ts` |

### Epic 10 — Orchestration (~35%, above manifest 20%)

| Claim | Git / file evidence |
|-------|---------------------|
| LangGraph in package.json | `@langchain/langgraph` ^1.1.5, `@langchain/langgraph-checkpoint-postgres` |
| Graph + nodes | `1b8b5b1` orchestration init; `src/services/orchestration/graph.ts` |
| Agent 1 Ironcore routing | `src/services/agents/ironcore.ts` — FINANCIAL_AUDIT, DOCUMENT_ANALYSIS, **SUSTAINABILITY_ESG → IRONBLOOM** |
| Agent nodes (not under `/app/services/agents`) | `src/services/agents/` — ironcore, irontrust, ironbloom, ironscribe, warden |
| Postgres checkpointer | `src/services/orchestration/checkpointer.ts` |
| BIGINT state fields | `src/services/orchestration/state.ts` — `mitigated_value_cents`, `financial_ale_cents`, `sustainability_ale_cents` |
| Epic 6 state machine | `5697029` verified persistence |

### Epic 9 — Ironbloom (in progress → ~80%)

| Claim | Git / file evidence |
|-------|---------------------|
| TAS / Epic 5 sustainability | `36c4382` feat: epic 5 ironbloom sustainability layer |
| Physical-unit API (422) | `d69627c` Ironbloom strict physical-unit API |
| Physical-unit guards | `lib/sustainability/constants.ts` — `validateIronbloomEsgEntry`, `assertEsgPhysicalIngestion` |
| **400 PHYSICAL_UNIT_REQUIRED** | `app/api/sustainability/ironbloom/route.ts` — monetary without kWh/L/km |
| Gridcore rate engine | `app/services/ironbloom/rateEngine.ts`, cron `gridcore-rate-poll` |
| Sustainability ALE scoring | `app/services/ironbloom/scoring.ts` — Electricity Maps + BigInt formula |
| `mitigatedValueCents` BIGINT | `SustainabilityMetric`, `ThreatEvent`, `RiskEvent` + migrations `20260515120000`, `20260515180000` |
| Sealed rate node | `app/services/ironbloom/sealedRateNode.ts` |
| Unit tests | `tests/unit/ironbloomScoring.test.ts`, `ironbloomRateEngine.test.ts` |

### Forensic foundation (cross-epic)

| Feature | Commits / paths |
|---------|-----------------|
| Constitutional hashing | `707476a` manifest generator; `app/utils/tasFingerprint.ts` |
| Attestation / justification | `validateJustification.ts`, `forensicAttestation.ts` |
| BIGINT financials | `68e4e89`, `c442fa7` irontrust live bigint |
| GRC Gold partition | `d69627c` HASH-partitioned AuditLog / SimThreatEvent |

---

## [REFUTED]

| Manifest claim | Actual state |
|----------------|--------------|
| Epic 9: physical-unit rejection **not** hard-blocked | **Refuted** — enforced at API (400/422), actions, LangGraph node; commit `d69627c` |
| Epic 9: Gridcore polling **not** yielding live BigInt | **Refuted** — `mitigatedValueCents` on `SustainabilityMetric` + `ThreatEvent`; sealed node + scoring |
| Epic 10: LangGraph **not** initialized | **Refuted** — since `1b8b5b1`; package + compiled graph exist |
| Epic 10: Agent 1 routing **not** finished | **Partially refuted** — routing exists; specialist nodes Ironsight/Ironquery/Irontally still stubs |
| Epic 10: BigInt migration **not** finished | **Partially refuted** — Prisma + Warden + graph state; JSON metadata in `BotAuditLog` still used for audit narrative |
| Epic 11: RBAC only in middleware under `/app/api` | **Refuted as stated** — RBAC is primarily server actions + `ironguardApiGuard`, not a global API middleware file |
| Epic 11: `TRIPARTITE_EMERGENCY_SEAL` DB column | **Refuted** — uses `security_posture` enum + `emergency_seal` JSON |
| Epic 13: Agent 12 state-freeze nodes **active** | **Refuted as single module** — freeze split across Ironlock, Irontech checkpoint, Ironguard guard |
| Orchestration agents in `/app/services/agents` | **Refuted** — agents live under `src/services/agents/` |

---

## [GAP]

| Item | Required for GA |
|------|-----------------|
| Live `ELECTRICITY_MAPS_API_KEY` in all environments | Staging/prod keys + monitoring |
| Ironquery / Ironsight / Irontally real graph nodes | Replace pass-through stubs in `graph.ts` |
| Unified LangGraph checkpoint (Postgres only) | Merge in-memory Epic 6 store with `PostgresSaver` |
| Ironethic DEI No-PII ingest pipeline | Beyond simulation salted hashing |
| Ironquery branded analyst PDF/CSV export pack | Epic 16 product surface |
| Evidence locker external immutability (WORM/object lock) | Epic 12 hardening |
| `recordSustainabilityImpact` → `RiskEvent` shadow plane sync | Parity for simulation mode |
| Cron registration for `gridcore-rate-poll` in Vercel/pg_cron | Operational scheduling |

---

## Sustainability ALE (this sprint)

```
ALE_carbon = (Units_kWh × CI_gCO2) × P_offset × R_tax
```

| Parameter | Implementation |
|-----------|----------------|
| `CI_gCO2` | `GET api.electricitymaps.com/v3/carbon-intensity/latest?zone=…` |
| `P_offset` | Default **10000** cents/metric ton ($100.00); `CARBON_OFFSET_PRICE_USD_PER_TON` override |
| `R_tax` | `TENANT_REGULATORY_CARBON_MULTIPLIER_BPS` per tenant |
| Output | `mitigatedValueCents` **bigint** on `SustainabilityMetric`, `ThreatEvent`, `RiskEvent` |

**Migration:** `prisma/migrations/20260515180000_ale_mitigated_value_bigint/migration.sql`

---

## Key commits (last 100)

| Commit | Summary |
|--------|---------|
| `e79ea77` | Shadow plane + Irontech chaos cards |
| `d69627c` | GRC Gold: partitions, CISO attestation, Ironbloom 422 API |
| `ea51ec2` | Epic 11, risk intensity, insurance ROI |
| `8b0b80c` | Epic 11 schema: RBAC, HITL, evidence |
| `36c4382` | Epic 5 Ironbloom sustainability + CSRD |
| `1b8b5b1` | LangGraph state, Agent 1 routing, checkpointer |
| `5697029` | Epic 6 state machine + persistence |

---

*Re-run after merge: `git log --oneline -n 20` and diff `app/services/ironbloom/`.*
