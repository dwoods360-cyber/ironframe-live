# 🗺️ General Availability (GA) Open Roadmap

## 🚨 P0: Security, Core Operations, & Boundary Hardening (Release-Blocking)

### 🔑 Epic 11 — Production PKI + Vault CI Gates
* **Owner:** Principal Security & AppSec Engineer
* **ETA:** 2026-05-27
* **Actions:**
  - Provision `PUBLIC_KEY_*` / PEM in staging and production environment settings.
  - Mandate vault integration runs inside the GitHub Actions pipeline on every PR.
* **Acceptance Criteria:** - [ ] Environment keys present in Vercel secrets.
  - [ ] Vault tests (`bank-vault-success.test.ts`, `bank-vault-rejection.test.ts`) are green and designated as "Required" to merge.

### ⚙️ Epic 13 — Operational Cron Activation
* **Owner:** DevOps & Infrastructure Architect
* **ETA:** 2026-05-28
* **Actions:**
  - Add missing `GET` handlers to scheduled cron endpoints to avoid Vercel 405 routing dropouts.
  - Formally register and schedule target operations inside `vercel.json`.
* **Acceptance Criteria:**
  - [ ] Background crons complete execution without 401/405 authentication or routing failures.
  - [ ] `epic13-telemetry-triage` tracking behavior is durably verified inside the production logs.

### 🍃 Epic 9/5 — Production Sustainability Inputs
* **Owner:** Data Integration Engineer (Ironbloom Core)
* **ETA:** 2026-05-29
* **Actions:**
  - Inject the live production `ELECTRICITY_MAPS_API_KEY` into staging and prod containers.
  - Verify carbon intensity computation pathways bypass mock fallbacks.
* **Acceptance Criteria:**
  - [ ] Live carbon payload data streams directly into pure, unmutated BigInt physical unit output metrics.

---

## ⚡ P1: Orchestration, Immutability, & Checkpoint Reliability (Next Sprint)

### 🤖 Epic 10 — 19-Agent Orchestration Completion
* **Owner:** AI Systems Lead / Core Orchestrator Architect
* **ETA:** 2026-06-03
* **Actions:**
  - Expand active specialized slots toward the complete 19-agent roster.
  - Refactor secondary threat ingress paths to interact directly with the main message bus.
* **Acceptance Criteria:**
  - [ ] Running `npx vitest run tests/unit/sovereignOrchestrationBus.test.ts` yields a 100% passing matrix.

### 🔒 Epic 12 — Evidence Immutability Hardening (WORM)
* **Owner:** Database Architect / Compliance Specialist
* **ETA:** 2026-06-05
* **Actions:**
  - Configure strict object-lock / Write-Once-Read-Many (WORM) storage bucket policies.
  - Implement a hard code block to drop manual shredding actions once a signed attestation is applied.
* **Acceptance Criteria:**
  - [ ] Integration test suite proves absolute data persistence and drops database deletions under active attestation.

### 💾 Epic 15 — Checkpoint Reliability Hardening
* **Owner:** Principal Software Engineer
* **ETA:** 2026-06-08
* **Actions:**
  - Finalize and publish complete lifecycle checkpoint pool runtime playbooks.
  - Enforce explicit CI database environment URL connection locks.
* **Acceptance Criteria:**
  - [ ] Forensic rollback tests (`tests/integration/epic15-forensic-rollback.test.ts`) run and pass automatically on every PR check.

---

## 📋 P2: Enterprise Features & Reporting Analytics (Product Polish)

### 📊 Epic 16 — Ironquery Analyst Pack Exports
* **Owner:** UX/UI Developer / Analyst Interface Owner
* **ETA:** 2026-06-12
* **Acceptance Criteria:**
  - [ ] Branded PDF/CSV compliance document export paths render clean, asset-mapped tables tracking unmutated BigInt values.

### ⚖️ Epic 14 — DEI / Ironethic Salted Pipeline
* **Owner:** GRC/Compliance Lead
* **ETA:** 2026-06-16
* **Acceptance Criteria:**
  - [ ] Cryptographic SHA-256 salting gates scrub all incoming PII before rows reach persistent storage layers.

---

## 🏁 Gatekeeper Verification Suite (Required Before Merging)
```bash
npx tsc --noEmit
npx vitest run tests/integration
npx playwright test tests/e2e/dashboard.spec.ts
```
