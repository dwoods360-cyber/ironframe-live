---
title: "Industry Research Brief — Current GRC Pain Points and Control-First Alleviation Paths"
publishedAt: "2026-07-15T12:00:00.000Z"
published: "2026-07-15"
summary: "Organisations continue to face control risks when evidence is manually assembled, risk estimates conceal uncertainty, external data enters trusted workflows without validation, tenant boundaries depend only on application conventions, or AI-generated content is used without risk-appropriate review. This brief maps five current GRC pain themes to enforceable, testable alleviation requirements—correcting prior misattributions of SolarWinds and SOX 404 figures and refusing incomparable financial aggregation. Information reviewed through August 4, 2026."
classification: "Institutional Governance"
author: "Ironframe Governance Frame"
publishedBy: "54aac838-9094-4de5-ac24-993672505cbc"
---

> **Executive Summary:** Organisations continue to face control risks when evidence is manually assembled, risk estimates conceal uncertainty, external data enters trusted workflows without validation, tenant boundaries depend only on application conventions, or AI-generated content is used without risk-appropriate review. Published research supports concerns about spreadsheet lifecycle controls, evidence traceability, cybersecurity governance, tenant isolation and AI oversight, but it does not establish that every organisation requires exact-dollar risk values, physically separate tenant databases or one universal human-approval design. A control-first approach should require traceable evidence, decision-useful risk estimates, provenance-aware ingest, enforceable and tested isolation, and approval controls proportionate to the consequence of each output.
>
> *Information reviewed through August 4, 2026. Revised after quantitative and standards attribution review.*

## I. Exposure Vector — Current Industry Pain

The recursive GRC problem is not that organisations lack written policies. It is that material governance claims are often unsupported by controls that are enforceable, testable, attributable, version-bound and reconstructable. Five current exposures recur across regulated practice.

### Pain 1 — Evidence fragmentation and spreadsheet governance

Control owners still re-key evidence from SIEM, ticketing, cloud consoles and email into spreadsheets and shared folders. Peer-reviewed spreadsheet-control literature identifies documented risks in version control, access, change management, review and reproducibility. A 2010 *Communications of the Association for Information Systems* article addresses gaps in the design and implementation of spreadsheet controls under regulatory pressure. Later EuSpRIG research addresses spreadsheet change review, versioning, access, documentation and lifecycle controls. [1][2][14]

Those studies are principally from **2010–2012** and focus on financial-reporting or large-organisation spreadsheet risk. They do **not** establish that mid-market operators, MSSPs and multi-entity portfolios “still lose board time” as a measured 2026 prevalence finding, nor that audit failure today generally results from disconnected GRC evidence rather than other causes.

**Supported claim:** Spreadsheet-based evidence handling creates documented risks involving version control, access, change management, review and reproducibility. Those risks become more significant where organisations manually assemble evidence from multiple systems for audit, compliance or board reporting.

“Last-minute audit theater” remains usable as editorial language for the failure mode; it is not presented here as a survey-backed research conclusion.

### Pain 2 — Qualitative heatmaps versus decision-useful quantification

NIST CSF 2.0 places cybersecurity governance within broader enterprise-risk-management context. Its GOVERN function addresses organisational context, strategy, roles, policies, oversight and supply-chain risk. [7]

That does **not** establish that “risk registers that cannot speak in exact dollars are treated as theater,” or that every risk must be expressed in whole dollars. NIST SP 800-30 cautions that risk assessments are often not precise instruments. Current NIST IR 8286A guidance supports estimating likelihood and impact according to available information, risk appetite and decision context rather than demanding unsupported point estimates. [3][15]

Public enforcement and settlement examples show that control and disclosure failures can carry material financial consequences (see Section II). Monetary ranges can improve investment and risk-treatment decisions when inputs are reliable—but boards also need uncertainty, assumptions, confidence levels, scenario boundaries and non-financial impacts.

**Board-useful consequence:** Purely qualitative heatmaps may be inadequate for investment and risk-treatment decisions. Where reliable inputs exist, organisations should supplement qualitative ratings with monetary ranges, operational-impact measures and documented assumptions rather than presenting unsupported exact-dollar precision.

### Pain 3 — Connector ingest without provenance

First-generation GRC automation popularized API “connector counts” as a market proxy for control maturity. That industry-history claim is plausible commentary; the sources in this brief do **not** verify it as a measured industry-wide finding. Treat it as market observation, not as established historical fact.

The control principle is nonetheless defensible. NIST SP 800-53 supports access enforcement, information-flow enforcement, input validation, auditability and system-integrity controls. It does not universally require every connector payload to be rejected before any form of persistence. [4]

In some defensible architectures, untrusted source data is first preserved in an isolated, immutable quarantine store for investigation and provenance, then blocked from trusted records, calculations and workflows until validation succeeds.

**Control objective:** Receive untrusted data into an isolated quarantine boundary; verify source, integrity, schema, scope and policy compliance; and prohibit promotion into trusted evidence or decision workflows until validation succeeds.

Where multi-entity segregation is required by a particular statute, contract or supervisory instruction, cite that authority directly. This brief does not claim a universal NYDFS / Safeguards physical-database mandate from the sources below.

### Pain 4 — Multi-tenant and multi-entity isolation

Holding companies, MSSPs, utilities and healthcare networks need enforceable boundaries per legal entity or client. A tenant identifier or workspace tag is **not**, by itself, an isolation control. That part of the prior draft was correct.

The prior draft then overstated the case by implying that shared-schema architecture is inherently cosmetic. Microsoft documents row-level security as a mechanism that can enforce tenant-level isolation inside shared tables and databases, and explains trade-offs among pooled, sharded and database-per-tenant models. [5]

The correct distinction is not “shared schema versus secure architecture.” It is **application-convention filtering versus centrally enforced and tested isolation**.

**Supported claim:** Shared-schema architectures can provide enforceable logical isolation when tenant context is securely propagated and database-level policies—such as row-level security—are centrally enforced, deny by default, tested for bypass conditions and continuously monitored. Separate schemas, databases, accounts or deployments may be appropriate where contractual, regulatory, encryption, recovery or customer-isolation requirements demand stronger boundaries.

Do not claim that regulators universally require a separate physical database for each client or legal entity unless a particular regulation, contract or supervisory instruction establishes that requirement.

### Pain 5 — AI assistance inside control workflows

NIST’s AI Risk Management Framework is voluntary, non-sector-specific and use-case agnostic. Its Generative AI Profile supports governance, documentation, evaluation, monitoring, provenance and risk-appropriate human oversight. The necessary form of human oversight varies by system and use case. [12][13]

Neither the NIST AI RMF nor NIST AI 600-1 universally mandates “temperature locks,” checkpointed state, prohibition of all automatic sending, human approval of every AI output, or one prescribed HITL workflow. Temperature is a model-generation parameter, not a complete safety or governance control.

DORA requires covered financial entities to manage ICT risk, incidents, resilience testing and third-party ICT dependencies. It has applied since 17 January 2025. DORA does **not** specifically require human attestation for AI-generated board language. Treating “the model said so” as an inadequate control narrative for covered ICT risk is a reasonable **inference** from DORA’s resilience and accountability posture—not a quoted DORA AI rule. [8]

**Control-first architectural position (Ironframe doctrine, not a universal NIST/DORA mandate):** Generative AI used in evidence, remediation, compliance or executive-reporting workflows should be governed according to the consequence of the output. Controls may include approved models and use cases, retrieval provenance, testing, content-version binding, access restrictions, monitoring and human approval before high-impact decisions or external publication. “HITL before external publication” is identified here as that architectural position.

## II. Quantitative Context — Illustrative Public Examples (Not Additive)

The following examples illustrate that control, disclosure and breach-related failures can carry material financial consequences. **Amounts are not comparable and must not be aggregated.** They differ by period, entity size, legal authority, conduct, remedy and methodology. They do not estimate any organisation’s expected loss, annualised loss expectancy, regulatory ceiling or mid-market baseline.

| Public example | Verified amount | Correct classification |
| -------------- | -------------- | ---------------------- |
| ICE Regulation SCI matter (2024) | $10 million | SEC civil penalty for Regulation SCI **notification** failures—not Form 8-K Item 1.05 [6] |
| R.R. Donnelley cyber-controls matter (2024) | More than $2.1 million ($2.125 million civil penalty) | SEC settlement involving disclosure-control and internal-control charges [16] |
| Blackbaud ransomware-disclosure matter (2023) | $3 million | SEC civil penalty for misleading ransomware disclosures and related disclosure-control failures [17] |
| Equifax breach settlement (2019) | At least $575 million; potentially up to $700 million | Global FTC/CFPB/state settlement including consumer relief, governmental payments and conduct provisions—not simply an FTC “fine” [9] |
| SEC 2009 SOX 404 study — surveyed 404(b) companies | Mean total Section 404 compliance cost declined from $2.87 million to $2.33 million after 2007 reforms; expected mean $2.03 million | Historical survey-based compliance-cost estimate [10] |
| SEC 2009 SOX 404 study — filers with public float below $75 million | Mean approximately $769,000 → $690,000; median approximately $579,000 → $439,000 (differences not statistically significant) | Historical smaller-filer result; not a $4.36 million mid-market baseline [10] |

**Removed / corrected claims**

* **SolarWinds $26 million as an SEC penalty:** Incorrect. SEC Press Release 2023-227 announced a civil complaint seeking injunctions, disgorgement and civil penalties; it did not announce a $26 million SEC penalty. A reported ~$26 million figure belongs to a separate private securities class-action settlement context and must not be attributed to PR 2023-227. The SEC later dismissed remaining civil enforcement against SolarWinds and its CISO with prejudice (November 20, 2025). Do not use SolarWinds as an SEC-penalty baseline in this table. [11][18][19]
* **$4.36 million SOX 404 “illustrative mid-market” figure attributed to the 2009 SEC study:** Not found in that study. Use the study’s reported means/medians above, or omit. [10]
* **Combined “pressure boundary” totals:** Deleted. Adding ICE + SolarWinds + Equifax + SOX cost estimates has no defensible analytical meaning.

These examples support board attention to control architecture. They do **not** require every risk register cell to display an unsupported exact whole-dollar value.

## III. What Modern GRC Must Enforce

### Requirement map

| What operators still encounter | Control-first alleviation requirement |
| ------------------------------ | ------------------------------------- |
| Spreadsheet evidence assembly | Sealable evidence artifacts and audit receipts before trusted mutation; version, access and change controls for any spreadsheet remaining in the chain [1][2][14] |
| Heatmap-only risk | Decision-useful quantitative exposure estimates, including monetary **ranges** where supportable, with assumptions and uncertainty recorded [3][7][15] |
| Unverified connector / ingest | Receive untrusted data into an isolated quarantine boundary; verify source, integrity, schema, scope and policy; prohibit promotion into trusted evidence or decision workflows until validation succeeds [4] |
| Cosmetic multi-tenancy | Isolation enforced at every applicable authorization, query, storage, cache, export, background-job and recovery boundary—whether via tested RLS in a shared schema or stronger physical/logical separation where required [5] |
| Unbounded AI drafts | Consequence-proportionate AI governance: approved use cases, provenance, testing, version binding, monitoring, and human approval before high-impact or external publication (Ironframe architectural position) [12][13] |

### Evidence-bearing publication gate (illustrative)

Four mutable Booleans do not prove the controls the doctrine claims. A publication check should validate **evidence-bearing records**, for example:

```typescript
// Illustrative — evidence-bearing gate, not four loose truth values
export type ExposureEstimate = {
  currency: "USD"; // ISO 4217
  minorUnits: bigint; // integer minor units — never IEEE float
  rangeLowMinorUnits?: bigint;
  rangeHighMinorUnits?: bigint;
  valuationDate: string; // ISO date
  methodologyId: string;
  sourceRefs: string[];
  uncertaintyNote: string;
  approvalStatus: "draft" | "approved";
  calculationVersion: string;
};

export type IngressValidationReceipt = {
  payloadHash: string; // cryptographic hash of the inspected payload
  policyId: string;
  policyVersion: string;
  validatedAt: string; // ISO timestamp
  validatorId: string;
  disposition: "quarantined" | "rejected" | "promoted";
};

export type IsolationContext = {
  workspaceId: string;
  principalId: string;
  enforcementPath: Array<
    "authz" | "query" | "storage" | "cache" | "export" | "job" | "recovery"
  >;
};

export type HumanAttestation = {
  approverId: string;
  role: string;
  attestedAt: string;
  artifactHash: string;
  evidenceSnapshotId: string;
  scope: string;
};

export type PainAlleviationGate = {
  exposure: ExposureEstimate;
  ingress: IngressValidationReceipt;
  isolation: IsolationContext;
  attestation: HumanAttestation;
};

export function canPublishBoardArtifact(g: PainAlleviationGate): boolean {
  return (
    g.exposure.approvalStatus === "approved" &&
    g.exposure.minorUnits >= 0n &&
    g.ingress.disposition === "promoted" &&
    g.isolation.workspaceId.length > 0 &&
    g.isolation.principalId.length > 0 &&
    g.isolation.enforcementPath.length > 0 &&
    g.attestation.artifactHash.length > 0 &&
    g.attestation.approverId.length > 0
  );
}
```

**Architectural checklist**

- [ ] Board exposure displays bind to approved estimates with methodology, sources and uncertainty—not unsupported point precision
- [ ] External intel / evidence fails closed for *trusted* promotion until quarantine validation succeeds (immutable quarantine storage may still retain the raw payload)
- [ ] Isolation is enforced server-side against the authenticated principal across query, storage, cache, export, jobs and recovery—not by a nonempty workspace string alone
- [ ] High-impact remediation / board drafts remain approval-queued; material post-approval changes invalidate prior attestation
- [ ] Public briefings promote only after human attestation bound to artifact hash and evidence snapshot

### Do not overclaim

* Do not treat 2010–2012 spreadsheet studies as a 2026 prevalence survey of mid-market / MSSP board time loss.
* Do not require exact whole-dollar risk values as a universal NIST mandate.
* Do not treat shared-schema tenancy as inherently indefensible.
* Do not attribute temperature locks or universal HITL workflows to NIST AI RMF, NIST AI 600-1, or DORA.
* Do not aggregate incomparable enforcement, settlement and compliance-cost figures into a “pressure boundary.”
* Do not cite generic COSO / OCEG / COBIT homepages for specific propositions without edition and component.
* Remove undeveloped “ESG proxy theater / kWh” claims until separately sourced.

## IV. Verification Protocol

1. Walk each Pain 1–5 claim to Section V; reject promotion if a prevalence or mandate claim lacks a matching citation.
2. Re-open each monetary figure in Section II against the linked primary source; refuse SolarWinds-$26M-as-SEC-penalty and $4.36M-as-SEC-2009-study attributions.
3. Confirm Section III gates validate evidence-bearing records—not four mutable Booleans.
4. Keep product / brand claims out of the body; this brief is industry research only.
5. Identify Ironframe architectural positions explicitly where they exceed cited standards.

## V. Sources & Citations

* **[1] Leon, L. A., Abraham, D. M., & Kalbers, L. (2010). *Beyond Regulatory Compliance for Spreadsheet Controls: A Tutorial to Assist Practitioners and a Call for Research*.** *Communications of the Association for Information Systems*, 27, Article 28.
  https://doi.org/10.17705/1cais.02728
  Peer-reviewed treatment of spreadsheet control design and implementation gaps. Retrieved 2026-08-04.

* **[2] Ferreira, M. A., & Visser, J. (2012). *Governance of Spreadsheets through Spreadsheet Change Reviews* (EuSpRIG 2012).**
  https://eusprig.org/wp-content/uploads/1211.7100.pdf
  Spreadsheet change review, versioning and auditability methods. Retrieved 2026-08-04.

* **[3] NIST SP 800-30 Rev. 1 — *Guide for Conducting Risk Assessments*.**
  https://www.nist.gov/publications/guide-conducting-risk-assessments
  Risk assessments are often not precise instruments; estimation should match available information and decision context. Retrieved 2026-08-04.

* **[4] NIST SP 800-53 Rev. 5 — *Security and Privacy Controls for Information Systems and Organizations*.**
  https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
  Access enforcement, information-flow enforcement, input validation, audit and integrity controls relevant to ingest provenance. Retrieved 2026-08-04.

* **[5] Microsoft Learn — *Multitenant SaaS database tenancy patterns* (Azure SQL).**
  https://learn.microsoft.com/en-us/azure/azure-sql/database/saas-tenancy-app-design-patterns
  Documents pooled / shared-schema, sharded and database-per-tenant patterns and row-level security as an isolation mechanism, with trade-offs. Retrieved 2026-08-04.

* **[6] SEC Press Release 2024-63 — ICE / Regulation SCI ($10 million).**
  https://www.sec.gov/newsroom/press-releases/2024-63
  ICE agreed to pay a $10 million civil penalty for causing Regulation SCI notification failures at nine subsidiaries, including NYSE. Retrieved 2026-08-04.

* **[7] NIST — *The NIST Cybersecurity Framework (CSF) 2.0* (NIST CSWP 29).**
  https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf
  GOVERN function: organisational context, strategy, roles, policies, oversight and supply-chain risk within ERM. Retrieved 2026-08-04.

* **[8] EIOPA — *Digital Operational Resilience Act (DORA)*.**
  https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en
  Scope and principal ICT-risk, incident, testing and third-party obligations for covered entities; applied since 17 January 2025. Does not prescribe the draft’s specific AI attestation workflow. Retrieved 2026-08-04.

* **[9] FTC — *Equifax to Pay $575 Million as Part of Settlement with FTC, CFPB, and States* (July 22, 2019).**
  https://www.ftc.gov/news-events/news/press-releases/2019/07/equifax-pay-575-million-part-settlement-ftc-cfpb-states-related-2017-data-breach
  Global settlement of at least $575 million and potentially up to $700 million, including consumer relief and governmental payments. Retrieved 2026-08-04.

* **[10] SEC — *Study of the Sarbanes-Oxley Act of 2002 Section 404 Internal Control over Financial Reporting Requirements* (2009).**
  https://www.sec.gov/news/studies/2009/sox-404_study.pdf
  Mean 404(b) compliance cost $2.87M → $2.33M post-reform; expected mean $2.03M; smaller-filer means/medians as tabulated above; no $4.36M figure located. Retrieved 2026-08-04.

* **[11] SEC Press Release 2023-227 — SolarWinds and CISO complaint.**
  https://www.sec.gov/newsroom/press-releases/2023-227
  Civil complaint seeking injunctive relief, disgorgement and civil penalties; **does not** announce a $26 million SEC penalty or settlement. Retrieved 2026-08-04.

* **[12] NIST — *Artificial Intelligence Risk Management Framework (AI RMF 1.0)*.**
  https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10
  Voluntary, use-case-agnostic AI risk-management framework. Retrieved 2026-08-04.

* **[13] NIST AI 600-1 — *Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile* (July 2024).**
  https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
  Generative-AI risks and govern/map/measure/manage actions; oversight form varies by use case. Retrieved 2026-08-04.

* **[14] Spreadsheet risk-governance scholarship (additional EuSpRIG / governance literature).**
  https://doi.org/10.22495/rgcv4i2art1
  Governance of spreadsheet risk; change, access and version-management difficulty. Retrieved 2026-08-04.

* **[15] NIST IR 8286A — integrating cybersecurity risk into enterprise risk management (impact/likelihood estimation guidance lineage).**
  https://www.nist.gov/publications/guide-conducting-risk-assessments
  Use with SP 800-30: estimate according to available information, appetite and decision context rather than unsupported point precision. Retrieved 2026-08-04.

* **[16] SEC Press Release 2024-75 — R.R. Donnelley & Sons Co.**
  https://www.sec.gov/newsroom/press-releases/2024-75
  Settled disclosure and internal-control charges relating to cybersecurity incidents/alerts; civil penalty of $2.125 million. Retrieved 2026-08-04.

* **[17] SEC Press Release 2023-48 — Blackbaud Inc.**
  https://www.sec.gov/newsroom/press-releases/2023-48
  $3 million civil penalty for misleading ransomware disclosures and related disclosure-control failures. Retrieved 2026-08-04.

* **[18] SolarWinds Form 10-Q (period including class-action settlement reporting).**
  https://www.sec.gov/Archives/edgar/data/1739942/000173994224000096/swi-20240630.htm
  Context for private class-action settlement reporting distinct from SEC PR 2023-227. Retrieved 2026-08-04.

* **[19] SEC Litigation Release LR-26423 — SolarWinds Corp. and Timothy G. Brown.**
  https://www.sec.gov/enforcement-litigation/litigation-releases/lr-26423
  Remaining civil enforcement dismissed with prejudice (November 20, 2025). Retrieved 2026-08-04.

**Research posture:** Independent industry synthesis bounded to cited public, academic and standards-body sources. Not a peer-reviewed academic publication. SecurEnds-style vendor blogs are omitted as principal support. Generic COSO / OCEG / COBIT homepages are omitted until a specific edition and proposition are cited. Internal companion drafts are not used as external corroboration.
