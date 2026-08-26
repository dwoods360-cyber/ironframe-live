# Design-partner outreach sequence (3 touches)

**Rule:** SalesTeam / Approvals draft only — never auto-send. Operator DISPATCH after review.  
**Commercial lock:** Path B **$4,999** · CTA = **10–15 min workflow review**.  
**Cold first touch:** no planned GA list price (defer ~$35k/yr to Touch 2 / pricing questions).  
**Ban:** demo slugs, free pilot, “fastest certification,” seat/month licensing language.  
**Priority-1 CISO/CFO sequence:** use [Heatmap Amnesty campaign](./heatmap-amnesty-campaign.md) copy (landing `/marketing/heatmap-amnesty`) when board-dollar exposure is the wedge — same HITL DISPATCH rules.  
**Doctrine:** [Control-to-Capital narrative](./control-to-capital-market-narrative.md)

SalesTeam `outboundDraftsman` generates Touch 1–shaped first drafts. Use this file for follow-ups and SMS variants in Approvals.

---

## Target-specific hook rule (Touch 1 **and** Touch 2)

**Standing rule for the Sales outreach track — including ongoing Touch 2 follow-ups.**

For every prospect **entering** Approvals and every **ongoing** Touch 2 (same day the following week) draft:

1. **Investigate** the target’s real operating motion (site / practice pages / verified public claims — e.g. audit volume, MDR/SOC, CMMC/DIB, attestation vs QSA).
2. **Pick verbage** that names *their* multi-client / multi-entity friction (shared-stack isolation, evidence boundaries, board exposure) — use sector research as a **menu**, not a paste.
3. **Craft a stronger Gate 2 open** — prefer `As` / `When` / `With…` + isolation ask. Avoid scrapey `Saw…` unless a specific published claim is load-bearing **and** verified.
4. **Keep commercial locks** — estimated financial exposure (ranges/assumptions visible); **$4,999** / 90-day / workflow review; no `Path B` in body; C1 founder signature. Touch 1: **no** planned GA `~$35k`. Touch 2+: GA list price **optional**.
5. **Apply into the pending draft** before READY / DISPATCH.

**Touch 2 difference:** do **not** re-send the Touch 1 cold opener. Re-anchor their motion in one short line, then soften + scarcity (+ optional GA). Same investigation bar as Touch 1.

**Forbidden:** generic “When {{company}} runs compliance…” as the default when a verified motion exists; inventing BHC / NERC / HIPAA language for a prospect not in that motion; Challenger essays pasted from flywheel research.

**Flywheel:** preserve the discover → verify → RESEARCH → Gatekeeper promote process; run every **Friday** (after HITL) as pipeline replenishment — not daily outreach ([playbook](./design-partner-flywheel-weekly-replenishment.md)).

**Hard lock — never rewrite DISPATCHED:** Prep / polish / human-voice scripts must refuse to mutate any CRM row tagged `[DISPATCHED SALES COURIER]`. Helper: `app/lib/salesDraftWriteGuard.ts` (`updatePendingSalesDraftOnly`). Overwriting a dispatched row can reset it to PENDING and enable duplicate Resend sends.

---

## Human voice lock (all correspondence)

**Standing rule for every Sales EMAIL/SMS draft (Touch 1–3).**

Write like a founder emailing a peer — short sentences you could say aloud.  
`board-writer` sets the **plain-English clarity bar** (problem-first, rewrite dense lines into two shorter ones — see `docs/training/level-2/13-narrative-frameworks-storybrand.md`).  
`board-writer` does **not** author cold send; SalesTeam / Approvals HITL own the wire.

| Do | Don’t |
|----|--------|
| One idea per sentence | Stack price + window + criteria + GA into one clause |
| Spoken opens (`When you're managing…`) | Word stumbles (`stacks` … `stack`) |
| Plain economics on two short lines | Catalog glue (“co-builder seat structured around…”) |
| Peer workflow-review ask | Demo CTAs / brochure cadence |

Lint helper: `app/lib/salesHumanVoice.ts` (`lintSalesHumanVoice`).  
Peer register reference: [founder casual pitch](./founder-elevator-pitch-casual-audio-script.md).

---

## Naming (customer vs internal)

| Surface | Use |
|---------|-----|
| **Partner-facing SKU** | **Command Design Partner** |
| **Internal / R2 / Stripe / ops** | **Path B** — never in cold EMAIL/SMS bodies |
| **Audience umbrella** | **multi-entity GRC operators / MSSPs** |
| **Beachhead D wedge** | multi-client isolation + dollar exposure (not invented hiring) |

## Touch 1 — Open (day 0)

**Subject:** Prefer Option-1 operational (`client-isolated … for {{company}} …`) after target investigation — not a generic subject when a verified motion exists.

**Open:** Replace the generic first question with a **target-specific** hook (see rule above). Skeleton below is fallback only.

```
Hi {{firstName}},

When {{company}} runs compliance across client environments, how do you keep evidence and board reporting isolated today — without mixing registers in a shared GRC stack?

Ironframe is built for that: hard tenant walls, residual risk modeled in whole cents internally, and exportable auditor-ready evidence — so client leadership sees estimated financial exposure (ranges and assumptions visible), not another subjective heatmap.

We're opening a small Command Design Partner cohort: $4,999 flat for a 90-day co-builder seat around 2–3 success criteria you set.

If that multi-client friction is real, the next step is a 10–15 minute workflow review on your evidence path — not a product tour.

Best,
Dereck
Founder, Ironframe
dereck@ironframegrc.com
```

**SMS (≤160 chars):**

```
{{firstName}} — Dereck @ Ironframe. MSSP seats: client walls + dollar risk, not shared heatmaps. 10–15 min workflow review? Reply YES or STOP.
```

---

## When they reply to outreach (same business day)

**Not Touch 2.** This is the **immediate reply** when someone answers Touch 1 (or later).  
**SLA:** same business day; ideally ≤1 Central business hour when you’re at the desk.  
**Code helper:** `lib/gtm/outreachReplyCopy.ts` — `buildOutreachYesReplyEmail` / `buildOutreachSoftReplyEmail` / `buildOutreachPriceReplyEmail`.  
**HITL only** — paste into mail / Approvals after review. Never auto-send the YES/SOFT/PRICE body.

### Auto receipt + founder alert (when away / Zoho)

When a prospect replies, register the reply so the system can:

1. **Light receipt** to the prospect — From **`dereck@ironframegrc.com` only** (Resend → Zoho domain; **never Gmail**).
2. **Alert** to `OPS_SCHEDULE_NOTIFY_EMAIL` (set to `dereck@ironframegrc.com`) + Ops Hub **audible chime** when a tab is open.

| Path | How |
|------|-----|
| **Manual** | Approvals (SALES) → **Mark replied · send receipt + alert** |
| **Webhook** | `POST /api/webhooks/resend/inbound` with `Authorization: Bearer $RESEND_INBOUND_WEBHOOK_SECRET` (Resend `email.received` or Zoho→Make forward) |

Idempotent: second path / retry skips duplicate receipt + alert.  
Receipt ≠ scheduling reply — still paste YES/SOFT/PRICE same business day.

**Inbound mailbox:** Path B outreach From is `dereck@ironframegrc.com`, so replies land in that Zoho (ImproVMX) inbox — not every company mailbox, and not Gmail as From to the prospect.

**Code:** `lib/gtm/outreachReplyReceiptCopy.ts` · `app/lib/server/outreachReplyReceiptCore.ts`

| They said | Use | Goal |
|-----------|-----|------|
| YES / “let’s talk” / “book something” | **YES** | Confirm peer review + schedule |
| Soft / “send more” / “curious” | **SOFT** | Keep concrete; still ask for workflow review |
| Price / “what’s included?” | **PRICE** | Short economics ($4,999 · 90-day · optional ~$35k GA) then schedule |

**Bans (same as cold):** no `Path B` in body · no demo CTA · no free pilot · no demo slugs · C1 founder signature.

### YES — paste-ready

**Subject:** `Re: workflow review — {{company}}` *(or keep their thread `Re:`)*

```
Hi {{firstName}},

Thanks for the reply — good to hear from you.

Glad the {{verified-motion}} angle landed — that’s exactly what the 10–15 minute workflow review is for.

It’s peer-to-peer, 10–15 minutes, on one real friction (client isolation, board dollars, or exportable evidence).

If we align after that, the Command Design Partner seat is $4,999 flat for a 90-day window around 2–3 criteria you set.

Reply with 2–3 times that work this week in Central Time (or YES and I’ll propose slots).

Best,
Dereck
Founder, Ironframe
dereck@ironframegrc.com
```

Optional booking line (when `IRONFRAME_WORKFLOW_REVIEW_BOOKING_URL` is set):  
`Prefer to pick a time: {{bookingUrl}}`

### SOFT — paste-ready

**Subject:** `Re: co-builder seat — {{company}}`

```
Hi {{firstName}},

Appreciate you getting back.

Happy to keep this concrete for {{company}}: one 10–15 minute workflow review on how you keep client evidence isolated (or board exposure defended) today — not a demo deck.

If that friction is real, the paid Command Design Partner seat is $4,999 for a 90-day convert-or-exit window.

Reply with 2–3 times that work this week in Central Time (or YES and I’ll propose slots).

Best,
Dereck
Founder, Ironframe
dereck@ironframegrc.com
```

### PRICE — paste-ready

**Subject:** `Re: Command Design Partner — {{company}}`

```
Hi {{firstName}},

Quick economics, then we can schedule:

Command Design Partner is $4,999 flat for a 90-day co-builder window.
You name 2–3 success criteria. Convert or exit at day 90.
Planned GA for Ironframe Command is about $35,000 a year.
If you convert in-window, the $4,999 is credited to year-1 Command — not a negotiated discount.

Best next step for {{company}} is still a 10–15 minute workflow review — peer diligence, not a tour.

Reply with 2–3 times that work this week in Central Time (or YES and I’ll propose slots).

Best,
Dereck
Founder, Ironframe
dereck@ironframegrc.com
```

**After they book / confirm a slot:** host on `/dashboard/operations/workflow-review` per [workflow review protocol](./design-partner-workflow-review-protocol.md).  
**After YES on the call:** order form → provision → tenant-scoped activation (ops) — not generic `/pricing`.

---

## Touch 2 — Soften + scarcity (same day the following week)

**Required before draft:** re-run the **target-specific hook rule** (investigate motion → one-line re-anchor). Do not DISPATCH a generic scarcity bump when a verified motion exists.

**Subject:** `Re:` + Touch 1 subject when possible · else `Re: co-builder seat — {{company}}`

**Shape:** (1) one-line motion re-anchor · (2) soften + 3–5 seat scarcity · (3) optional planned GA · (4) workflow-review CTA · (5) C1 signature.

```
Hi {{firstName}},

Still thinking about how {{company}} keeps {{verified-motion}} evidence / board reporting isolated across client tracks — without shared-stack register risk.

Short follow-up: cohort is capped at 3–5 seats so we can honor roadmap influence without scope sprawl.

If that friction is still real, the paid Command Design Partner seat ($4,999) is the on-ramp — convert or exit at day 90 with criteria you named.

Worth a 10–15 min workflow review this week?

Best,
Dereck
Founder, Ironframe
dereck@ironframegrc.com
```

**Optional scarcity / GA line (Touch 2+ only):**

> Planned GA for Ironframe Command is ~$35,000/year — the Design Partner seat is the paid co-builder on-ramp.

**SMS:**

```
{{firstName}} — still recruiting 3–5 Ironframe co-builders ($4,999). Workflow review, not a demo. Reply YES / later / stop.
```

**Example motion re-anchors (illustrative — verify per target):**  
- Attestation firm: `400+ SOC/PCI/ISO audit tracks`  
- MDR MSSP: `24×7 MDR / SOC client environments`  
- CMMC/DIB: `CMMC/DFARS client enclaves`

---

## Touch 3 — Breakup (day 10–12)

**Subject:** Closing the loop on {{company}}

```
Hi {{firstName}},

I’ll close the loop so this doesn’t linger. If a paid design-partner Command Tier seat isn’t useful right now, no hard feelings — reply “pause” and we’ll leave you alone.

If timing is better after {{audit-or-board-event}}, a 10–15 min workflow review still opens the Command Design Partner seat ($4,999).

Best,
Dereck
Founder, Ironframe
dereck@ironframegrc.com
```

---

## Approval operator notes

| Check | Action |
|-------|--------|
| Channel | EMAIL needs valid email; SMS needs E.164 phone on prospect |
| Price | Must say **$4,999** Command Design Partner — never only $35k without “planned GA”; **no Path B** in body |
| CTA | Workflow review — not 20-min demo / free pilot |
| PENDING tenants | After yes → provision + Path B (ops) link, **not** `/pricing` |

**Related:** [Offer sheet](./design-partner-offer-sheet.md) · [Heatmap Amnesty](./heatmap-amnesty-campaign.md) · [Control-to-Capital](./control-to-capital-market-narrative.md) · [Workflow review protocol](./design-partner-workflow-review-protocol.md) · [Operator launch checklist](./design-partner-operator-launch-checklist.md) · Reply builders: `lib/gtm/outreachReplyCopy.ts`
