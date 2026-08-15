---
title: "Desk Note — JetBrains TeamCity deserialization RCE added to CISA KEV (5 August 2026)"
publishedAt: "2026-08-05T12:00:00.000Z"
published: "2026-08-05"
summary: "On 5 August 2026 CISA added CVE-2026-63077 (JetBrains TeamCity deserialization of untrusted data) to the KEV catalog based on evidence of active exploitation. Compromised CI/CD servers expose credentials, build configs, and artifact integrity—making TeamCity a supply-chain governance asset, not only an engineering tool."
classification: "Institutional Governance"
author: "Ironframe Governance Frame"
publishedBy: "54aac838-9094-4de5-ac24-993672505cbc"
---

> **Signal (5 August 2026):** CISA alerted that **CVE-2026-63077** — JetBrains TeamCity deserialization of untrusted data — was added to the KEV catalog. Public reporting cites a federal remediation due date around **8 August 2026**. CISA's alert also points operators to **BOD 26-04** risk-based prioritization and expectations to assess whether systems were compromised before patching.
>
> *A build server is an evidence factory. If it is untrusted, signed releases and "secure SDLC" claims become contested.*

## What moved

CI/CD compromise converts a single host into tampering capability across every downstream environment the pipeline touches. The desk-note control question is not "did Eng patch?" It is whether Security, AppSec, and GRC can show: internet exposure status, patch/build evidence, credential rotation after suspected exposure, and whether release artifacts from the window remain trustworthy.

## Governance implication (one test)

1. List TeamCity (and equivalent CI) instances; mark public vs internal.
2. Confirm fixed builds (TeamCity **2026.1.3** / **2025.11.7** lines).
3. If any instance was exposed during the exploit window, require a documented pre-patch compromise check and a decision on artifact re-build/re-sign.

## V. Sources & Citations

1. CISA — Adds one KEV (TeamCity CVE-2026-63077), 5 August 2026: https://www.cisa.gov/news-events/alerts/2026/08/05/cisa-adds-one-known-exploited-vulnerability-catalog
2. CISA — BOD 26-04: Prioritizing Security Updates Based on Risk: https://www.cisa.gov/news-events/directives/bod-26-04-prioritizing-security-updates-based-risk
3. Cloud Security Alliance — CISA's TeamCity KEV Addition: A Three-Day Deadline: https://labs.cloudsecurityalliance.org/research/csa-research-note-teamcity-cve-2026-63077-kev-20260806-csa-s/
