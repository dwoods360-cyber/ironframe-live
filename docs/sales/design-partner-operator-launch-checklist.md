# Operator launch checklist — first design-partner batch

Print or keep beside Approvals. Aim: ≤15 min/day rhythm after rails are green.

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
| C1 | Edit draft: $4,999 · workflow review CTA · no demo slugs · no free pilot | ☐ |
| C2 | DISPATCH (email Resend / SMS Textbelt) | ☐ |
| C3 | Log touch date on shortlist | ☐ |

## D. Close & provision

| # | Task | Done |
|---|------|------|
| D1 | Complete [order form](./design-partner-order-form.md) (2–3 success criteria) | ☐ |
| D2 | Quick-provision with **client-owned** email (server rejects @ironframegrc.com) | ☐ |
| D3 | Send **Path B activation link only** — never generic `/pricing` for PENDING | ☐ |
| D4 | Confirm billing ACTIVE → partner on `/get-started` (ALE + company) | ☐ |
| D5 | Hand partner the **Operator Packet** link: `/docs/user-manuals/design-partner-operator-packet` (+ curated `/docs/training/LEVEL1-PARTNER-INDEX`) — not full classroom index or `docs/ops/*` | ☐ |
| D6 | Confirm AppDocument corpus seeded on that environment (`npx tsx scripts/seed-app-documents.ts` or `npx tsx prisma/seed-docs.ts`) so packet resolves in `/docs` | ☐ |
| D7 | Schedule capped weekly sync; freeze scope outside criteria | ☐ |

## Surfaces

| Step | URL / tool |
|------|------------|
| Approvals | `/dashboard/admin/approvals` |
| Provision | `/admin/onboarding` |
| Contact (inbound) | `/register/contact` |
| Pricing (new buyers only) | `/pricing` shows Command Tier **$4,999** |
| Partner docs packet | `/docs/user-manuals/design-partner-operator-packet` |
| Partner training | `/docs/training/LEVEL1-PARTNER-INDEX` |
| Recruitment runbook | [design-partner-recruitment.md](./design-partner-recruitment.md) |
| App docs seed | `npx tsx scripts/seed-app-documents.ts` (full: `npx tsx prisma/seed-docs.ts`) |
