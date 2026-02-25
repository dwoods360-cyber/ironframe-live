# `/docs/competitive-landscape.md` — Competitive Landscape & Build Mandate

**Project:** Ironframe  
**Version:** 2.0.0 (Sovereign Build State)  
**Last Updated:** 2026-02-25  
**Authority:** Product Owner (Layer 3)

## 1. Market Gaps & Legacy Failures
The current GRC and Risk Management market is dominated by legacy platforms that rely on qualitative guesswork, manual data entry, and brittle, monolithic architectures. Competitors fail in three critical areas:
1.  **Financial Opacity:** Relying on heatmaps (Red/Yellow/Green) instead of defensible, quantitative financial risk (Annualized Loss Expectancy).
2.  **Perimeter Vulnerability:** Direct API ingestion without a dedicated sanitization DMZ, leading to poisoned data lakes.
3.  **Black-Box AI:** Slapping LLM wrappers on legacy databases without persistent state memory, resulting in hallucinations and zero human-in-the-loop observability.

## 2. Ironframe's Differentiated Position
Ironframe attacks these market gaps through a CONTROL-FIRST paradigm, powered by a specialized, 19-Agent Autonomous Workforce. Each agent is strictly mapped to solve a specific legacy failure:

### Orchestration & Resilience (The LangGraph Advantage)
Legacy systems crash and lose context. Ironframe maintains persistent state memory.
*   **Ironcore (Agent 1):** Orchestrator & Routing. Eliminates monolithic bottlenecks by dynamically routing tasks.
*   **Irontech (Agent 11):** Self-Healing. Solves brittle pipelines by restarting failed workers from the exact last persistent checkpoint.
*   **Ironlock (Agent 6):** Priority Override. Provides immediate, automated lockdown capabilities during critical anomalies.

### Zero-Trust Ingestion & Security (The DMZ)
Legacy systems trust authenticated payloads. Ironframe trusts nothing.
*   **Irongate (Agent 14):** Data Sanitizer. The absolute perimeter DMZ. Solves poisoned data lakes by sanitizing ALL external ingestion before internal routing.
*   **Ironguard (Agent 12):** The Warden. Solves secret leakage via continuous AppSec, token rotation, and context validation.
*   **Ironwatch (Agent 13):** Anomaly Hunter. Solves insider threats via internal UBA and strict Directive Violation monitoring.

### Risk & Financial Quantification (The BIGINT Mandate)
Legacy systems use heatmaps. Ironframe uses defensible math.
*   **Irontrust (Agent 3):** Scoring Engine. Solves qualitative guesswork by executing constitutionally frozen ALE Math (Medshield 11.1M, Vaultbank 5.9M, Gridcore 4.7M) using strict BIGINT cents.
*   **Ironsight (Agent 4):** Tactical Sentinel. Provides high-fidelity active risk scanning.
*   **Ironwave (Agent 2):** Live Telemetry Monitoring. Ingests real-time system health to inform dynamic risk scoring.

### Data Processing & Threat Intelligence
Legacy systems require manual data entry. Ironframe automates ingestion and OSINT.
*   **Ironscribe (Agent 5):** Deep-Doc Worker. Solves manual parsing via advanced OCR and unstructured data extraction.
*   **Ironintel (Agent 8):** OSINT & Policy Monitor. Solves stale threat feeds by continuously scraping external intelligence.
*   **Ironscout (Agent 16):** Ad-Hoc Tracker. Solves resource bloat via self-terminating (TTL: 0.50–71.75 hrs) ephemeral reconnaissance.

### Supply Chain & Policy Optimization
Legacy systems lack N-th party visibility. Ironframe graphs the entire chain.
*   **Ironmap (Agent 10):** Supply Chain Graphing. Solves 3rd/4th party opacity by mapping vendor hierarchies and cascading risk.
*   **Ironlogic (Agent 9):** Neural Policy Learner. Solves static governance by analyzing historical decisions to propose internal policy optimizations.

### ESG, Social, & Compliance Mapping
Legacy systems treat ESG as an afterthought. Ironframe enforces strict data integrity.
*   **Ironbloom (Agent 17):** Sustainability Analyst. Solves greenwashing by strictly requiring physical units (kWh, Liters) for Scope 1-3 Carbon ALE, rejecting monetary-only proxies.
*   **Ironethic (Agent 18):** Social & DEI Monitor. Solves PII liability via a strict No-PII Lock, ensuring all social data is aggregated and salted.
*   **Irontally (Agent 19):** Disclosure & Framework Mapper. Solves manual compliance fatigue by automatically cross-walking data against CSRD, GRI, and ISSB frameworks.

### User Interaction & Alerting
Legacy systems cause alert fatigue. Ironframe provides conversational, contextual insights.
*   **Ironquery (Agent 15):** Interactive Analyst. Solves black-box AI via Conversational RAG and on-demand reporting tied directly to immutable state checkpoints.
*   **Ironcast (Agent 7):** Switchboard. Solves alert fatigue by intelligently managing outbound notifications and human-in-the-loop escalation.
