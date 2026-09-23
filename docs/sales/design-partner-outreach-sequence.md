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

**Touch 2 difference:** do **not** re-open the Touch 1 diagnostic in the body. Send as a threaded `Re:` reply. Open with a brief follow-up beat, then scarcity + combined economics + CTA. Use verified motion for **subject localization** and the economics `criteriaFocus` phrase only — not as a second Gate 2 open. Same investigation bar as Touch 1.

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
| Words you'd say out loud (“each client stays in its own workspace”) | Spec-sheet nouns (“hard tenant walls”, “residual risk in whole cents”, “auditor-ready evidence”) |

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

When {{company}} is running compliance for more than one client, how do you keep each client's evidence from ending up in the same pile?

That's what I built Ironframe for. Each client stays in its own workspace. Risk shows up in dollars, not a color chart. You can hand a board or auditor a clean export — just that client.

We're taking a few Command Design Partner seats at $4,999 flat for 90 days. You pick 2–3 things that have to work.

If that mixing problem is real on your side, would you be up for a 10–15 minute workflow review next week? Just how you do it today — not a product tour.

Best,
Dereck
Founder, Ironframe
dereck@ironframegrc.com
```

**SMS (≤160 chars):**

```
{{firstName}} — Dereck @ Ironframe. Real client walls + dollar risk, not shared heatmaps. 10–15 min workflow review? Reply YES or STOP.
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

Thanks for writing back — good to hear from you.

Glad the {{verified-motion}} piece landed. That's exactly what the 10–15 minute workflow review is for.

It's just you and me, 10–15 minutes, on one real problem — how you keep clients separated, how you talk dollars to a board, or what you can actually export.

If that feels useful, Command Design Partner is $4,999 flat for 90 days. You pick 2–3 things that have to work.

Reply with 2–3 times that work this week in Central Time (or YES and I’ll propose slots).

Best,
Dereck
Founder, Ironframe
dereck@ironframegrc.com
```

Optional booking line (when `IRONFRAME_WORKFLOW_REVIEW_BOOKING_URL` is set):  
`Prefer to pick a time: {{bookingUrl}}`

### SOFT — paste-ready

**Subject:** `Re: keeping clients separated — {{company}}`

```
Hi {{firstName}},

Appreciate you getting back.

Happy to keep this concrete for {{company}}: a 10–15 minute workflow review on how you keep client evidence separated today — not a deck.

If that problem is real, Command Design Partner is $4,999 for 90 days. Convert or walk at day 90.

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

Quick numbers, then we can pick a time:

Command Design Partner is $4,999 flat for 90 days.
You name 2–3 things that have to work. Convert or walk at day 90.
After that, Ironframe Command is about $35,000 a year.
If you convert in-window, the $4,999 credits toward year one — not a negotiated discount.

Best next step for {{company}} is still a 10–15 minute workflow review on how you work today — not a tour.

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

**Required before draft:** re-run the **target-specific hook rule** (investigate motion → short `criteriaFocus` for the economics line + `Re:` subject). Do not DISPATCH a generic scarcity bump when a verified motion exists. Do **not** paste the diagnostic re-anchor as the email open.

**Subject:** `Re:` + Touch 1 subject when possible · else `Re: client-isolated evidence — {{company}}`

**Canonical body:** `buildTouch2EmailBody()` in `app/lib/salesTouch2Body.ts` (Option 1 threaded follow-up).

**Shape:** (1) brief threaded follow-up · (2) 3–5 seat cohort cap · (3) one economics beat Path B + GA · (4) peer workflow-review CTA · (5) C1 signature.

```
Hi {{firstName}},

Following up on this briefly:

We're only taking 3–5 MSP/MSSP operators in this Command Design Partner group so we can actually build around how you work.

$4,999 covers 90 days. You set 2–3 criteria for how you keep {{criteriaFocus}} separate.
That's ahead of our planned GA at about $35,000/year.

If that's on your radar this quarter, open to a 10–15 minute workflow review next week?

Best,
Dereck
Founder, Ironframe
dereck@ironframegrc.com
```

**criteriaFocus examples (economics line only — do not repeat in CTA):**
- Abacus client registers
- HIPAA / GLBA evidence registers
- CISO Global client registers

**SMS:**

```
{{firstName}} — still recruiting 3–5 Ironframe co-builders ($4,999). Workflow review, not a demo. Reply YES / later / stop.
```

**Investigation re-anchors** (queue panel / HITL context — not the body open): see `app/lib/salesTouch2ReAnchors.ts` and [live Touch 2 queue](./design-partner-touch2-queue-live-by-sent-date.md).

---

## Touch 3 — Value Drop (day ~10, send #3)

**Canonical body:** `buildTouch3EmailBody()` — plain-English 3-point framework, **no** $4,999 / GA / workflow pitch.

**Hard professionalism lock:** never DISPATCH Touch 2 Economics copy as Touch 3. `lintSalesTouchBodyMatch()` + DISPATCH `expectedTouch` gate enforce this.

---

## Touch 4 — Clean Breakup (day ~16, send #4, final)

**Canonical body:** `buildTouch4EmailBody()` in `app/lib/salesTouch4Body.ts`.

**Rules:** under ~4 sentences · no guilt · no Path B / GA restack · explicit close of **this Design Partner thread/cohort** · reopen later on new buyer, new cohort, or documented trigger (~90d+) — **not** a forever company ban.

**Subject:** `Re:` + prior subject when possible.

```
Hi {{firstName}},

Assuming {{motion-specific priority for company}} this quarter, I'll close your file on this Design Partner thread and step back — no further follow-ups from me on this cohort.

If this comes back up later, or you want a second set of eyes on how you keep clients separated, just reply.

Best of luck with the quarter.

Best,
Dereck
Founder, Ironframe
dereck@ironframegrc.com
```

CRM after DISPATCH: stamp `CADENCE_CLOSED` for this wave (`TOUCH4_CADENCE_CLOSED_NOTE`).

---

## Approval operator notes

| Check | Action |
|-------|--------|
| Channel | EMAIL needs valid email; SMS needs E.164 phone on prospect |
| Price | Must say **$4,999** Command Design Partner — never only $35k without “planned GA”; **no Path B** in body |
| CTA | Workflow review — not 20-min demo / free pilot |
| PENDING tenants | After yes → provision + Path B (ops) link, **not** `/pricing` |

**Related:** [Offer sheet](./design-partner-offer-sheet.md) · [Heatmap Amnesty](./heatmap-amnesty-campaign.md) · [Control-to-Capital](./control-to-capital-market-narrative.md) · [Workflow review protocol](./design-partner-workflow-review-protocol.md) · [Operator launch checklist](./design-partner-operator-launch-checklist.md) · Reply builders: `lib/gtm/outreachReplyCopy.ts`
