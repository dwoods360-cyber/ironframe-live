# Operator launch checklist — first design-partner batch

Print or keep beside Approvals. Aim: ≤15 min/day rhythm after rails are green.

**Before first real DISPATCH:** run the timed dry-run  
→ [Pre-outreach run order](./design-partner-pre-outreach-run-order.md) (R1–R8, ~30–45 min).  
In-app: Ops Hub → **Operator library** → `/dashboard/operations/library/pre-outreach-run-order`.  
This checklist is the batch/send cadence after that run order is GO.

## A. Pre-outreach gate (once)

| # | Task | Done |
|---|------|------|
| A1 | Spot-check prod: `/register/contact` = lead only; `/admin/onboarding` = Path B link label; `/get-started` Step 2 = GRC company ≠ CRM | ☑ 2026-07-18 — contact lead-only copy+API; onboarding UI labels Path B activation (not /pricing); get-started Step 2 states GRC company ≠ CRM |
| A2 | Confirm Path B activation mints on a throwaway slug (Stripe session). Prefer **live** only when ready to charge; test mode OK for dry-run | ☑ 2026-07-19 — test mode (`sk_test_`); unpaid Checkout Session minted for slug `a2-dryrun-mrroi1wm` via `scripts/dev/a2-pathb-activation-dry-run.mjs` (`cs_test_…`, price $4,999, `checkout.stripe.com`); live refused; payment not completed |
| A3 | Resend domain OK for sales/invite From; Textbelt or Twilio set if SMS DISPATCH planned (`SMS_PROVIDER`, keys) | ☑ 2026-07-19 — Vercel DNS added (DKIM `resend._domainkey`, MX+TXT `send`); Resend `ironframegrc.com` **verified**; Textbelt OK (quota≈199); From `delivery@ironframegrc.com` |
| A4 | Read [offer sheet](./design-partner-offer-sheet.md) + [sequence](./design-partner-outreach-sequence.md) + [workflow review protocol](./design-partner-workflow-review-protocol.md) | ☑ 2026-07-19 — locks confirmed: $4,999 Path B · 90-day · CTA workflow review · HITL DISPATCH only · no demo slugs / free pilot; Touch 1–3 cadence day 0 / 4–5 / 10–12; protocol added for peer-to-peer diligence talk track |

## B. Batch build (warm first)

| # | Task | Done |
|---|------|------|
| B1 | Fill [ICP shortlist](./design-partner-icp-shortlist.md) — prioritize warm intros | ☑ 2026-07-19 — attack order locked (warm → auditor → Scout → cold); §C 15 research profiles named; §A/§B slots prioritized — **paste real A1–A5 contacts before B2/DISPATCH** |
| B2 | Warm-network ask + auditor blurbs sent (human, not SalesTeam) | ☑ N/A 2026-07-19 — no warm network; deferred until a real intro appears |
| B3 | Ironleads / Scout triggers → CRM `prospect-pool` with email or phone | ☑ 2026-07-19 — Ironleads harvest + public-phone enrichment; **2 PROSPECT** rows in `prospect-pool` (Pivot Point Security SMS · BlueRadius Cyber EMAIL/SMS); see shortlist §D |
| B4 | SalesTeam poll → drafts in `/dashboard/admin/approvals` | ☑ 2026-07-19 — SalesTeam poll OK; **2 unique PENDING SALES DRAFT** rows for Pivot Point + BlueRadius (copy locks pass: $4,999 · workflow review · planned GA · no demo slugs). Note: Pivot Point email is `@ironleads.local` — use **SMS** on DISPATCH; BlueRadius EMAIL ok (`info@`). Duplicate older interactions may appear — use newest per deal. |

## C. Per-prospect send

| # | Task | Done |
|---|------|------|
| C1 | Edit draft: $4,999 · workflow review CTA · no free pilot · **no** raw triggers / anti-hallucination leaks / GF sales signature / `$0.00` ALE (see R2.5–R2.8) | ☐ |
| C2 | DISPATCH (email Resend / SMS Textbelt) | ☐ |
| C3 | Log touch date on shortlist §D | ☑ 2026-07-23 — BlueRadius Cyber EMAIL DISPATCH logged (C1/C2); library URL `/dashboard/operations/library/icp-shortlist#section-d` |

## D. Close & provision

| # | Task | Done |
|---|------|------|
| **D0** | **Counsel gate:** [Counsel review packet](./counsel-review-packet.md) returned; order form + MSA/DPA marked **Counsel-approved** with date/firm — **block Path B signature send until yes** | ☐ |
| D1 | Complete [order form](./design-partner-order-form.md) (2–3 success criteria) — **GTM host** | ☐ |
| D2 | Quick-provision with **client-owned** email (server rejects @ironframegrc.com) — **`BUSINESS_ADMIN` / `GLOBAL_ADMIN` duty** (SoD; not the GTM host beat) | ☐ |
| D3 | Send **Path B activation link only** — never generic `/pricing` for PENDING | ☐ |
| D4 | Confirm billing ACTIVE → partner on `/get-started` (ALE + company) | ☐ |
| D5 | Hand partner the **Operator Packet** link: `/docs/user-manuals/design-partner-operator-packet` (+ curated `/docs/training/LEVEL1-PARTNER-INDEX`) — not full classroom index or `docs/ops/*` | ☐ |
| D6 | Confirm AppDocument corpus seeded on that environment (`npx tsx scripts/seed-app-documents.ts` or `npx tsx prisma/seed-docs.ts`) so packet resolves in `/docs` | ☐ |
| D7 | Schedule capped weekly sync; freeze scope outside criteria | ☐ |

## Surfaces

| Step | URL / tool |
|------|------------|
| Operator library | `/dashboard/operations/library` |
| Pre-outreach dry-run | `/dashboard/operations/library/pre-outreach-run-order` · [run order md](./design-partner-pre-outreach-run-order.md) |
| GTM glossary | `/dashboard/operations/library/gtm-operator-glossary` · [glossary md](./design-partner-gtm-operator-glossary.md) |
| ICP shortlist (C3) | `/dashboard/operations/library/icp-shortlist#section-d` · [shortlist md](./design-partner-icp-shortlist.md) — **not** `/library/design-partner-icp-shortlist` |
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
