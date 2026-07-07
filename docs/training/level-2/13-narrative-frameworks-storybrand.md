# Chapter 13 — Narrative Frameworks for Technical Documentation

> **Track:** LEVEL_2 · **Author agent:** board-writer · **Release:** `v0.1.0-ga-epic17`
> **Target length:** ~1600 words · **Primary route:** `/docs/training/level2-practitioner-index`

## Learning objectives

After completing this chapter, you will apply StoryBrand and Made to Stick **structure** to Level 2 technical documentation — architecture runbooks, API contracts, and security controls — without producing marketing or sales copy.

## Writer agent boundary

board-writer **may** use narrative frameworks to improve practitioner comprehension. board-writer **must not**:

- Draft website hero lines, LinkedIn campaigns, or Governance Frame briefings
- Assert market leadership or competitive superiority
- Invent endpoints, schema fields, or agent indices not in grounding context

## StoryBrand structure for technical chapters

Apply SB7 as **documentation architecture**, not advertising:

| SB7 element | Technical doc equivalent |
|-------------|-------------------------|
| Character | Practitioner (security engineer, GRC analyst) |
| Problem | Operational risk: misconfigured ingress, audit export gaps |
| Guide | This handbook + cited `docs/TAS.md` anchors |
| Plan | Numbered lab steps with routes and feature IDs |
| CTA | "Proceed to Chapter N" or "Run verification test X" |
| Failure | Documented fail-closed behaviors (502 bridge, quarantine) |
| Success | Verification checklist passed with citations |

### Section template

```markdown
## Problem statement
[One paragraph: what breaks if this control is skipped]

## Prerequisites
[Routes, roles, env vars — cite slug]

## Procedure
1. ...
2. ...

## Verification
- [ ] Criterion tied to test file or route

## Related sources
- docs/technical/...
```

## Made to Stick for practitioner prose

- **Simple** — one primary objective per chapter
- **Concrete** — BigInt cent strings, route paths, HTTP methods
- **Credible** — cite `sourceAnchors` from training manifest; never float dollars
- **Unexpected** — call out non-obvious fail-closed paths (e.g., CORE_TELEMETRY_DISCONNECTED)

## Influence principles (documentation ethics)

When describing controls, prefer **authority** (TAS, test gates) and **commitment** (checklists operators sign) over hype. Do not use false **scarcity** or fabricated **social proof**.

## One-liner discipline (internal docs only)

Technical one-liner formula: **Failure mode + Corrective workflow + Verification artifact**

> Without Irongate validation, monetary-only sustainability packets are rejected — operators trace POST /api/sustainability/ironbloom in Chapter 7 and confirm 4xx on bad payloads.

## Hands-on lab — restructure a draft section

### Lab 1: Problem-first rewrite

1. Open an existing Level 2 chapter draft (e.g., audit trail exports).
2. Move the **problem statement** above the feature location table.
3. Ensure the first paragraph names the practitioner hero and failure mode.
4. Cite `docs/training/level-2/05-audit-trail-exports.md` as reference shape.

### Lab 2: Citation audit

1. Pick three claims in your draft.
2. Map each to a `sourceAnchors` slug or test file.
3. Remove any claim without grounding — or replace with UNGROUNDED response per writer agent policy.

### Lab 3: Marketing boundary check

1. Search draft for: "best", "leading", "revolutionary", "AI-powered magic"
2. Replace with Shipped / Pilot / Roadmap labels or delete.
3. Confirm no Governance Frame or `/governance-frame` CTAs appear in technical corpus.

## Verification checklist

- [ ] Chapter opens with practitioner problem, not marketing tagline
- [ ] All routes and env vars match grounding context
- [ ] Financial values use whole-integer cent strings only
- [ ] No sales copy or executive board narratives in output
- [ ] Checklist and numbered steps present for labs

## Related documents

- `docs/marketing-strategy/storybrand-framework.md` (structure reference — do not copy consumer-facing copy)
- `docs/marketing-strategy/marketing-strategy-library.md`
- `docs/training/level-2/12-practitioner-certification.md`

## Source anchors

- `docs/marketing-strategy/storybrand-framework.md`
- `app/lib/server/writerAgentConsoleCore.ts`
- `lib/documentationCorpusPlanes.ts`
