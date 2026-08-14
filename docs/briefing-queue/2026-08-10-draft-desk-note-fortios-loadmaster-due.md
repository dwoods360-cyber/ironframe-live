---
title: "Desk Note — FortiOS and LoadMaster KEV due clocks land (10 August 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-08-10"
summary: "10 August 2026 is the commonly cited federal remediation due date for Fortinet FortiOS CVE-2025-68686 (KEV-added 27 July) and Progress LoadMaster CVE-2026-8037 (KEV-added 7 August). The governance question this week is validated closure—patch evidence plus exposure and triage decisions—not calendar expiry alone."
classification: "Institutional Governance"
author: "Ironframe Governance Frame"
tenantId: "00000000-0000-0000-0000-000000000000"
tenantSlug: "ironframe-sandbox"
activeExposureCents: "0"
requiresImmediatePromotion: false
---

> **Signal (10 August 2026):** Two active KEV clocks converge: **CVE-2025-68686** (FortiOS, added 27 July) and **CVE-2026-8037** (Progress LoadMaster command injection, added 7 August). Public KEV mirrors list **10 August 2026** as the action due date for both.
>
> *A due date is a control trigger. It is not proof residual risk is zero.*

## What moved

Early August already forced N-central incomplete-fix, TeamCity, Langflow/Tomcat, BOD 26-04 policy, and LoadMaster listing work. Today’s date is the closure test: can the operator produce inventory, patch evidence, internet-exposure classification, and—where BOD 26-04 logic applies—pre-patch compromise assessment decisions for FortiOS and LoadMaster?

Private-sector entities are not automatically bound by FCEB deadlines. Boards still ask the same question after an incident: why was a confirmed-exploited edge flaw still open past the federal clock?

## Governance implication (one test)

1. Produce FortiOS and LoadMaster inventories with exposure class (internet / internal / retired).  
2. Attach patch evidence or an authorized exception with compensating controls.  
3. Record who decided whether forensic triage was required for internet-exposed instances.

## V. Sources & Citations

1. CISA — LoadMaster KEV alert (7 August 2026): https://www.cisa.gov/news-events/alerts/2026/08/07/cisa-adds-one-known-exploited-vulnerability-catalog  
2. CISA — Arista/Fortinet KEV alert (27 July 2026): https://www.cisa.gov/news-events/alerts/2026/07/27/cisa-adds-two-known-exploited-vulnerabilities-catalog  
3. CISA — BOD 26-04: https://www.cisa.gov/news-events/directives/bod-26-04-prioritizing-security-updates-based-risk
