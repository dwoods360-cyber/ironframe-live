# Ironframe Master Testing Protocol

**Location:** `/docs/testing.md`  
**Status:** CONSTITUTIONALLY LOCKED

**Governance:** All structural changes (🔴) REQUIRE 100% pass rate on this suite prior to merge.

---

## 1. Multi-Tenant Isolation (The Warden's Gate)

All database access is assumed hostile until proven secure.

### 🔒 RLS Hostility Tests

- **Cross-Tenant Read Failure:** A test must attempt to query tenant_b data using a tenant_a session; the query MUST return an empty set or a 403.
- **Cross-Tenant Write Failure:** A test must attempt to update or delete a record owned by another tenant_id; the DB must reject the transaction.
- **Direct Prisma Scoping:** Every Prisma query in the codebase must be audited for explicit `.where({ tenant_id })` filtering.

---

## 2. Mathematical Integrity (Irontrust & Ironbloom)

Floating point types are forbidden for financial and carbon metrics.

### 🧮 ALE Baseline Verification

- **Medshield 11.1M:** Unit test must verify that total calculated risk matches exactly against the 11.1M threshold with zero variance.
- **Vaultbank 5.9M:** Unit test must verify that risk bucket triggers fire at exactly the 5.9M mark.
- **Gridcore 4.7M:** Unit test must verify the sensitivity dial behavior against the 4.7M baseline.
- **Snapshot Comparison:** Every ALE recalculation must be compared against a stored "Golden Snapshot" to detect unintended logic drift.

---

## 3. Agent Execution & Ingestion (The DMZ Guard)

No external data enters the core without passing through Irongate (Agent 14).

### 🛡️ Irongate Sanitization Tests

- **Bypass Prevention:** An E2E test must attempt to upload a file directly to the Ironscribe (Agent 5) processing queue; the system must block the request.
- **Decontamination Mocking:** Unit tests must verify that macros, XSS strings, and prompt injections are successfully stripped into pure text.
- **Quarantine DB Verification:** Ensure that failed ingestions are moved to the Quarantine schema and an alert is signaled to Irontech (Agent 11).

---

## 4. Operational Resilience (LangGraph State)

State memory is persistent and immutable for self-healing observability.

### 🔄 State Recovery Tests

- **Self-Healing Loop:** Manually crash a mock Ironcore (Agent 1) node and verify that Irontech (Agent 11) restarts the worker from the last persistent checkpoint.
- **Failed_Jobs Audit:** Verify that crashed tasks are logged in the Failed_Jobs table with a full LangSmith trace for debugging.
- **Ironscout TTL Enforcement:** Verify that the Ironscout_Tasks auto-terminates and flushes memory the exact millisecond the timer hits zero.

---

## 5. Deployment Readiness (The CI Check)

Playwright is the final authority for UI and E2E integrity.

- **Coverage Threshold:** Global coverage must remain ≥ 85% for all core logic modules.
- **Hydration Audit:** Playwright tests must check for Next.js hydration mismatches on the Ironquery (Agent 15) interface.
- **GCP Readiness:** The Sentinel Sweep GitHub Action must confirm successful build, lint, and test pass before allowing a push to Google Cloud.
