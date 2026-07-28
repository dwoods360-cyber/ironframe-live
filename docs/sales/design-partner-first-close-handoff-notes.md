# First-close handoff notes — Operator Packet

**Audience:** GTM host + Admin / CS at first design-partner close  
**When:** After Path B → billing **ACTIVE** (counsel D0 must already be approved)  
**Partner-facing packet:** [/docs/user-manuals/design-partner-operator-packet](../user-manuals/design-partner-operator-packet.md)  
**Curated training:** [/docs/training/LEVEL1-PARTNER-INDEX](../training/LEVEL1-PARTNER-INDEX.md)

Use this as the **send script + checklist**. Do not send `docs/ops/*` or the full classroom index.

---

## 1. What you send the partner

| Send | Do not send |
|------|-------------|
| Tenant URL: `https://{slug}.ironframegrc.com` | Demo slugs (`medshield` / `vaultbank` / `gridcore`) |
| Operator Packet link on their tenant (or app `/docs/…/design-partner-operator-packet`) | Generic public `/pricing` as the Path B ask |
| Level 1 partner index link | Full `/docs/training` classroom tree |
| Support: `delivery@ironframegrc.com` | Ops Hub / Approvals / Ironleads screens |

**Suggested message (email or chat):**

> Your Ironframe workspace is live at `https://{slug}.ironframegrc.com`.  
> Start here: **Design Partner Operator Packet** (in Docs) — Day 0 activate → Path B billing if still PENDING → `/get-started` (ALE + company) → daily cockpit.  
> Curated track: **Level 1 Partner Index**.  
> Questions / invite / billing stuck: delivery@ironframegrc.com (include your slug).

---

## 2. Operator checklist (your side) — D5 / D7

| # | Action | Done |
|---|--------|------|
| H1 | Confirm billing **ACTIVE** on the live slug (not PENDING) | ☐ |
| H2 | Confirm invite accepted + Legal Terms Portal recorded | ☐ |
| H3 | Send Packet + Level 1 links (table above) | ☐ |
| H4 | Confirm AppDocuments resolve on that env (packet + level1 already seeded prod 2026-07-27) | ☐ |
| H5 | Schedule **capped weekly sync** (30–45 min); freeze scope to order-form success criteria | ☐ |
| H6 | Attach order form + touch log to CRM deal notes | ☐ |
| H7 | Log close on [ICP shortlist §D](./design-partner-icp-shortlist.md) + GTM-3 paid count | ☐ |

---

## 3. What you walk them through on first sync

1. Bookmark tenant login URL.  
2. Packet §2–4: activate → billing ACTIVE → `/get-started` ALE + GRC company.  
3. Packet §5 daily loop: `/integrity` → `/cockpit` → `/evidence` → `/exports`.  
4. Remind: PILOT / PREVIEW badges are not deliverables; use `/exports` for auditor files.  
5. Agree next sync date; no scope outside order-form criteria without a change note.

---

## 4. Blockers / escalate

| Symptom | Action |
|---------|--------|
| Invite expired | Re-issue from admin; do not use public contact form |
| Paid but still PENDING | delivery@ + slug + payment time (check live Stripe + `/api/billing/webhook`) |
| Docs 404 for packet | Re-seed AppDocuments; do not paste raw `docs/ops` |
| Asks for free pilot / demo slug | Decline; Path B terms only |

**Related:** [Operator launch checklist](./design-partner-operator-launch-checklist.md) §D · [production go-live remaining](../ops/production-go-live-remaining.md)
