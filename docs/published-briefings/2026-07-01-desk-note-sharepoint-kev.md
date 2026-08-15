---
title: "Desk Note — CISA KEV: SharePoint RCE added 1 July 2026"
publishedAt: "2026-07-01T12:00:00.000Z"
published: "2026-07-01"
summary: "Ironframe Governance Frame briefing — Desk Note — CISA KEV: SharePoint RCE added 1 July 2026"
classification: "Institutional Governance"
author: "Ironframe Governance Frame"
publishedBy: "54aac838-9094-4de5-ac24-993672505cbc"
---

> **Signal (1 July 2026):** CISA added Microsoft SharePoint Server **CVE-2026-45659** to the Known Exploited Vulnerabilities (KEV) catalog. Public reporting places the federal remediation due date at **4 July 2026**. The addition confirms observed exploitation, elevating on-premises SharePoint patching from maintenance queue to operational priority.
>
> *Information reviewed for desk-note drafting through 11 August 2026; event date backdated to the week of occurrence.*

## What moved

CISA's KEV catalog is reserved for vulnerabilities with evidence of exploitation in the wild. Adding CVE-2026-45659 on 1 July 2026 converts a May-era SharePoint remote-code-execution patch into a short-fuse governance and operations problem: inventory on-premises farms, verify build/patch state, and preserve evidence of remediation decisions before the due date.

Independent reporting also associated active campaigns with financially motivated operators targeting SharePoint as a staging point. Treat that as threat context requiring verification against your own telemetry—not as automatic proof of compromise in every environment.

## Governance implication (one test)

1. List internet-facing and internal on-premises SharePoint Server instances (Subscription Edition / 2019 / 2016 as applicable).
2. Record patch/build evidence and owner for each instance.
3. If any instance remains unpatched past the KEV due date, document residual acceptance, compensating controls, and who authorized the exception.

KEV listing is not a private-sector statute by itself. It is a primary signal that "we will get to it next cycle" is no longer a defendable operating assumption for exposed farms.

## V. Sources & Citations

- **[1] CISA — Known Exploited Vulnerabilities Catalog** — https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- **[2] NVD — CVE-2026-45659** — https://nvd.nist.gov/vuln/detail/CVE-2026-45659
- **[3] Security Affairs — CISA adds SharePoint flaw to KEV (2 July 2026 reporting)** — https://securityaffairs.com/194654/security/u-s-cisa-adds-a-microsoft-sharepoint-server-flaw-to-its-known-exploited-vulnerabilities-catalog.html
