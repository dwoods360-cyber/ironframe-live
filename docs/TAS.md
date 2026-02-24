\# TECHNICAL ARCHITECTURE SPECIFICATION (TAS)

Ironframe Multi-Tenant GRC SaaS Platform

Version: 1.1 (Authoritative)

Status: Constitutional Architecture Document



\## 1. ARCHITECTURAL AUTHORITY STATEMENT

This document is the single authoritative architectural specification for this SaaS platform.

All structural changes must comply with this specification.

Any deviation requires:

1\. A documented TAS Amendment Proposal.

2\. Explicit approval before implementation.

3\. Version increment of this document.

No architectural drift is permitted.



\## 2. CORE SYSTEM IDENTITY

\*\*System Type:\*\* Multi-tenant, AI-orchestrated, compliance-focused SaaS platform.

\*\*Domain:\*\* Enterprise GRC (Governance, Risk, Compliance) \& TPRM (Third-Party Risk Management).

\*\*Differentiator:\*\* Ironframe Autonomous 16-Agent Workforce integrated via LangGraph.js.



\## 3. PRIMARY ARCHITECTURAL PRINCIPLES

\### 3.1 Multi-Tenant Isolation (Non-Negotiable)

\* Every SaaS client is a strict Tenant represented by the `Company` model (The 1st Party).

\* All scoped tables MUST include `company\_id` to enforce the absolute boundary.

\* Sub-entities like `Vendors` (3rd/4th Parties) are strictly bound to their parent `Company`.

\* No cross-tenant queries permitted. MedShield data must never bleed into VaultBank.

\* Violation = Critical Security Failure.



\### 3.2 Zero-Trust Data Ingestion

\* All external data must pass through \*\*Irongate (Agent 14)\*\*.

\* Mandatory controls: Malware scanning, macro stripping, payload flattening to pure text.

\* No agent may ingest raw external payloads directly from the UI.

\* All uploads must route to the Level 2 Air-Gap (DMZ Database) first.



\### 3.3 Modular Agent Enforcement

\* Ironframe agents operate under strict Core Directives.

\* Agents may NOT expand beyond defined responsibility or cross tenant boundaries.

\* LangGraph state must be tenant-scoped.



\### 3.4 Persistent Graph Memory

\* All LangGraph executions must persist state.

\* Execution traces must be replayable via LangSmith.

\* No ephemeral decision state allowed for scoring logic.



\### 3.5 Human-in-the-Loop Governance

\* The following require an approval workflow: ALE threshold changes, Tenant lock release, Policy rule mutation.

\* Default behavior if ignored: Maintain current baseline.



\## 4. SYSTEM LAYERS

\### 4.1 Presentation Layer

\* \*\*Technology:\*\* Next.js 15 App Router (Server Components mandated for Core data).

\* \*\*Must Support:\*\* Tenant-aware UI rendering (RBAC workspace switching), real-time telemetry, supply chain graphing.



\### 4.2 Application Layer

\* \*\*Technology:\*\* Node.js Server Actions, Vercel AI SDK, LangGraph.js.

\* \*\*Responsibilities:\*\* Authentication (RBAC), Sentinel Sweep orchestration, Agent execution routing.



\### 4.3 Ironframe Autonomous Layer (The 16 Agents)

1\. \*\*Ironcore\*\* (Routing)

2\. \*\*Ironwave\*\* (Telemetry)

3\. \*\*Irontrust\*\* (Scoring)

4\. \*\*Ironsight\*\* (High-Fidelity Scanning - Targets Active Risks)

5\. \*\*Ironscribe\*\* (Doc parsing)

6\. \*\*Ironlock\*\* (Emergency override)

7\. \*\*Ironcast\*\* (Notification)

8\. \*\*Coreintel / Ironintel\*\* (Policy/OSINT monitor)

9\. \*\*Ironlogic\*\* (Policy learner)

10\. \*\*Ironmap\*\* (Supply chain - Maps 3rd/4th Party Vendor hierarchies)

11\. \*\*Irontech\*\* (Self-healing)

12\. \*\*Ironguard\*\* (AppSec)

13\. \*\*Ironwatch\*\* (Anomaly detection)

14\. \*\*Irongate\*\* (The Warden - DMZ Sanitizer)

15\. \*\*Ironquery\*\* (Copilot)

16\. \*\*Ironscout\*\* (TTL tracker)



\### 4.4 Data Layer (Dual-Node Architecture)

\*\*Node 1: Core Vault (Primary Database)\*\*

\* \*\*Client:\*\* `@prisma/client`

\* \*\*Mandatory Tables:\*\*

&nbsp; \* `Companies` (The 1st Party / Absolute SaaS Tenant Boundary)

&nbsp; \* `Vendors` (3rd/4th Parties / The TPRM Supply Chain)

&nbsp; \* `Departments` (Internal divisions)

&nbsp; \* `Policies` (Agent 8 Targets)

&nbsp; \* `Active\_Risks` (Agent 4 Targets)

&nbsp; \* `Users` (RBAC mapping to Companies)



\*\*Node 2: The DMZ (Isolated Air-Gap Database)\*\*

\* \*\*Client:\*\* `@prisma/client-dmz`

\* \*\*Mandatory Tables:\*\*

&nbsp; \* `QuarantineRecord` (Strict entry point for Irongate)

&nbsp; \* `AgentLog` (Immutable telemetry)



\## 5. SECURITY BOUNDARIES

\* \*\*5.1 Tenant Isolation:\*\* Enforced via Application Logic (RBAC) and Database relations (`company\_id`).

\* \*\*5.2 Agent Isolation:\*\* Ironwatch monitors directive violations.

\* \*\*5.3 Perimeter Enforcement:\*\* Ironguard enforces token rotation and context validation.



\## 6. NON-NEGOTIABLE RULES

1\. No cross-tenant data access.

2\. No external ingestion bypassing Irongate (DMZ).

3\. No scoring without persistence.

4\. No architectural refactor without TAS compliance validation.

5\. No silent structural changes.



\## 7. TAS AMENDMENT PROCESS

To modify architecture:

1\. Submit Amendment Proposal.

2\. Identify affected sections.

3\. Provide migration plan and rollback strategy.

4\. Approve.

5\. Version increment.



END OF TAS

