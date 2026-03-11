# Ironframe Phase 1: Master QA & GRC Test Matrix

## 1. Automated Pre-Push Gate (Run These First)
| Action | Command | Expected Result |
| :--- | :--- | :--- |
| **GRC Math Check** | `npx vitest tests/unit/grcGate.test.ts` | 3 Passed (Validates $10M logic). |
| **Deterministic UI** | `npx playwright test tests/e2e/dashboard.spec.ts` | 1+ Passed (Validates UI matches DB state). |
| **Batched Latency** | `npx vitest run tests/perf/dashboard-latency.test.ts` | p95 < 100ms (in production) or successfully completes 50 iterations locally without 5s timeout. |
| **Build Check** | `npm run build` | Zero routing or type errors before final merge. |

---

## 2. Core Actions & Commands
| Action | Command/Target | Expected Result | Dependency |
| :--- | :--- | :--- | :--- |
| **Initialize CLI** | Type `kimbot` | Terminal logs "START"; Agents pulse green; Red alerts appear. | `useAgentStore` |
| **Scale Test** | Type `grcbot 100` | Liability jumps; Terminal logs mass company ingestion. | `useRiskStore` |
| **Industry Pivot** | Change Industry Profile | Alerts, Metrics, and Reports switch to new industry data. | `useRiskStore` |
| **High-Value Gate** | Ingest $10M+ Alert | Red pulsing UI; "Ingest" chip disabled until 50+ chars typed. | `PipelineThreatCard` |
| **Stakeholder Alert** | Click "Confirm Threat" | Terminal logs dispatch to blackwoodscoffee@gmail.com. | `threatActions.ts` |
| **Manual Audit** | Register Manual Risk | New entry appears at top of Audit Intelligence sidebar. | `useAuditLoggerStore` |
| **Visual Risk** | Open Heat Map | Verify bubbles plot at $Likelihood \times Impact$ with "ghost" trails. | `useRiskStore` |
| **System Stop** | Type `kimbotx` & `grcbotx` | Simulation stops; Agents return to "Healthy" standby. | `kimbotEngine.ts` |
| **Data Purge** | Type `purg` | Database wipes all simulation data; UI returns to "Clean." | `purgeSimulation.ts` |

---

## 3. UI Element Validations
| Category | Element | Action | Expected UI Response |
| :--- | :--- | :--- | :--- |
| **Top Nav** | Tenant Switcher | Click Drop-down | Lists: Global, Medshield, Vaultbank, Gridcore. |
| **Top Nav** | Nav Chips | Click 'Audit Trail' | Seamless route change to `/audit-trail`. |
| **Sidebar (L)** | Industry Profile | Click 'Healthcare' | Pulse animation; Metrics & Alerts update to Medical. |
| **Sidebar (L)** | Sentinel Sweep | Click Button | Button spins; Terminal logs: `> [AGENT] Sweep Initialized`. |
| **Banners** | Contact Support | Click Link | Opens support portal or mail client. |
| **Pipeline** | Agent Stream Card | Click 'X' (Dismiss) | Modal opens asking for justification. |
| **Pipeline** | Ingest Chip | Click 'Ingest' | Moves card to Registration; Disables if note < 50 chars. |
| **Active Risks** | Add Note | Click Button | Expands text area for GRC work notes. |
| **Sidebar (R)** | Log Entry | Click Timestamp | Expands log details or filters view to that event. |
| **Footer** | Purge Button | Click 'PURGE' | Confirmation dialog appears; Terminal logs WIPE. |

---

## 4. GRC, Security & Integrity Matrix
| Category | Test Case Name | Procedure / Step-by-Step | Expected Result (Success Criteria) | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **DB** | **Root-Level Cascade Purge** | Run Purge, check UI for Liability Exposure. | UI must show $0.0. Absolutely zero "Ghost Data" remains. | **CRITICAL** |
| **QA** | **Deterministic UI Sync** | Load empty dashboard, run `grcbot 1`. | "0 REQUIRES TRIAGE" when empty. "Assess Risk" appears instantly when populated. | **CRITICAL** |
| **Security** | **Horizontal Escalation** | Try to access Tenant B UUID while logged as Tenant A. | 403 Forbidden. Cross-tenant ID access is blocked. | **CRITICAL** |
| **Security** | **Audit Immutability** | Attempt to delete a specific row in the `auditLog` via console. | Persistence. Audit logs are append-only; no delete allowed. | **CRITICAL** |
| **GRC** | **Multi-Tenant Isolation** | Ingest $10M risk for "Tenant A," switch to "Tenant B." | Tenant B shows $0 Current Risk; no Tenant A data visible. | **CRITICAL** |
| **GRC** | **Audit Non-Repudiation** | Perform "Acknowledge" and check JSON metadata. | Log includes Timestamp, User ID, and Supply Chain Score. | High |
| **GRC** | **ALE Math Validation** | Sum 5 cards in "Active Risks" vs. Sidebar Gauge. | Sidebar Current Risk matches the sum of active cards exactly. | High |
| **DB** | **PDF Sync Accuracy** | Generate PDF report immediately after 10 triage actions. | Total Historical Logs in PDF matches sidebar count exactly. | High |
| **Security** | **PHI/PII Masking** | View a record containing sensitive patient data or SSNs. | Automatic masking (e.g., \*\*\*-\*\*-1234) in UI and PDF. | High |
| **Security** | **Malicious Command** | Attempt to inject a script into the GRCBOT terminal. | Sanitization. System ignores or rejects non-command inputs. | High |
| **Security** | **PDF Hash Integrity** | Export PDF, attempt to edit the "Current Risk" text. | Tamper-Evident. The internal PDF signature breaks. | High |
| **QA** | **Purge Scope Integrity** | Inject Manual Risk + Simulation, then run `purg`. | Simulation cards deleted; Manual Risk remains. | High |
| **QA** | **UI/DB Reconciliation** | Purge DB while the browser tab is open. | UI automatically removes cards within 5 seconds without refresh. | High |
| **QA** | **"grcbot 50" Stress Test** | Run `grcbot 50` and scroll Regulatory Banner. | Banner rotates 50 alerts without lag; sidebar handles 100+ logs. | Medium |
| **UX** | **Expert Mode Persistence** | Set Expert Mode OFF, refresh browser, change tabs. | UI stays in "Novice" mode; no revert to ALE math. | Medium |
| **UX** | **Ingestion Persistence** | Toggle Expert Mode ON/OFF and refresh. | Ingestion Stream section remains visible in both states. | Medium |
