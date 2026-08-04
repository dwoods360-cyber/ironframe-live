---
title: "Governance Frame U.S. Cyber Disclosure Review — August 2026: What Item 1.05 Filings Reveal About Materiality"
date: "2026-08-16T00:00:00.000Z"
lastUpdated: "2026-08-04T00:00:00.000Z"
status: "QUARANTINED_DRAFT"
classification: "Institutional Governance"
category: "newsletter"
seriesId: "governance-frame-summer-2026"
installmentId: "GF-SUM-2026-08-N"
summary: "Two-plus years into the SEC’s cybersecurity disclosure rules, the useful August 2026 question is not what Item 1.05 says in the abstract—it is what recent filings show about materiality without operational shutdown, third-party environments, sensitive data, unauthorized AI use, and disclosure-committee evidence. This newsletter reads filing patterns against Item 1.05 and Item 106 duties while keeping discovery, materiality determination, the four-business-day clock, and amendments distinct. Information reviewed through August 4, 2026."
author: "Ironframe Governance Frame"
audience: "Public — brief.ironframegrc.com"
tenantId: "00000000-0000-0000-0000-000000000000"
tenantSlug: "industry-research"
requiresImmediatePromotion: false
activeExposureCents: "0"
publishState: "QUARANTINED_AWAITING_OPERATOR"
---

> **Executive Summary:** Item 1.05 is a materiality-triggered disclosure control, not an automatic public notice for every intrusion. Item 1.05 filings by Navient, CareCloud, CB Financial Services and Amgen show registrants finding materiality based on the volume and sensitivity of information, potential legal and regulatory consequences, and qualitative investor considerations—even where operations continued, company-owned systems were not compromised, or no material financial-condition impact was expected. GRC leaders should distinguish incident discovery, materiality determination, the four-business-day filing period and later amendments; align those processes with the governance disclosures made under Item 106; and preserve evidence supporting the determination.
>
> *Information reviewed through August 4, 2026. Publication date August 16, 2026.*

## I. Exposure Vector

A disclosure committee learns of a ransomware event at outside counsel. Company systems are untouched. Customer Social Security numbers sit in the firm’s matter files. Operations continue. The instinct—“no outage, therefore not Item 1.05”—is exactly the failure mode recent filings challenge.

On July 2, 2026, Navient Corporation filed an Item 1.05 Form 8-K reporting that it had determined the incident material on June 29, 2026. Navient became aware on June 8, 2026 of a ransomware incident at a third-party law firm; borrower data including names, dates of birth, addresses, and Social Security numbers were accessed in the firm’s environment; Navient reported no unauthorized access to its own systems and no operational disruption; it nonetheless determined the incident material “in light of the volume and sensitivity of the information involved,” while stating it did not believe the incident had a material impact on financial condition or results of operations. [1]

CareCloud, Inc. experienced an approximately eight-hour disruption on March 16, 2026 affecting one of its six electronic-health-record environments. It determined the incident material on March 24 because of the sensitivity of potentially affected patient information and possible remediation, legal, regulatory, notification, patient, customer, reputational, and operational consequences—while saying the incident had not materially affected operations and was not reasonably likely to materially affect its financial condition or results. The filing was submitted on March 27, 2026. [2]

CB Financial Services disclosed that its bank subsidiary became aware on May 5, 2026 of non-public customer information being handled through an unauthorized AI-based application. It determined the event material on May 7 because of the volume and sensitivity of the information, including names, Social Security numbers, and dates of birth. It reported no operational disruption and no expected material financial-condition or results impact. The filing was signed May 11, 2026. [3]

On July 31, 2026, Amgen Inc. filed an Item 1.05 report concerning data exfiltrated from cloud environments hosted by third-party providers. Amgen determined materiality on July 29 based on the apparent file volume and the possibility that the files contained sensitive information. It reported no identified impact on products, manufacturing, financial-reporting systems, or its ability to meet patient needs, and no reasonably likely material impact on financial condition or results. [4]

Separately, Corp Fin’s May 21, 2024 staff statement clarified that Item 1.05 is intended for incidents the registrant has determined are material. If a company voluntarily discloses an incident that has not yet been determined material—or that was determined immaterial—the staff encouraged use of another item, such as Item 8.01. That statement is official SEC staff guidance; it expressly states it is not a Commission rule and has no independent legal force. Debevoise’s tracker reported that, during the two years following Corp Fin’s May 2024 guidance, more issuers used Item 8.01 than Item 1.05, and most Item 8.01 disclosures did not later produce an Item 1.05 filing. Counts should be accompanied by the tracker’s period and counting methodology. [5][6]

## II. Quantitative Context

| Pattern observed in public filings | Governance implication |
| ---------------------------------- | ---------------------- |
| Materiality without registrant outage | Data sensitivity and volume can drive Item 1.05 even when ops continue [1][2][3][4] |
| Third-party hosted / professional-firm incidents | Incidents in vendor, cloud-provider, or professional-adviser environments can become registrant disclosure events when they affect information systems or information used by the registrant and the resulting impact or reasonably likely impact is material [1][4][7] |
| Unauthorized AI use involving sensitive data | CB Financial Services treated employee use of an unauthorized AI application as a material cybersecurity incident despite no operational disruption [3] |
| Materiality date ≠ discovery / awareness date | Record both; the four-business-day clock runs from materiality determination [8] |
| Voluntary Item 8.01 then later Item 1.05 | Voluntary early communication ≠ final materiality conclusion [5][6] |
| Statement of no material financial-condition impact alongside Item 1.05 | Materiality is broader than immediate P&L effect; still requires careful committee analysis of quantitative and qualitative factors [1][5][9] |

| Process clock | Rule |
| ------------- | ---- |
| Discovery of the incident | Starts investigation and escalation—not automatically the 8-K clock. In complex third-party cases, separately record when each internal function was notified |
| Materiality determination | Starts the Item 1.05 four-business-day period; must be without unreasonable delay after discovery [8] |
| Filing | Item 1.05 content: nature, scope, timing, material impact or reasonably likely impact |
| Amendments | Update within four business days after required information is determined or becomes available [8] |

## III. What Modern GRC Must Enforce

### Suggested newsletter sections (control translation)

| Theme | What filings teach | Prudent control response |
| ----- | ------------------ | ------------------------ |
| Materiality without shutdown | Ops continuity ≠ immaterial [1][2][3][4] | Materiality rubric includes data sensitivity, individuals affected, legal/regulatory exposure, reputational harm |
| Data sensitivity vs direct financial loss | Committees cite sensitivity even when financial impact is not yet quantified [1][2] | Separate “material cybersecurity incident” from “material financial-statement impact” analyses; prefer “immediate P&L effect” language over overbroad “financial-statement impact” |
| Third-party incidents | Outside counsel and third-party cloud compromises can be registrant events when registrant-used systems/information are affected and impact is material [1][4] | Intake paths for vendor, cloud, and counsel notices; tabletop a third-party scenario; do not treat every vendor incident as automatically Item 1.05 |
| Unauthorized AI use involving sensitive data | CB Financial Services treated unauthorized AI handling of customer data as material despite no operational disruption [3] | Include shadow AI, unsanctioned SaaS, data uploads and prompt-based disclosure in the incident taxonomy and materiality escalation process |
| Voluntary Item 8.01 versus mandatory Item 1.05 | Staff guidance points to Item 8.01 for voluntary disclosure when materiality is not established; Item 7.01 serves Regulation FD, not as a co-equal cyber path [5] | Playbook for voluntary Item 8.01 disclosure while materiality remains undetermined, and mandatory escalation to Item 1.05 once materiality is determined—without unreasonably delaying the determination |
| Materiality before investigation ends | Filings acknowledge incomplete facts with amendment commitments [2][4] | Decision memo template for interim materiality |
| Item 106 alignment | Annual governance text must match real committee practice [7][9] | Establish a documented board or responsible-committee reporting cadence appropriate to the registrant’s risk profile, with records demonstrating what was reported, considered, challenged, and escalated (Item 106 does not prescribe quarterly meetings or a particular committee form) |
| Disclosure-committee evidence | Weak incident-escalation and disclosure-control processes have featured in prior SEC cyber-related enforcement matters | Preserve evidence supporting the timing, inputs, participants, and rationale for each materiality determination |

### Do not overclaim

* Not every cyber incident belongs under Item 1.05.
* Do not collapse discovery, materiality determination, the four-business-day filing period, and amendments into one date.
* Do not imply that every incident affecting a vendor or professional adviser automatically becomes the registrant’s Item 1.05 event.
* Do not treat this newsletter as EU AI Act guidance; unsanctioned AI appears here only as a potential incident vector inside US securities disclosure.
* Do not publish unsupported universal counts for “all filings through May 2026”—tracker totals vary by methodology.

Human-in-the-loop attestation before executive publication remains the institutional control: materiality is a governed decision, not a scanner alert.

## IV. Verification Protocol

1. Re-read Navient’s Item 1.05 narrative on EDGAR for awareness date (June 8), materiality determination (June 29), filing/signature date (July 2), third-party scope, and financial-impact language. [1]
2. Confirm CareCloud, CB Financial Services, and Amgen EDGAR accession numbers and materiality rationales. [2][3][4]
3. Confirm Form 8-K Item 1.05 instructions: materiality determination without unreasonable delay; four business days thereafter; amendment timing. [8]
4. Confirm Corp Fin’s May 21, 2024 distinction between Item 1.05 and voluntary Item 8.01 disclosure—and that the statement is nonbinding staff guidance. [5]
5. For tracker statistics, cite Debevoise’s period and methodology; do not mix incompatible datasets. [6]
6. Keep DORA, CSRD, CPS 230, and AI Act applicability out of this newsletter’s lead subject.

## Key Takeaways

* 2026 filings show materiality driven by sensitive data, third-party environments, and unauthorized AI use—not only outages.
* The disclosure clock starts at materiality determination; record discovery, determination, filing, and amendments as distinct events.
* Item 106 governance claims should be reconcilable with how the disclosure committee actually works under pressure.
* Voluntary Item 8.01 is not a substitute for Item 1.05 once materiality is determined—and does not authorize unreasonable delay in making that determination.

## V. Sources & Citations

* **[1] Navient Corporation, Form 8-K, Item 1.05, accession no. 0001140361-26-027441, filed July 2, 2026 (EDGAR)**
  https://www.sec.gov/Archives/edgar/data/1593538/000114036126027441/ef20077249_8k.htm
  Date of earliest event reported June 29, 2026. Discloses a third-party law-firm ransomware incident; awareness June 8, 2026; materiality determination June 29, 2026 based on volume and sensitivity of borrower data; no identified access to company systems and no operational disruption reported; signed July 2, 2026. Retrieved 2026-08-04.

* **[2] CareCloud, Inc., Form 8-K, Item 1.05, accession no. 0001493152-26-013239, filed March 27, 2026 (EDGAR)**
  https://www.sec.gov/Archives/edgar/data/1582982/000149315226013239/form8-k.htm
  Approximately eight-hour disruption March 16, 2026 to one of six EHR environments; materiality determination March 24 based on sensitivity of potentially affected patient information and related consequences; amendment commitment for unavailable Item 1.05 information. Retrieved 2026-08-04.

* **[3] CB Financial Services, Inc., Form 8-K, Item 1.05, accession no. 0001605301-26-000021, signed May 11, 2026 (EDGAR)**
  https://www.sec.gov/Archives/edgar/data/1605301/000160530126000021/cbfv-20260507.htm
  Awareness May 5, 2026 of unauthorized AI application handling non-public customer information; materiality determination May 7 based on volume and sensitivity (names, SSNs, dates of birth); no operational disruption; no expected material financial-condition or results impact. Retrieved 2026-08-04.

* **[4] Amgen Inc., Form 8-K, Item 1.05, accession no. 0000318154-26-000119, filed July 31, 2026 (EDGAR)**
  https://www.sec.gov/Archives/edgar/data/318154/000031815426000119/amgn-20260729.htm
  Unauthorized activity and data exfiltration from third-party-hosted cloud environments; materiality determination July 29 based on apparent file volume and potential sensitivity; no identified impact on products, manufacturing, financial-reporting systems, or ability to meet patient needs. Retrieved 2026-08-04.

* **[5] SEC Division of Corporation Finance, *Disclosure of Cybersecurity Incidents Determined To Be Material and Other Cybersecurity Incidents* (staff statement, May 21, 2024)**
  https://www.sec.gov/newsroom/speeches-statements/gerding-cybersecurity-incidents-05212024
  Staff guidance distinguishing Item 1.05 (material incidents) from voluntary disclosure under other Items such as Item 8.01; expressly not a Commission rule and without independent legal force. Retrieved 2026-08-04.

* **[6] Debevoise Data Blog, *Cybersecurity Incident Disclosure: Form 8-K Tracker (Two-Year Update)* (May 21, 2026)**
  https://www.debevoisedatablog.com/2026/05/21/cybersecurity-incident-disclosure-form-8-k-tracker-two-year-update/
  Secondary tracker: during the two years after Corp Fin’s May 2024 guidance, more issuers used Item 8.01 than Item 1.05, and most Item 8.01 disclosures did not later produce an Item 1.05 filing. Cite with period and methodology. Retrieved 2026-08-04.

* **[7] 17 C.F.R. § 229.106 (Item 106) Cybersecurity**
  https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.100/section-229.106
  Definitions (including electronic information resources owned or used by the registrant), third-party-risk processes, board oversight, and management responsibilities for annual cybersecurity disclosure. Retrieved 2026-08-04.

* **[8] U.S. Securities and Exchange Commission, Form 8-K (current), Item 1.05 and instructions**
  https://www.sec.gov/files/form8-k.pdf
  Controlling filing content, materiality determination without unreasonable delay, four-business-day filing period, and amendment timing. Retrieved 2026-08-04.

* **[9] Cybersecurity Risk Management, Strategy, Governance, and Incident Disclosure, 88 Fed. Reg. 51896 (Aug. 4, 2023)**
  https://www.federalregister.gov/documents/2023/08/04/2023-16194/cybersecurity-risk-management-strategy-governance-and-incident-disclosure
  Adopting release: materiality rationale (quantitative and qualitative factors), Item 106 design choices, and what the Commission adopted or rejected (including frequency-of-discussion disclosure). Retrieved 2026-08-04.
