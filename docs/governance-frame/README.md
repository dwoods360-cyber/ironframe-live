# Governance Frame

Governance Frame is **not** a software company. It is an independent governance research and executive education organization.

Its mission is to explain why organizations repeatedly fail in the same ways — and how better governance architectures can reduce those failures. Tone: vendor-neutral, research-driven, evidence-based, institutionally credible.

**Charter:** [`charter/what-governance-frame-is.md`](./charter/what-governance-frame-is.md)  
**Editorial standards:** [`charter/editorial-standards.md`](./charter/editorial-standards.md)  
**Operating outline:** [`charter/operating-outline.md`](./charter/operating-outline.md) — roles, tools, cadence

Ironframe should almost never be the subject of Governance Frame articles. Ironframe demonstrates one implementation approach of principles discussed in the research. Editorial independence from product marketing is non-negotiable.

## Public destination

Canonical public site:

- `https://research.ironframegrc.com`

Legacy alias (same publication surface):

- `https://brief.ironframegrc.com`

App Router preview (same content tree):

- `/gf-research`

Recommended public paths:

```
/research-papers/
/briefings/
/newsletters/
/series/
/methodology/
/editorial-standards/
/operating-outline/
/sources-and-corrections/
/about/
```

## Canonical Record

This directory contains the canonical institutional record for:

- research papers;
- industry briefings;
- newsletters;
- editorial policies;
- research methodology;
- citation standards;
- quantitative modeling standards;
- canonical terminology;
- correction history;
- and publication archives.

Application routes, publishing workflows, and generated outputs may exist elsewhere in the repository, but this directory is the authoritative documentation root for Governance Frame.

## Relationship to Ironframe

Governance Frame and Ironframe may share infrastructure, personnel, and subject-matter expertise.

However:

- Governance Frame conclusions must not be determined by Ironframe product requirements.
- Commercial relationships must be disclosed where relevant.
- Regulatory requirements must be distinguished from architectural recommendations.
- Product claims must not be presented as independent research findings.
- Research corrections must be made even when they conflict with a product assumption.

## Publication Classes

Governance Frame publications may include:

1. Executive briefs
2. Industry briefings
3. Research briefs
4. White papers
5. Annual or periodic research reports
6. Newsletters
7. Methodology and standards documents

## Publication Lifecycle

Authoritative roles, tools, and cadence: [`charter/operating-outline.md`](./charter/operating-outline.md).

Status sequence (summary):

1. IDEA
2. OUTLINE
3. RESEARCH
4. QUARANTINED_DRAFT
5. TECHNICAL_REVIEW
6. EDITORIAL_REVIEW
7. LEGAL_REVIEW, where appropriate
8. APPROVED
9. PUBLISHED
10. REVISED, SUPERSEDED, or RETIRED

Nothing should be published directly from an unreviewed draft. Operator Approve / Hold / Deny is required; queue presence is not publication.

## Existing Operational Directories

The following directories remain active operational paths:

- `docs/briefing-queue/`
- `docs/published-briefings/`
- `app/governance-frame/`
- `app/lib/governanceFrame/`
- `app/components/governanceFrame/`
- `Ironboard/src/governanceFrame/`
- `out/governance-frame/`

Do not migrate those directories without a separate reviewed migration plan.

## Research Paper Identifiers

Long-form papers should use stable identifiers such as:

- `GF-2026-001`
- `GF-2026-002`
- `GF-2027-001`

The identifier must remain stable across revisions and export formats.
