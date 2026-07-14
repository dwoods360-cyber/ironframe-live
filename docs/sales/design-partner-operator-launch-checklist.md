# Operator launch checklist — first design-partner batch

Print or keep beside Approvals. Aim: ≤15 min/day rhythm after rails are green.

## A. Pre-outreach gate (once)

| # | Task | Done |
|---|------|------|
| A1 | Spot-check prod: `/register/contact` = lead only; `/admin/onboarding` = Path B link label; `/get-started` Step 2 = GRC company ≠ CRM | ☐ |
| A2 | Confirm Path B activation mints on a throwaway slug (Stripe session). Prefer **live** only when ready to charge; test mode OK for dry-run | ☐ |
| A3 | Resend domain OK for sales/invite From; Textbelt or Twilio set if SMS DISPATCH planned (`SMS_PROVIDER`, keys) | ☐ |
| A4 | Read [offer sheet](./design-partner-offer-sheet.md) + [sequence](./design-partner-outreach-sequence.md) | ☐ |

## B. Batch build (warm first)

| # | Task | Done |
|---|------|------|
| B1 | Fill [ICP shortlist](./design-partner-icp-shortlist.md) — prioritize warm intros | ☐ |
| B2 | Warm-network ask + auditor blurbs sent (human, not SalesTeam) | ☐ |
| B3 | Ironleads / Scout triggers → CRM `prospect-pool` with email or phone | ☐ |
| B4 | SalesTeam poll → drafts in `/dashboard/admin/approvals` | ☐ |

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
| D4 | Confirm billing ACTIVE → partner on `/get-started` | ☐ |
| D5 | Schedule capped weekly sync; freeze scope outside criteria | ☐ |

## Surfaces

| Step | URL / tool |
|------|------------|
| Approvals | `/dashboard/admin/approvals` |
| Provision | `/admin/onboarding` |
| Contact (inbound) | `/register/contact` |
| Pricing (new buyers only) | `/pricing` shows Command Tier **$4,999** |
| Recruitment runbook | [design-partner-recruitment.md](./design-partner-recruitment.md) |
