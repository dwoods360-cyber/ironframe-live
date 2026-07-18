---
status: "PUBLISHED"
classification: "Institutional Governance"
documentId: "GF-OPS-001"
title: "Governance Frame Operating Outline"
publisher: "Governance Frame Research"
---

# Governance Frame Operating Outline

Preserved operating model for Governance Frame Research: roles, tools, and cadence.

Companion documents:

- [`what-governance-frame-is.md`](./what-governance-frame-is.md) — mission and identity
- [`editorial-standards.md`](./editorial-standards.md) — binding editorial standards §§1–20

**Core cadence:** Plan quarterly, research and publish monthly, review weekly, verify every claim, and require human approval before release.

## Simplified operating model

```
Founder / Publisher
Sets direction and protects independence
        ↓
Executive Intelligence Unit
Researches and drafts
        ↓
Source Verification Reviewer
Confirms claims and citations
        ↓
Research Editor
Refines structure, tone, and classification
        ↓
Regulatory and Product-Boundary Review
Checks legal precision and commercial separation
        ↓
Operator / Editorial Board
Approve, Hold, or Deny
        ↓
Governance Frame
Publishes and maintains the record
```

---

## 1. Roles

### Publisher / Founder

Responsible for:

- setting the research agenda;
- approving major themes;
- protecting Governance Frame’s independence from Ironframe marketing;
- making final publish, hold, or deny decisions;
- approving corrections and major revisions;
- representing Governance Frame publicly.

The founder is not expected to personally perform every research task, but remains accountable for institutional direction.

### Executive Intelligence Unit

Acts as the primary research and drafting function.

Responsible for:

- topic research;
- source collection;
- synthesis;
- initial manuscript drafting;
- citation mapping;
- maintaining the reference and source-verification ledgers;
- distinguishing evidence from interpretation;
- preparing executive summaries and briefings.

It may use AI-assisted drafting, but it cannot treat AI output as verified evidence.

### Research Editor

Responsible for:

- structure;
- clarity;
- tone;
- duplication control;
- consistency across publications;
- ensuring the work remains vendor-neutral;
- checking whether the title accurately reflects the scope;
- deciding whether a piece is a research paper, briefing, newsletter, or executive story.

The editor also checks whether a shorter brief improperly competes with a formal research paper.

### Source Verification Reviewer

Responsible for:

- opening and inspecting every material source;
- confirming that each citation supports the exact claim;
- identifying whether a source is primary, secondary, professional guidance, commentary, or internal product material;
- verifying dates, figures, titles, authors, and legal status;
- marking claims Verified, Unverified, Qualified, Out of Scope, or Unsupported;
- documenting limitations and date sensitivity.

This role is separate from the initial drafter where practical.

### Regulatory / Legal-Scope Reviewer

Responsible for checking:

- final rule versus proposal;
- law versus guidance;
- binding requirement versus voluntary framework;
- effective dates;
- jurisdiction;
- covered entities;
- legal roles such as provider, deployer, controller, processor, registrant, and covered entity;
- whether allegations are being confused with adjudicated findings;
- whether a statement requires counsel review.

This role does not provide legal advice. It ensures editorial precision.

### Product Boundary Reviewer

Used whenever Ironframe or another commercial product appears.

Responsible for confirming:

- product facts come from authoritative product documentation;
- no unsupported certification claims are made;
- product architecture is not presented as regulatory language;
- Ironframe is described only as one possible implementation;
- sales language is kept out of Governance Frame research;
- product examples are clearly separated from research findings.

### Editorial Review Board / Operator

Responsible for the final workflow decision:

- **Approve** — move into the published Governance Frame system;
- **Hold** — retain in quarantine for revision or later review;
- **Deny** — reject the draft and prevent publication.

Automated checks do not replace this decision.

### Corrections and Revision Owner

Responsible for:

- recording material corrections;
- maintaining revision history;
- documenting replaced sources;
- preserving the reason for removing or changing a claim;
- distinguishing minor copy edits from substantive corrections;
- ensuring published changes remain auditable.

---

## 2. Tools

### Canonical repository

The repository is the source of truth.

Primary location:

- `docs/governance-frame/`

Formal research papers:

- `docs/governance-frame/research-papers/`

Briefing packages:

- `docs/governance-frame/briefings/`

Newsletter packages:

- `docs/governance-frame/newsletters/`

The repository version remains authoritative over Google Docs or rendered copies.

### Quarantine desk

Drafts awaiting operator action are staged under:

- `docs/briefing-queue/`

Typical metadata:

- `status: QUARANTINED_DRAFT`
- `publishState: QUARANTINED_AWAITING_OPERATOR`

The quarantine desk supports:

- Approve;
- Hold;
- Deny.

Queue presence does not mean publication.

### Postgres publication datastore

The authoritative application publication status is stored in:

- `published_briefings`

Supporting workflow overlays include:

- `briefing_queue_holds`
- `briefing_queue_denials`

A published Postgres record means the piece has been promoted into the public application.

### Operational Markdown mirrors

Published Markdown copies may remain under:

- `docs/published-briefings/`

These support:

- RSS;
- Ironcast;
- operational helpers;
- downstream rendering.

They are mirrors of published content, not the authoritative approval record.

### Google Docs editorial workspace

Used for:

- collaborative review;
- visual formatting;
- editorial comments;
- executive reading;
- external review copies.

For GF-2026-001, the package includes:

- Master Manuscript;
- Reference Ledger;
- Source Verification Ledger;
- Revision History;
- Editorial Review Notes.

Google Docs synchronization does not itself constitute publication.

### Source ledger

Tracks:

- claim ID;
- claim;
- source;
- source type;
- verification status;
- exact support;
- limitations;
- date sensitivity;
- reviewer notes.

### Reference ledger

Tracks the formal bibliography and publication details.

### Revision history

Tracks:

- substantive changes;
- corrected figures;
- changed sources;
- removed claims;
- title or classification changes;
- publication-status changes.

### Editorial review notes

Used for:

- structural issues;
- tone concerns;
- source concerns;
- unresolved questions;
- publication recommendations;
- operator decisions.

### Validation tools

The workflow includes:

- Markdown validation;
- heading and structure checks;
- link checks;
- citation checks;
- package-completeness checks;
- duplicate-content checks;
- placeholder searches;
- Google Docs rendering checks;
- API verification;
- Git diff review;
- tests for the publishing utility.

Typical searches include:

- `TODO`
- `TBD`
- `Draft pending`
- `unsupported claim`
- `missing metadata`
- `broken reference`
- `duplicate heading`

### AI tools

AI may assist with:

- research organization;
- outlining;
- synthesis;
- first-draft generation;
- rewriting;
- comparison;
- consistency review.

AI may not independently:

- verify a source;
- approve publication;
- make a legal determination;
- create unsupported facts;
- invent citations;
- authorize public release.

---

## 3. Cadence

### Annual cadence

#### Annual research agenda

Set once per year.

Defines:

- major research themes;
- planned institutional papers;
- priority jurisdictions;
- regulatory areas;
- executive-education themes;
- recurring series.

#### Annual editorial review

Reviews:

- whether Governance Frame remains vendor-neutral;
- whether Ironframe influence is properly disclosed;
- citation and correction performance;
- audience development;
- research gaps;
- methodology improvements.

#### Annual industry report

A larger synthesis may be published once per year, drawing together:

- regulatory developments;
- persistent governance failures;
- evidence trends;
- executive accountability;
- operational-resilience lessons.

### Quarterly cadence

A quarterly planning cycle establishes:

- one or more briefing topics;
- newsletter topics;
- executive-story themes;
- regulatory calendar;
- source-verification priorities;
- publication dates;
- responsible reviewers.

The June–August slate was treated as one coordinated quarterly-series plan, even though the issues were released monthly.

Quarterly review should include:

- what was approved;
- what remained on hold;
- what was denied;
- corrections issued;
- audience response;
- upcoming regulatory dates;
- duplication across content pillars.

### Monthly cadence

Recommended monthly output:

- one industry briefing;
- one industry newsletter;
- optionally one executive story or video adaptation.

The briefing should be durable and narrowly focused.

The newsletter should be time-sensitive and explain current developments through governance rather than simply repeat headlines.

Each month should have distinct subject ownership so the briefing and newsletter do not share the same lead topic.

### Weekly cadence

A practical weekly editorial cycle:

**Week 1 — Research and scoping**

- define the question;
- establish scope;
- identify primary sources;
- prepare initial claim map;
- identify legal and date-sensitive issues.

**Week 2 — Drafting**

- prepare the manuscript;
- populate references;
- create source-ledger entries;
- label fact, interpretation, recommendation, and illustration.

**Week 3 — Verification and editorial review**

- inspect all sources;
- validate claims;
- correct figures;
- check tone and neutrality;
- perform product-boundary review;
- resolve duplication.

**Week 4 — Operator review and publication**

- approve, hold, or deny;
- synchronize editorial copies;
- publish approved content;
- prepare newsletter, story, video, or social derivatives;
- record revision and publication metadata.

### Per-publication cadence

Every publication follows this sequence:

```
Topic selection
        ↓
Research plan
        ↓
Primary-source collection
        ↓
Initial draft
        ↓
Source ledger
        ↓
Citation verification
        ↓
Regulatory-scope review
        ↓
Editorial review
        ↓
Product-boundary review, if needed
        ↓
Quarantine
        ↓
Approve / Hold / Deny
        ↓
Publication
        ↓
Corrections and revision monitoring
```

### Post-publication cadence

After publication:

- monitor cited rules, cases, and guidance;
- check for changed legal status;
- update time-sensitive dates;
- issue corrections when necessary;
- review reader questions;
- record material revisions;
- reassess older publications on a defined schedule.

Time-sensitive newsletters may require review within months.

Durable research papers may receive scheduled annual or event-triggered review.
