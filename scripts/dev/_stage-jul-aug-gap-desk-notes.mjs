/**
 * Stage GF Desk note drafts for gap weeks: mid-July through end of August 2026.
 * Quarantine only — does not Approve/promote.
 * Dates = signal week on the note (filename + published:), not Approve-day.
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const QUEUE = resolve(process.cwd(), "docs/briefing-queue");
const REVIEWS = join(QUEUE, ".desk-reviews");
mkdirSync(REVIEWS, { recursive: true });

const FM = `classification: "Institutional Governance"
author: "Ironframe Governance Frame"
tenantId: "00000000-0000-0000-0000-000000000000"
tenantSlug: "ironframe-sandbox"
activeExposureCents: "0"
requiresImmediatePromotion: false`;

/** @type {Array<{ filename: string; title: string; markdown: string; dueAt: string }>} */
const DRAFTS = [
  {
    filename: "2026-07-16-draft-desk-note-fortisandbox-sharepoint-kev.md",
    title: "Desk Note — CISA KEV: FortiSandbox + SharePoint (16 July 2026)",
    dueAt: "2026-07-16T20:00:00.000Z",
    markdown: `---
title: "Desk Note — CISA KEV: FortiSandbox and SharePoint RCE (16 July 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-07-16"
summary: "On 16 July 2026 CISA added three actively exploited vulnerabilities to the KEV catalog: Fortinet FortiSandbox OS command injection (CVE-2026-25089, CVE-2026-39808) and Microsoft SharePoint deserialization RCE (CVE-2026-58644). Public reporting places the federal remediation due date at 19 July 2026."
${FM}
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
`,
  },
  {
    filename: "2026-07-21-draft-desk-note-wordpress-langflow-kev.md",
    title: "Desk Note — CISA KEV: WordPress Core + Langflow (21 July 2026)",
    dueAt: "2026-07-21T20:00:00.000Z",
    markdown: `---
title: "Desk Note — CISA KEV: WordPress Core and Langflow (21 July 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-07-21"
summary: "On 21 July 2026 CISA added four KEVs including WordPress Core interpretation-conflict and SQL-injection flaws (CVE-2026-63030, CVE-2026-60137), Langflow untrusted-control-sphere inclusion (CVE-2026-0770), and a DD-WRT buffer overflow (CVE-2021-27137)—a 48-hour stretch that also saw Check Point and SharePoint additions the next day."
${FM}
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
`,
  },
  {
    filename: "2026-07-22-draft-desk-note-checkpoint-sharepoint-kev.md",
    title: "Desk Note — CISA KEV: Check Point SmartConsole + SharePoint (22 July 2026)",
    dueAt: "2026-07-22T20:00:00.000Z",
    markdown: `---
title: "Desk Note — CISA KEV: Check Point SmartConsole and SharePoint (22 July 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-07-22"
summary: "On 22 July 2026 CISA added Check Point SmartConsole improper authentication (CVE-2026-16232) and another Microsoft SharePoint deserialization RCE (CVE-2026-50522) to the KEV catalog—management-plane and collaboration-plane failures in the same 24-hour window."
${FM}
---

> **Signal (22 July 2026):** CISA added **CVE-2026-16232** (Check Point SmartConsole improper authentication) and **CVE-2026-50522** (SharePoint deserialization RCE) to the KEV catalog after confirming active exploitation. Public trackers commonly list a federal due date around **25 July 2026** for the SharePoint entry.
>
> *Security-management consoles are not “tools”—they are privileged control planes.*

## What moved

SmartConsole authentication bypass elevates risk beyond a single appliance: an attacker who obtains management access can alter policies that protect the rest of the estate. Paired with yet another SharePoint RCE KEV, the week’s lesson is concentration risk on trust and collaboration infrastructure—not novelty of vendor names.

Treat management-console exposure (VPN, jump hosts, IP allowlists, MFA) as part of the remediation evidence pack, not an afterthought once the binary is patched.

## Governance implication (one test)

1. Confirm whether SmartConsole / management services are reachable beyond the intended admin path.  
2. Record SharePoint build/patch evidence for CVE-2026-50522 separately from the 16 July SharePoint KEV.  
3. Name the owner who decides when “patched” still requires compromise assessment.

## V. Sources & Citations

1. CISA — Adds two KEVs (22 July 2026): https://www.cisa.gov/news-events/alerts/2026/07/22/cisa-adds-two-known-exploited-vulnerabilities-catalog  
2. CISA — Known Exploited Vulnerabilities Catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog  
`,
  },
  {
    filename: "2026-07-27-draft-desk-note-arista-fortinet-kev.md",
    title: "Desk Note — CISA KEV: Arista VeloCloud + FortiOS (27 July 2026)",
    dueAt: "2026-07-27T20:00:00.000Z",
    markdown: `---
title: "Desk Note — CISA KEV: Arista VeloCloud Orchestrator and FortiOS (27 July 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-07-27"
summary: "On 27 July 2026 CISA added Arista VeloCloud Orchestrator on-prem OS command injection (CVE-2026-16812, CVSS 10.0) and Fortinet FortiOS sensitive-information exposure (CVE-2025-68686) to the KEV catalog. Public reporting places compressed federal clocks—VeloCloud commonly due 30 July; FortiOS commonly due 10 August."
${FM}
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
`,
  },
  {
    filename: "2026-07-27-draft-desk-note-eu-ai-omnibus-force.md",
    title: "Desk Note — EU AI Omnibus enters into force (27 July 2026)",
    dueAt: "2026-07-27T21:00:00.000Z",
    markdown: `---
title: "Desk Note — EU AI Act Omnibus amendments enter into force (27 July 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-07-27"
summary: "On 27 July 2026, Regulation (EU) 2026/1744 amending the EU AI Act entered into force. It preserves near-term transparency duties (Article 50 from 2 August 2026) while deferring much of the high-risk Annex III regime—commonly to 2 December 2027—creating a category-error risk for teams that heard only “AI Act delayed.”"
${FM}
---

> **Signal (27 July 2026):** The AI Omnibus (**Regulation (EU) 2026/1744**) enters into force. It amends timelines for high-risk AI system obligations without suspending prohibitions already in force, GPAI duties already applicable, or the **2 August 2026** Article 50 transparency applicability date (subject to a limited generative-marking transition commonly described through **2 December 2026** for legacy systems).
>
> *“High-risk deferred” ≠ “transparency paused.”*

## What moved

Operators that parked *all* AI Act work behind a later high-risk date now face a split calendar: transparency and enforcement mechanics arrive within days; Annex III lifecycle duties move later. The desk implication is inventory by role (provider vs deployer) and by obligation family—not a single program milestone.

This note is not a restatement of the 2 August Article 50 desk note; it records the Omnibus instrument that reshaped the calendar one week earlier.

## Governance implication (one test)

1. Split the AI Act tracker into: (a) already-in-force prohibitions/GPAI, (b) Article 50 from 2 Aug 2026, (c) deferred high-risk Annex timelines.  
2. Name the owner who maps each in-scope system to provider vs deployer duties.  
3. Record which generative systems claim the legacy marking transition through December 2026—and who approved that claim.

## V. Sources & Citations

1. Steptoe — EU AI Act amendments enter into force: https://www.steptoe.com/en/news-publications/steptechtoe-blog/eu-ai-act-amendments-enter-into-force.html  
2. Goodwin — Article 50 not delayed (Aug 2026 analysis referencing Omnibus): https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force  
`,
  },
  {
    filename: "2026-07-29-draft-desk-note-cisco-fmc-kev.md",
    title: "Desk Note — CISA KEV: Cisco Secure FMC (29 July 2026)",
    dueAt: "2026-07-29T20:00:00.000Z",
    markdown: `---
title: "Desk Note — CISA KEV: Cisco Secure Firewall Management Center (29 July 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-07-29"
summary: "On 29 July 2026 CISA added Cisco Secure Firewall Management Center (FMC) CVE-2026-20316 to the KEV catalog. Public trackers commonly list a federal remediation due date of 1 August 2026—another management-plane clock at month boundary."
${FM}
---

> **Signal (29 July 2026):** CISA added **CVE-2026-20316** (Cisco Secure Firewall Management Center) to the Known Exploited Vulnerabilities catalog. Public mirrors commonly show a due date of **1 August 2026**.
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
`,
  },
  {
    filename: "2026-08-10-draft-desk-note-fortios-loadmaster-due.md",
    title: "Desk Note — FortiOS + LoadMaster KEV due clocks (10 August 2026)",
    dueAt: "2026-08-10T20:00:00.000Z",
    markdown: `---
title: "Desk Note — FortiOS and LoadMaster KEV due clocks land (10 August 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-08-10"
summary: "10 August 2026 is the commonly cited federal remediation due date for Fortinet FortiOS CVE-2025-68686 (KEV-added 27 July) and Progress LoadMaster CVE-2026-8037 (KEV-added 7 August). The governance question this week is validated closure—patch evidence plus exposure and triage decisions—not calendar expiry alone."
${FM}
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
`,
  },
  {
    filename: "2026-08-14-draft-desk-note-ai-act-art50-operating-week.md",
    title: "Desk Note — Article 50 first operating week (14 August 2026)",
    dueAt: "2026-08-14T20:00:00.000Z",
    markdown: `---
title: "Desk Note — EU AI Act Article 50: first full operating week (14 August 2026)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-08-14"
summary: "Two weeks after Article 50 transparency obligations became applicable (2 August 2026), this desk note records the operating question for GRC teams: which in-scope interactive and generative systems have disclosure/marking evidence, and which still rely on a deferred high-risk narrative that does not pause transparency."
${FM}
---

> **Signal (week of 14 August 2026):** Article **50** transparency duties under the EU AI Act have been applicable since **2 August 2026**. Mid-month is the first full operating week after the applicability date—when “we will get to AI Act later” stops being a calendar statement and becomes an evidence gap.
>
> *This complements the 2 August applicability desk note; it does not restate the Omnibus instrument.*

## What moved

National competent authorities can now treat chatbot disclosure, synthetic-content marking (subject to the limited legacy transition commonly described through **2 December 2026**), and deployer deepfake / public-interest text labeling as present-tense controls. The failure mode is still category error: teams that only tracked deferred Annex III high-risk dates may lack provider/deployer inventories for Article 50 systems already in production.

## Governance implication (one test)

1. List every customer-facing or employee-facing AI system that interacts directly with natural persons.  
2. For each, record disclosure/marking evidence or an explicit out-of-scope rationale.  
3. Separate GPAI provider duties from deployer transparency duties—different owners.

## V. Sources & Citations

1. Goodwin — Article 50 obligations now in force: https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force  
2. EUR-Lex — Regulation (EU) 2024/1689 (AI Act): https://eur-lex.europa.eu/eli/reg/2024/1689/oj  
3. European Commission — AI Act implementation / transparency context (confirm current guidance before Promote): https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai  
`,
  },
  {
    filename: "2026-08-17-draft-desk-note-federal-contracting-cyber-rules.md",
    title: "Desk Note — Federal contracting cyber rules: September cluster (17 August 2026)",
    dueAt: "2026-08-17T20:00:00.000Z",
    markdown: `---
title: "Desk Note — Unified Agenda: federal contracting cyber rules target September 2026"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-08-17"
summary: "Mid-August is the practical prep window before a September 2026 Unified Agenda cluster: alongside CIRCIA, federal contracting rules on standardized cybersecurity requirements for unclassified IT and cyber threat/incident reporting & information sharing are projected for finalization. Separately, DoD has signaled an August DFARS NPRM update path for safeguarding covered defense information."
${FM}
---

> **Signal (week of 17 August 2026):** The 2026 Unified Agenda preview projects **September 2026** finalization not only for CIRCIA but also for federal **contracting** cybersecurity standardization and cyber incident reporting/information-sharing rules. DoD has also been reported as expecting an **August** DFARS NPRM update related to safeguarding covered defense information and cyber incident reporting.
>
> *Contract flow-downs move faster than “we are not critical infrastructure” narratives.*

## What moved

Even operators outside CIRCIA’s eventual covered-entity set may face the same September window through FAR/DFARS clauses. The desk action is inventory: which contracts already incorporate NIST-aligned safeguarding and incident-reporting language, and who owns the gap analysis before final rules lock.

Do not treat this as CIRCIA itself (covered in the July CIRCIA desk note). This note is about the **contracting** cluster riding the same Agenda month.

## Governance implication (one test)

1. List active federal prime/sub contracts with cyber safeguarding or incident-reporting clauses.  
2. Name the owner who monitors OIRA Unified Agenda + acquisition updates through September.  
3. Separate three tracks: CIRCIA (critical infrastructure reporting), FAR cyber standardization, DFARS/CMMC verification—different evidence packs.

## V. Sources & Citations

1. Federal News Network — CIRCIA and other big cyber rules expected this fall (July 2026 Unified Agenda reporting): https://federalnewsnetwork.com/cybersecurity/2026/07/circia-other-big-cyber-rules-expected-to-get-finalized-this-fall/  
2. ExecutiveGov — CISA expects final CIRCIA rule in September (Agenda context): https://www.executivegov.com/articles/cisa-circia-final-incident-reporting-rule-september  
`,
  },
  {
    filename: "2026-08-24-draft-desk-note-circia-readiness-window.md",
    title: "Desk Note — CIRCIA readiness window before September final (24 August 2026)",
    dueAt: "2026-08-24T20:00:00.000Z",
    markdown: `---
title: "Desk Note — CIRCIA: late-August readiness before September final-rule target"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-08-24"
summary: "With CISA’s CIRCIA final rule still targeted for September 2026 on the Unified Agenda, the last full week of August is the practical readiness window: map likely coverage under the NPRM criteria, align IR playbooks to 72-hour incident and 24-hour ransom-payment reporting clocks, and assign owners—without treating the Agenda date as a filed final rule."
${FM}
---

> **Signal (week of 24 August 2026):** CISA continues to target **September 2026** for the CIRCIA final rule. Covered critical-infrastructure entities are expected, once the rule takes effect, to report covered cyber incidents within **72 hours** and ransom payments within **24 hours**.
>
> *Agenda target ≠ final text. Prep against the NPRM shape; update when the final rule publishes.*

## What moved

This is not a re-announcement of the July Unified Agenda desk note. Late August is the operating window: if the final rule lands in September, committees that start inventory then will already be late relative to board expectations. Focus on coverage hypotheses, reporting clocks, and dual-track obligations (CIRCIA vs SEC Item 1.05 vs sector rules)—not restating Navient or the Item 1.05 newsletter.

## Governance implication (one test)

1. Document a provisional “likely covered / unlikely / unknown” map against NPRM-style criteria.  
2. Walk the IR playbook against 72-hour and 24-hour clocks with named decision makers.  
3. Record the owner who will diff final rule vs NPRM within five business days of publication.

## V. Sources & Citations

1. Hunton — CISA plans to finalize CIRCIA regulations in September 2026: https://www.hunton.com/privacy-and-cybersecurity-law-blog/cisa-plans-to-finalize-cyber-incident-reporting-regulations-in-september-2026  
2. CISA — CIRCIA program hub: https://www.cisa.gov/circia  
`,
  },
  {
    filename: "2026-08-31-draft-desk-note-september-cyber-rulemaking.md",
    title: "Desk Note — September cyber rulemaking window opens (31 August 2026)",
    dueAt: "2026-08-31T20:00:00.000Z",
    markdown: `---
title: "Desk Note — September 2026 cyber rulemaking window opens (31 August)"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-08-31"
summary: "31 August 2026 closes the summer prep window before the September Unified Agenda cluster: CIRCIA final rule target, federal contracting cybersecurity standardization, and related cyber incident reporting/information-sharing rules. Boards should enter September with named owners, coverage maps, and update rituals—not a waiting posture."
${FM}
---

> **Signal (31 August 2026):** Summer ends with a forward calendar, not a filed final rule. September remains the publicly reported target month for **CIRCIA** finalization and adjacent **federal contracting** cyber rules on the Unified Agenda.
>
> *Enter September with a diff ritual. Do not enter it hoping the Agenda slipped again.*

## What moved

Operators that treated July’s Agenda update as news-only now face a month boundary. The desk deliverable is operational: owners, coverage hypotheses, IR clock drills, and contract-clause inventories ready for rapid update when text publishes. Distinguish “final rule published” from “compliance date later”—both matter, and they are not the same day.

## Governance implication (one test)

1. Confirm the September watchlist owner (CIRCIA + FAR/DFARS cyber cluster).  
2. Pre-stage a one-page board note template: what changed / who is covered / clocks / residual gaps.  
3. Schedule the first post-publication working session before celebrating any slip.

## V. Sources & Citations

1. Federal News Network — big cyber rules expected this fall: https://federalnewsnetwork.com/cybersecurity/2026/07/circia-other-big-cyber-rules-expected-to-get-finalized-this-fall/  
2. CISA — CIRCIA: https://www.cisa.gov/circia  
`,
  },
];

function writeDeskReview(filename, title) {
  const base = filename.replace(/\.md$/i, "");
  const sidecar = {
    filename,
    title,
    draftKind: "desk-note",
    readyForHumanOperator: true,
    stagedAt: new Date().toISOString(),
    agents: [
      {
        id: "gf-operator",
        status: "staged",
        notes: ["Quarantine → Approve/Hold/Deny on Publishing Desk → Desk notes."],
      },
    ],
  };
  writeFileSync(join(REVIEWS, `${base}.desk.json`), `${JSON.stringify(sidecar, null, 2)}\n`, "utf8");
}

const p = new PrismaClient();

try {
  const results = [];
  for (const d of DRAFTS) {
    const abs = join(QUEUE, d.filename);
    writeFileSync(abs, `${d.markdown.trim()}\n`, "utf8");
    writeDeskReview(d.filename, d.title);

    const existing = await p.opsActivity.findFirst({
      where: { sourceRef: d.filename, kind: "BRIEFING_REVIEW" },
    });
    const nextActions = [
      "[ ] Open Publishing Desk → Desk notes",
      "[ ] Re-open citation URLs; confirm claim still matches source",
      "[ ] Approve / Hold / Deny (human only)",
    ].join("\n");
    const row = existing
      ? await p.opsActivity.update({
          where: { id: existing.id },
          data: {
            title: `Desk note review: ${d.filename}`,
            status: "PLANNED",
            dueAt: new Date(d.dueAt),
            href: `/dashboard/operations/publishing?desk=desk-notes&draft=${encodeURIComponent(d.filename)}`,
            priority: 20,
            ownerLabel: "Publisher",
            notes: d.title,
            nextActions,
            completedAt: null,
            outcome: null,
          },
        })
      : await p.opsActivity.create({
          data: {
            title: `Desk note review: ${d.filename}`,
            kind: "BRIEFING_REVIEW",
            status: "PLANNED",
            dueAt: new Date(d.dueAt),
            sourceRef: d.filename,
            href: `/dashboard/operations/publishing?desk=desk-notes&draft=${encodeURIComponent(d.filename)}`,
            priority: 20,
            ownerLabel: "Publisher",
            notes: d.title,
            nextActions,
          },
        });

    results.push({
      filename: d.filename,
      exists: existsSync(abs),
      calendar: row.id.slice(0, 8),
      dueAt: d.dueAt.slice(0, 10),
    });
  }
  console.log(JSON.stringify({ staged: results.length, results }, null, 2));
} finally {
  await p.$disconnect();
}
