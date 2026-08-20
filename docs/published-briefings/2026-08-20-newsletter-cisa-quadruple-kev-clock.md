---
title: "Ironcast — The 30-Day Critical Patch Queue Meets a Three-Day KEV Clock"
publishedAt: "2026-08-20T12:00:00.000Z"
published: "2026-08-20"
summary: "**Signal (20 August 2026):** On Tuesday, CISA added four actively exploited flaws to the KEV catalog. Federal civilian agencies face a remediation due date of **21 August 2026** under BOD 22-01. [1][2] If your “critical = 30 days” policy is still the only clock in the room, the catalog is already ahead of you."
classification: "Institutional Governance"
author: "Ironframe Governance Frame"
publishedBy: "dereck@ironframegrc.com"
---

> **Signal (20 August 2026):** On Tuesday, CISA added four actively exploited flaws to the KEV catalog. Federal civilian agencies face a remediation due date of **21 August 2026** under BOD 22-01. [1][2] If your “critical = 30 days” policy is still the only clock in the room, the catalog is already ahead of you.
>
> *Companion briefing: Compressed KEV Clocks (queue draft 2026-08-20). Public analysis only—publication does not imply any estate has finished inventory or patching.*

## I. Exposure Vector

The 18 August add covers Windows IKE remote-code-execution class exposure, SharePoint weak authentication, vCenter path traversal, and macOS improper authentication. [1] Confirm versions and fixes in the live catalog before declaring closure. [2]

BOD 22-01 makes that due date mandatory for covered federal civilian agencies. Private operators are not automatically on the same statutory clock—but treating KEV as an emergency prioritization signal is how risk committees avoid confusing CVSS severity with active exploitation. [3]

## II. Quantitative Context

| Clock | Length that matters this week |
| --- | --- |
| Typical critical CVSS queue | Often 14–30 days |
| This KEV federal due window | **3 days** (18→21 Aug 2026) for covered FCEB agencies [1][2] |

The quantitative governance metric is **active exposure hours** on in-scope, reachable assets—not ticket severity labels alone. Do not invent daily dollar loss without a documented model.

## III. What Modern GRC Must Enforce

1. Name which of the four perimeter classes touch the estate within hours of a KEV add.  
2. Flip remediation priority when a flaw enters KEV—even if CVSS was already “critical.”  
3. If patching slips past the federal due date (or your emergency SLA), document compensating controls and exposure hours for the owner who must report them.

## IV. Verification Protocol

1. Confirm CISA’s 18 August alert and catalog due dates. [1][2]  
2. Confirm BOD 22-01 FCEB scope. [3]  
3. Keep product pitch and invented daily-loss dollars out of this note.

## V. Sources & Citations

1. CISA alert (18 Aug 2026): https://www.cisa.gov/news-events/alerts/2026/08/18/cisa-adds-four-known-exploited-vulnerabilities-catalog  
2. CISA KEV catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog  
3. CISA BOD 22-01: https://www.cisa.gov/binding-operational-directive-22-01
