---
status: "PUBLISHED"
classification: "Institutional Governance"
documentId: "GF-OPS-DESK-001"
title: "Governance Frame Publication Desk Agents"
publisher: "Governance Frame Research"
---

# Governance Frame Publication Desk Agents

Implementation of the roles in [`operating-outline.md`](./operating-outline.md) (GF-OPS-001).

## Agent IDs

| Agent ID | Charter role | Queue write | Promote |
|---|---|---|---|
| `gf-researcher` | Executive Intelligence Unit | yes (stage) | never |
| `gf-editor` | Research Editor | annotate / optional revise | never |
| `gf-verifier` | Source Verification Reviewer | desk review only | never |
| `gf-regulatory-reviewer` | Regulatory / Legal-Scope Reviewer | desk review only | never |
| `gf-product-boundary` | Product Boundary Reviewer | desk review only | never |
| `gf-operator` | Editorial Review Board (advisory) | desk review only | never |

**Publisher / Founder** remains human: Ops Hub Approve / Hold / Deny only.

## Surfaces

- Core: `app/lib/server/governanceFramePublicationDeskCore.ts`
- Roster: `lib/governanceFrame/publicationDesk/`
- Operator API: `POST /api/admin/operations-hub/briefings/desk-run`
- UI: Ops Hub → Briefings → “Governance Frame publication desk”
- Sidecars: `docs/briefing-queue/.desk-reviews/*.desk.json`

## Invariants

1. Desk agents may stage quarantine drafts and write advisory checklists.
2. Desk agents must never call promote, deny, or syndication APIs.
3. `readyForHumanOperator` is a soft UX signal — hard gates remain `promoteBriefingDraftCore`.
4. AI-assisted researcher output is never treated as verified evidence.
5. Editorial standards GF-STANDARDS-001 bind every desk pass.
