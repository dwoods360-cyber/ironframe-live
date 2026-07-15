# Chapter 10 — Human-in-the-Loop Approvals & Email Dispatch

> **Track:** LEVEL_2 · **Reading level:** 11th–12th grade plain English · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/dashboard/admin/approvals` · **Lab IDs:** HITL-001

> **Typical role:** GLOBAL_ADMIN

## Why this chapter matters

Outbound email needs a human decision. The approvals queue lets admins edit, dispatch, or purge drafts.

## Learning objectives

When you finish, you can:

- Open `/dashboard/admin/approvals` as GLOBAL_ADMIN.
- Tell SUPPORT drafts from SALES drafts.
- Describe DISPATCH versus PURGE.

## How to get there

1. Sign in as GLOBAL_ADMIN and open `/dashboard/admin/approvals`.
2. Review the unified queue and `draftKind` badges (SUPPORT vs SALES).
3. Edit proposed reply text in the admin workspace when practicing.
4. DISPATCH with the configured transport (Resend) or PURGE a discarded draft per policy.

## Reference screenshot

![Chapter 10 — Human-in-the-Loop Approvals & Email Dispatch](/docs/training/assets/level-2-10-approvals-human-in-loop.png)

*Captured near `/dashboard/admin/approvals`. Asset: `/docs/training/assets/level-2-10-approvals-human-in-loop.png`.*

source-file: public/docs/training/assets/level-2-10-approvals-human-in-loop.png

## Lab — Approve with eyes open (HITL-001)

1. Find one SUPPORT draft and one SALES draft if both exist.
2. Edit a draft’s text in a lab-safe environment.
3. Write the difference between DISPATCH and PURGE in plain words.
4. Do not dispatch to real customer inboxes unless your trainer says the lab is wired for that.

## Check your understanding

- [ ] I can open the approvals queue.
- [ ] I can read draftKind badges.
- [ ] I know dispatch is a human action.

## Common mistakes

- Dispatching the wrong draftKind email can leak sales copy into support threads.
- Purge is permanent for that draft — confirm before you click.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **HITL** | Human in the loop — a person must approve before send. |
| **DISPATCH** | Send the approved draft through email transport. |
| **PURGE** | Discard the draft without sending. |

## Source anchors

- `docs/TAS.md`
- `docs/technical/architecture-and-api.md`
- `docs/technical/deployment-and-ops.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`

## Next chapter

Continue to [`11-bigint-financial-integrity.md`](./11-bigint-financial-integrity.md).
