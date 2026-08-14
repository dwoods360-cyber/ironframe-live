---
title: "Desk Note — CISA KEV: Arista VeloCloud Orchestrator and FortiOS (27 July 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-07-27"
summary: "On 27 July 2026 CISA added Arista VeloCloud Orchestrator on-prem OS command injection (CVE-2026-16812, CVSS 10.0) and Fortinet FortiOS sensitive-information exposure (CVE-2025-68686) to the KEV catalog. Public reporting places compressed federal clocks—VeloCloud commonly due 30 July; FortiOS commonly due 10 August."
classification: "Institutional Governance"
author: "Ironframe Governance Frame"
tenantId: "00000000-0000-0000-0000-000000000000"
tenantSlug: "ironframe-sandbox"
activeExposureCents: "0"
requiresImmediatePromotion: false
---

> **Signal (27 July 2026):** CISA added **CVE-2026-16812** (Arista VeloCloud Orchestrator on-prem OS command injection) and **CVE-2025-68686** (Fortinet FortiOS exposure of sensitive information) to the KEV catalog on evidence of active exploitation.
>
> *SD-WAN orchestrators and edge SSL-VPN families remain preferred internet-facing targets.*

## What moved

Maximum-severity orchestrator RCE is a control-plane event: compromise of the management console can fan out across sites. The FortiOS entry—lower CVSS but on a widely deployed edge platform—extends the clock into early August (commonly **10 August 2026**), so closure evidence must survive past the week the alert dropped.

Private-sector boards should not wait for a “our sector mandate.” Treat KEV + internet exposure as the operating priority signal.

## Governance implication (one test)

1. Inventory on-prem VeloCloud Orchestrator instances and internet reachability.  
2. Map FortiOS versions affected by CVE-2025-68686 and owners before the August due date.  
3. Document compensating controls if either platform cannot meet the federal-style clock.

## V. Sources & Citations

1. CISA — Adds two KEVs (27 July 2026): https://www.cisa.gov/news-events/alerts/2026/07/27/cisa-adds-two-known-exploited-vulnerabilities-catalog  
2. Sentinel.ht — Arista and Fortinet KEV context: https://sentinel.ht/cisa-kev-arista-velocloud-fortinet-fortios-exploited/
