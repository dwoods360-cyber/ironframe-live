# Chapter 9 — Sales Agent Portal & Support Workflows

> **Track:** LEVEL_2 · **Reading level:** 11th–12th grade plain English · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/dashboard/support` · **Lab IDs:** SALES-001 / SUPPORT-001

## Why this chapter matters

Sales and support intakes queue work for humans. Public responses must not auto-send pitch text. Support stays tenant-scoped.

## Learning objectives

When you finish, you can:

- Submit or observe a sales lead queue acknowledgment.
- Open `/dashboard/support` for tenant support intake.
- Recognize PENDING DRAFT APPROVAL before send.

## How to get there

1. Submit a lab lead via `/sales-agent-portal` or the documented sales API.
2. Confirm the response is queued (for example `{ status: "QUEUED" }`) with no public pitch body.
3. Open `/dashboard/support` and submit an operator query under the assigned tenant.
4. Confirm CS returns a queued acknowledgment and CRM shows pending draft approval when designed.

## Reference screenshot

![Chapter 9 — Sales Agent Portal & Support Workflows](/docs/training/assets/level-2-09-sales-support-portals.png)

*Captured near `/dashboard/support`. Asset: `/docs/training/assets/level-2-09-sales-support-portals.png`.*

source-file: public/docs/training/assets/level-2-09-sales-support-portals.png

## Lab — Queue, do not auto-send (SALES-001 / SUPPORT-001)

1. Capture the sales queue status text or JSON.
2. Submit one support question on `/dashboard/support`.
3. Write whether any email actually sent without approval (expected: no).
4. Note the draft badge or CRM pending state if visible.

## Check your understanding

- [ ] I know sales intake queues — it does not auto-pitch.
- [ ] I can open tenant support.
- [ ] I expect human approval before outbound mail.

## Common mistakes

- Do not treat a queued status as a sent email.
- Support answers must stay inside the active tenant scope.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Queued** | Accepted for later human handling — not finished send. |
| **PENDING DRAFT APPROVAL** | CRM/state flag before dispatch. |
| **Tenant-scoped support** | Tickets and replies limited to one company. |

## Source anchors

- `docs/TAS.md`
- `docs/technical/architecture-and-api.md`
- `docs/technical/deployment-and-ops.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`

## Next chapter

Continue to [`10-approvals-human-in-loop.md`](./10-approvals-human-in-loop.md).
