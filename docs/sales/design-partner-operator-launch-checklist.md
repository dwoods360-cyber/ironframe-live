# Operator launch checklist — first design-partner batch

Print or keep beside Approvals. Aim: ≤15 min/day rhythm after rails are green.

**Production remaining (only):** [production go-live remaining](../ops/production-go-live-remaining.md) — counsel D0 · design-partner acquisition/close (Stripe live Path B **done** 2026-07-28).

**Before first real DISPATCH:** run the timed dry-run  
→ [Pre-outreach run order](./design-partner-pre-outreach-run-order.md) (R1–R8, ~30–45 min).  
In-app: Ops Hub → **Operator library** → `/dashboard/operations/library/pre-outreach-run-order`.  
This checklist is the batch/send cadence after that run order is GO.

## A. Pre-outreach gate (once)

| # | Task | Done |
|---|------|------|
| A1 | Spot-check prod: `/register/contact` = lead only; `/admin/onboarding` = Path B link label; `/get-started` Step 2 = GRC company ≠ CRM | ☑ 2026-07-18 — contact lead-only copy+API; onboarding UI labels Path B activation (not /pricing); get-started Step 2 states GRC company ≠ CRM |
| A2 | Confirm Path B activation mints on a throwaway slug (Stripe session). Prefer **live** only when ready to charge; test mode OK for dry-run | ☑ 2026-07-19 — test mode (`sk_test_`); unpaid Checkout Session minted for slug `a2-dryrun-mrroi1wm` via `scripts/dev/a2-pathb-activation-dry-run.mjs` (`cs_test_…`, price $4,999, `checkout.stripe.com`); live refused; payment not completed |
| A3 | Resend domain OK for sales/invite From; SMS optional later | ☑ 2026-07-19 — Resend `ironframegrc.com` **verified**; From `delivery@ironframegrc.com`. **2026-08-01 lock:** Path B is **email-first** — Textbelt/SMS deferred (cancel Textbelt OK; re-add when phone outreach is needed). |
| A4 | Read [offer sheet](./design-partner-offer-sheet.md) + [sequence](./design-partner-outreach-sequence.md) + [workflow review protocol](./design-partner-workflow-review-protocol.md) | ☑ 2026-07-19 — locks confirmed: $4,999 Path B · 90-day · CTA workflow review · HITL DISPATCH only · no demo slugs / free pilot; Touch 1–3 cadence day 0 / 4–5 / 10–12; protocol added for peer-to-peer diligence talk track |

## B. Batch build (warm first)

| # | Task | Done |
|---|------|------|
| B1 | Fill [ICP shortlist](./design-partner-icp-shortlist.md) — prioritize warm intros | ☑ 2026-07-19 — attack order locked (warm → auditor → Scout → cold); §C 15 research profiles named; §A/§B slots prioritized — **paste real A1–A5 contacts before B2/DISPATCH** |
| B2 | Warm-network ask + auditor blurbs sent (human, not SalesTeam) | ☑ N/A 2026-07-19 — no warm network; deferred until a real intro appears |
| B3 | Ironleads / Scout triggers → CRM `prospect-pool` with **named buyer email** | ☑ 2026-07-19 harvest noted; **2026-08-01:** Pivot Point + BlueRadius both **HOLD** (OSCAR / Radius360) — not Path B targets. Next PROSPECTs need verified buyer email (SMS deferred). |
| B4 | SalesTeam poll → drafts in `/dashboard/admin/approvals` | ☑ 2026-07-19 — drafts existed for Pivot Point + BlueRadius; **do not live DISPATCH** either (HOLD). Prefer newest draft for a non-HOLD account with real To email. |

## C. Per-prospect send

| # | Task | Done |
|---|------|------|
| C1 | Edit draft: $4,999 · workflow review CTA · no free pilot · **no** raw triggers / anti-hallucination leaks / GF sales signature / `$0.00` ALE (see R2.5–R2.8) | ☑ dry-run 2026-07-23 — C1 locks on BlueRadius; **live** C1 still ☐ until real destination DISPATCH |
| C2 | DISPATCH **email (Resend)** — SMS deferred | ☑ dry-run 2026-07-23 — EMAIL to operator inbox (`dwoods360@gmail.com`); Resend `1a7a80e4…`. **Live** EMAIL DISPATCH still ☐ |
| C3 | Log touch date on shortlist §D | ☑ 2026-07-23 — BlueRadius dry-run TOUCH1 logged; 2026-07-27 — stale PENDING requeue purged; CRM email restored to `info@blueradius.io` |

## D. Close & provision

| # | Task | Done |
|---|------|------|
| **D0** | **Counsel gate:** [Counsel review packet](./counsel-review-packet.md) returned; order form + MSA/DPA marked **Counsel-approved** with date/firm — **block Path B signature send until yes** | ☐ requested 2026-08-01 — **LegalCorps**; awaiting reply (do not flip product D0 env until approved text lands) |
| D1 | Complete [order form](./design-partner-order-form.md) (2–3 success criteria) — **GTM host** | ☐ |
| D2 | Quick-provision with **client-owned** email (server rejects @ironframegrc.com) — **`BUSINESS_ADMIN` / `GLOBAL_ADMIN` duty** (SoD; not the GTM host beat) | ☐ |
| D3 | Send **Path B activation link only** — never generic `/pricing` for PENDING | ☐ |
| D4 | Confirm billing ACTIVE → partner on `/get-started` (ALE + company) | ☐ |
| D5 | Hand partner the **Operator Packet** link: `/docs/user-manuals/design-partner-operator-packet` (+ curated `/docs/training/LEVEL1-PARTNER-INDEX`) — not full classroom index or `docs/ops/*` | ☐ — send script: [first-close handoff notes](./design-partner-first-close-handoff-notes.md) |
| D6 | Confirm AppDocument corpus seeded on that environment (`npx tsx scripts/seed-app-documents.ts` or `npx tsx prisma/seed-docs.ts`) so packet resolves in `/docs` | ☑ 2026-07-27 — partner packet present; `training/level1-partner-index` upserted in production |
| D7 | Schedule capped weekly sync; freeze scope outside criteria | ☐ |

## Surfaces

**Start here for “what is each screen for”:** [Ops surface map](./design-partner-ops-surface-map.md) · `/dashboard/operations/library/ops-surface-map`

| Step | URL / tool |
|------|------------|
| Ops surface map | `/dashboard/operations/library/ops-surface-map` |
| Operator library | `/dashboard/operations/library` |
| Pre-outreach dry-run | `/dashboard/operations/library/pre-outreach-run-order` · [run order md](./design-partner-pre-outreach-run-order.md) |
| GTM glossary | `/dashboard/operations/library/gtm-operator-glossary` · [glossary md](./design-partner-gtm-operator-glossary.md) |
| ICP shortlist (C3) | `/dashboard/operations/library/icp-shortlist#section-d` · [shortlist md](./design-partner-icp-shortlist.md) — **not** `/library/design-partner-icp-shortlist` |
| Week-1 Scout (MSSP D) | `/dashboard/operations/library/week1-mssp-scout` · [playbook](./design-partner-week1-mssp-scout-playbook.md) |
| Approvals | `/dashboard/admin/approvals` (filter: `?kind=SALES` · `SUPPORT` · `CUSTOMER_SUCCESS`) |
| Workflow review LIVE desk | `/dashboard/operations/workflow-review` (talk track + mic; buttons on Approvals · Ops Hub · SalesTeam portal) |
| LIVE call assist | `/dashboard/operations/workflow-review` (mic STT, recap, Push to calendar) |
| After a yes (LIVE strip) | **Open order form** → `/dashboard/operations/library/order-form` · **Provision Path B** → `/admin/onboarding` |
| Counsel review packet | [counsel-review-packet.md](./counsel-review-packet.md) · launch **D0** before first paid signature |
| Ops Hub Calendar | `/dashboard/operations?tab=calendar` |
| Teams Graph (optional) | Ops Hub **Teams** tab |
| Provision | `/admin/onboarding` |
| Contact (inbound) | `/register/contact` |
| Pricing (new buyers only) | `/pricing` shows Command Tier **$4,999** |
| Partner docs packet | `/docs/user-manuals/design-partner-operator-packet` |
| Partner training | `/docs/training/LEVEL1-PARTNER-INDEX` |
| Recruitment runbook | [design-partner-recruitment.md](./design-partner-recruitment.md) |
| App docs seed | `npx tsx scripts/seed-app-documents.ts` (full: `npx tsx prisma/seed-docs.ts`) |
