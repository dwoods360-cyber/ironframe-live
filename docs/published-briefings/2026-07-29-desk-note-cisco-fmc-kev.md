---
title: "Desk Note — CISA KEV: Cisco Secure Firewall Management Center (29 July 2026)"
publishedAt: "2026-07-29T12:00:00.000Z"
published: "2026-07-29"
summary: "On 29 July 2026 CISA added Cisco Secure Firewall Management Center (FMC) hard-coded credential vulnerability CVE-2026-20316 to the KEV catalog. Public trackers commonly list a federal remediation due date of 1 August 2026—another management-plane clock at month boundary."
classification: "Institutional Governance"
author: "Ironframe Governance Frame"
publishedBy: "ops-desk-catchup"
---

---
title: "Desk Note — CISA KEV: Cisco Secure Firewall Management Center (29 July 2026)"
category: "desk-note"
publishedAt: "2026-07-29T12:00:00.000Z"
published: "2026-07-29"
summary: "On 29 July 2026 CISA added Cisco Secure Firewall Management Center (FMC) hard-coded credential vulnerability CVE-2026-20316 to the KEV catalog. Public trackers commonly list a federal remediation due date of 1 August 2026—another management-plane clock at month boundary."
classification: "Institutional Governance"
author: "Ironframe Governance Frame"
publishedBy: "ops-desk-catchup"
---

> **Signal (29 July 2026):** CISA added **CVE-2026-20316** (Cisco Secure Firewall Management Center � hard-coded credential) to the Known Exploited Vulnerabilities catalog. Public mirrors commonly show a due date of **1 August 2026**.
>
> *Firewall managers sit above the devices boards assume are “already secured.”*

## What moved

Late-July KEVs concentrated on orchestrators and management consoles (Arista, Check Point, Cisco FMC). The operating failure mode is inventory that lists firewalls but not the management plane that configures them—or assumes FMC is “internal only” without verifying exposure and authentication path.

Treat FMC reachability, admin MFA, and patch evidence as one control package before the August due date.

## Governance implication (one test)

1. Inventory FMC instances and whether management interfaces are internet-reachable.  
2. Record patch/build evidence for CVE-2026-20316 with owner and timestamp.  
3. If due date is missed, document residual acceptance and compensating controls—not silence.

## V. Sources & Citations

1. CISA — Known Exploited Vulnerabilities Catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog  
2. CVETodo / public KEV mirrors — CVE-2026-20316 added 29 July 2026, due 1 August 2026: https://cvetodo.com/cisa-kev
