---
title: "Desk Note — IBM Langflow and Apache Tomcat enter CISA KEV (early August 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-08-05"
summary: "In the early-August 2026 KEV wave, CISA listed actively exploited flaws in IBM Langflow (CVE-2026-9198) and Apache Tomcat clustering (CVE-2026-34486), with short federal remediation pressure commonly cited around 7 August 2026. Langflow puts AI-orchestration tooling on the exploit map; Tomcat clustering exposure remains a classic internet-facing serialization risk—even when adjacent AI-campaign reporting is noisier than the specific exploit path."
classification: "Institutional Governance"
author: "Ironframe Governance Frame"
---

> **Signal (early August 2026):** CISA’s KEV additions included **IBM Langflow** and **Apache Tomcat** vulnerabilities with confirmed exploitation. Practitioner weeklies for the week ending 9 August also stress: patch to current supported lines (not only the minimum fixed version), and treat internet-reachable clustering / AI workflow UIs as investigation candidates when exposure is unclear.
>
> *Separate three facts: (1) KEV listing, (2) your asset exposure, (3) marketing claims about “AI hacking agents.” Only (1)+(2) drive the immediate control test.*

## What moved

Langflow’s appearance on KEV is a governance tell for AI platforms: experimental agent/orchestration stacks are now routine exploit surface when reachable. Tomcat’s clustering EncryptInterceptor bypass class of issue remains a reminder that “we patched in April” is not evidence if builds were never upgraded or clustering listeners remain public.

Where Unit 42 / industry reporting links Tomcat activity to broader AI-assisted campaigns, keep the desk note precise: confirmed KEV exploitation of the CVE is the binding signal; campaign narrative is context requiring careful citation.

## Governance implication (one test)

1. Search for Langflow (or equivalent AI workflow UIs) and Tomcat clustering endpoints in the external attack surface.  
2. For each hit: owner, build/version, internet exposure, last validation date.  
3. If exposure existed in the exploit window, document triage beyond “patched.”

## V. Sources & Citations
1. CISA — Known Exploited Vulnerabilities Catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog  
2. ByteVanguard — Weekly threat brief (week ending 9 Aug 2026): https://bytevanguard.com/2026/08/10/weekly-threat-brief-a-kev-tied-to-an-ai-hacking-agent/  
3. The CyberSignal — Langflow / Tomcat / N-central KEV cluster: https://www.thecybersignal.com/cisa-kev-langflow-n-central-tomcat-teamcity-2026/
