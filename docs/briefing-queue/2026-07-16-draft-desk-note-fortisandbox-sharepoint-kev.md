---
title: "Desk Note — CISA KEV: FortiSandbox and SharePoint RCE (16 July 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-07-16"
summary: "On 16 July 2026 CISA added three actively exploited vulnerabilities to the KEV catalog: Fortinet FortiSandbox OS command injection (CVE-2026-25089, CVE-2026-39808) and Microsoft SharePoint deserialization RCE (CVE-2026-58644). Public reporting places the federal remediation due date at 19 July 2026."
classification: "Institutional Governance"
author: "Ironframe Governance Frame"
tenantId: "00000000-0000-0000-0000-000000000000"
tenantSlug: "ironframe-sandbox"
activeExposureCents: "0"
requiresImmediatePromotion: false
---

> **Signal (16 July 2026):** CISA added **CVE-2026-25089**, **CVE-2026-39808** (FortiSandbox OS command injection), and **CVE-2026-58644** (SharePoint deserialization) to the Known Exploited Vulnerabilities catalog. Federal civilian agencies face a short remediation clock—commonly reported as **19 July 2026**—under BOD 26-04 risk-based KEV handling.
>
> *Information reviewed for desk-note drafting through 11 August 2026; event date backdated to the week of occurrence.*

## What moved

This batch pairs an internet-reachable malware-analysis appliance family with another on-premises SharePoint RCE path. The governance failure mode is treating sandbox/appliance inventory as “security tooling, therefore out of scope for emergency patch,” while SharePoint remains stuck in a Patch Tuesday backlog after the July 1 SharePoint KEV wave.

Patching closes the listed CVE. It does not by itself prove pre-patch compromise did not occur—especially where BOD 26-04 forensic-triage expectations apply to high-risk internet-exposed assets.

## Governance implication (one test)

1. Inventory FortiSandbox (on-prem / Cloud / PaaS) and on-premises SharePoint builds with named owners.  
2. Record patch evidence against the three CVEs before the due date.  
3. For any internet-exposed instance patched late, document whether pre-patch compromise assessment was required and who authorized residual acceptance.

## V. Sources & Citations

1. CISA — Adds three KEVs (16 July 2026): https://www.cisa.gov/news-events/alerts/2026/07/16/cisa-adds-three-known-exploited-vulnerabilities-catalog  
2. CISA — Known Exploited Vulnerabilities Catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog  
3. Security Affairs — FortiSandbox and SharePoint KEV reporting: https://securityaffairs.com/195569/security/u-s-cisa-adds-fortinet-fortisandbox-and-microsoft-sharepoint-flaws-to-its-known-exploited-vulnerabilities-catalog.html
