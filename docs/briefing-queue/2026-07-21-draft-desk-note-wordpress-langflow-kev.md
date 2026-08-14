---
title: "Desk Note — CISA KEV: WordPress Core and Langflow (21 July 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-07-21"
summary: "On 21 July 2026 CISA added four KEVs including WordPress Core interpretation-conflict and SQL-injection flaws (CVE-2026-63030, CVE-2026-60137), Langflow untrusted-control-sphere inclusion (CVE-2026-0770), and a DD-WRT buffer overflow (CVE-2021-27137)—a 48-hour stretch that also saw Check Point and SharePoint additions the next day."
classification: "Institutional Governance"
author: "Ironframe Governance Frame"
tenantId: "00000000-0000-0000-0000-000000000000"
tenantSlug: "ironframe-sandbox"
activeExposureCents: "0"
requiresImmediatePromotion: false
---

> **Signal (21 July 2026):** CISA added **CVE-2026-63030** and **CVE-2026-60137** (WordPress Core), **CVE-2026-0770** (Langflow), and **CVE-2021-27137** (DD-WRT) to the KEV catalog on evidence of active exploitation.
>
> *The governance story is trust-plane exposure: CMS, AI workflow tooling, and edge routers—not only “enterprise apps.”*

## What moved

WordPress Core entering KEV is an internet-facing content and plugin ecosystem problem for any regulated operator that still hosts marketing, portals, or partner sites on WordPress. Langflow’s inclusion continues the July–August pattern of agentic AI platforms becoming confirmed-exploitation priorities (later reinforced by IBM Langflow KEV entries in early August).

Do not collapse these into a single “patch CMS” ticket. Separate owners: web properties, AI lab / data-science stacks, and network-edge firmware.

## Governance implication (one test)

1. List internet-facing WordPress Core versions and who owns emergency updates.  
2. Inventory Langflow (and similar agent platforms) outside the “experimental” carve-out narrative.  
3. Confirm DD-WRT / consumer-grade firmware is not bridging production networks without compensating controls.

## V. Sources & Citations

1. CISA — Adds four KEVs (21 July 2026): https://www.cisa.gov/news-events/alerts/2026/07/21/cisa-adds-four-known-exploited-vulnerabilities-catalog  
2. TheCyberThrone — Six KEV additions 21–22 July 2026: https://thecyberthrone.in/2026/07/23/cisa-adds-six-vulnerabilities-to-kev-july-2026/
