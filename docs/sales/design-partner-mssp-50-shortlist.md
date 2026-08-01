# MSSP / vCISO 50-account shortlist (first Path B wave)

**Status:** Operating lock · 2026-08-01  
**Goal:** Manually qualify **50** MSSP / vCISO accounts → HITL DISPATCH → fill **3–5** Path B Command Design Partner seats ($4,999 / 90 days).  
**Beachhead:** `MSSP_ENCLAVE` first. Heatmap Amnesty stays reserved for the later CISO/CFO mid-market lane (`/marketing/heatmap-amnesty`).  
**Parent list:** [ICP shortlist](./design-partner-icp-shortlist.md) · Scout cadence: [Week-1 MSSP playbook](./design-partner-week1-mssp-scout-playbook.md)

---

## Ironframe locks (do not drift)

| Lock | Value |
|------|--------|
| Cohort | **3–5** co-builder seats |
| Path B | **$4,999** flat · **90**-day default window |
| Credit | Credited toward Year 1 Command **only if** convert inside the defined window |
| CTA | **10–15 minute** workflow review — not demo / free pilot |
| Ironleads | **Harvest + research** auto-fills SUSPECT reports; operator reviews / light confirm only |
| Human rail | **Promote → SalesTeam poll → DISPATCH** — never auto-send; no Cursor scrape of LinkedIn |
| Channel (2026-08-01) | **Email-first (Resend)** — named buyer business email required to Promote / DISPATCH. **SMS deferred** (Textbelt/Twilio optional later; cancel Textbelt OK) |
| BlueRadius | **HOLD** (Radius360) — channel/competitor; not Path B cold |
| Pivot Point (CBIZ) | **HOLD** (OSCAR GRC) — channel/competitor; not Path B cold |

Commercial truth: `lib/ironframeProductKnowledge/commercial.ts`.

---

## Exposure language (outreach + product UI)

**Do not** call whole-cent ALE “product truth” or show a single precise dollar as certainty.

- Ironframe may **calculate** at whole-cent / integer-cent precision internally (BigInt).
- **Displayed** results must read as estimates with visible assumptions — prefer ranges (e.g. P50 / P90), confidence, and “assumptions last reviewed.”
- Cold outreach and first-touch copy use **estimated financial exposure ranges with visible assumptions** — never “true ALE: $1,423,681.37.”

Canonical narrative: [Control-to-Capital](./control-to-capital-market-narrative.md).

---

## Three gates before outreach (all required)

An account enters **Approved** only when every gate passes:

1. **Fit** — Operates a vCISO, managed GRC, compliance, or security-advisory practice (not a pure product reseller with no client delivery).
2. **Pain signal** — At least one concrete trigger: multi-client growth, GRC/compliance hiring, new managed service, acquisition, or visible multi-client workflow complexity.
3. **Buyer access** — At least one **economic buyer** and one **operational buyer** identified (may be the same person at ≤~20 headcount firms), with a **verified direct** email or mobile — not switchboard / info@ alone.
4. **No proprietary GRC conflict** — If the firm sells or operates its own client-facing GRC platform (e.g. OSCAR, Radius360), mark **HOLD / channel-competitor**. Do not Path B cold until complementary fit is proven.

Fail any gate → **Hold** or drop. Do not treat “practice/client proof” alone as enough.

---

## Qualification defaults

| Field | First-wave default |
|-------|--------------------|
| Company size | **10–500** employees (founder may be the buyer under 50) |
| Geography | Prefer US Central / Eastern for first wave |
| Practice proof | Serves **≥10 clients** *or* clear managed GRC / vCISO practice page |
| Titles (primary) | Founder / Managing Partner / CEO · Head of vCISO · Practice Lead GRC · VP Managed Services · Director GRC · CISO |
| Titles (secondary) | Client delivery lead · compliance eng lead · practice ops |
| Exclude | BlueRadius · Pivot Point (OSCAR) Path B cold · mega-RFP shops · no named buyer · switchboard-only · `@ironleads.local` only |

---

## Enrichment stack (first wave — keep small)

```
Sales Navigator (manual select)
  → Account + buyer names on this sheet
  → Apollo OR Prospeo (one finder)
  → Ordinary email verification
  → BounceBan only for unresolved catch-all
  → Approvals HITL DISPATCH (10–15 at a time)
```

Do **not** stand up Clay + Apollo + Dropcontact + Prospeo + Cognism before the first 20 deliberate sends. Add Clay only after a weekly process is repeatable. Do not scrape Sales Navigator via browser plugins.

---

## Sheet schema (50 rows)

Copy into a spreadsheet or keep a parallel table below / in git. Log DISPATCH outcomes here **and** on ICP shortlist §D.

| Field | Purpose |
|-------|---------|
| Account | Target organization |
| Website | Domain verification |
| Employee range | Basic qualification (10–500) |
| Practice type | vCISO · managed GRC · MSSP · advisory |
| Client-scale evidence | Proof of multi-client need |
| Trigger | Why outreach is timely (pain signal) |
| Primary buyer | Economic decision-maker + title |
| Secondary buyer | Workflow owner / champion + title |
| LinkedIn profile | Identity confirmation (URL) |
| Verified business email | Contact channel (named buyer — not info@) |
| Verification status | Valid · catch-all · unknown |
| Personalization evidence | Specific fact used in message |
| Wedge | Isolation · oversight · evidence reuse |
| Approval status | Research · hold · approved · dispatched |
| Outreach date | Activity tracking |
| Response | Positive · referral · decline · no response |
| Workflow review | Date / status |
| Path B outcome | Qualified · declined · converted |
| Rejection reason | Market learning |

**Approval status rule:** `approved` only after Fit + Pain + Buyer access. `dispatched` only after human C1/C2 on Approvals.

---

## Working table (fill to 50)

Seed from Scout §D (**excluding HOLD**), and manual Sales Nav picks. Leave blanks until gates pass. **Pivot Point and BlueRadius are logged HOLD — do not use as row 1 outreach.**

| # | Account | Website | Emp | Practice | Trigger | Primary buyer | Secondary | Email | Verif | Approval | Notes |
|---|---------|---------|-----|----------|---------|---------------|-----------|-------|-------|----------|-------|
| — | CBIZ Pivot Point Security | pivotpointsecurity.com | | MSSP / vCISO | Hiring / AI gov expansion | John Verry (MD Cyber) | Rich Stever (GRC Lead) | *(none verified)* | Switchboard only | **HOLD** | Own **OSCAR** GRC — channel-competitor; no Path B SMS/DISPATCH |
| — | BlueRadius Cyber | blueradius.io | | MSSP / vCISO | | | | info@ | | **HOLD** | **Radius360** — channel-competitor |
| 1 | *(next non-conflict MSSP)* | | | | | | | | | Research | Must pass all four gates |
| 2 | | | | | | | | | | | |
| … | | | | | | | | | | | |
| 50 | | | | | | | | | | | |

---

## First-touch email (MSSP isolation wedge)

Lead with the multi-client workflow. Disclose Path B commercials on the review or immediate follow-up — not every lock in the opener.

```
Hi [First Name],

I noticed [specific trigger: vCISO expansion / GRC hiring / managed compliance offer].

How are you currently keeping each client’s controls and evidence separated while giving practice leadership one view of risk and remediation across the client base?

Ironframe is opening a small paid design-partner cohort for MSSP and vCISO leaders working through that problem. The 90-day engagement is built around the partner’s real workflow—not a generic product demonstration.

Would a 10–15 minute workflow review be worthwhile next week?

Dereck Woods
Ironframe GRC
```

**On the review / follow-up, state:** Path B $4,999 / 90 days · not a free pilot · defined co-builder participation · credited to Year 1 Command only on in-window conversion · **3–5** seats.

**Do not** open with “most CISOs we speak with,” “replace heatmaps,” “whole-cent ALE,” or “hard tenant enclave walls.” Prefer: *isolated client workspaces with authorized consolidated oversight.*

---

## Send cadence

1. Build to **50** rows with gates passed (or clearly Hold).  
2. Write each first message with **Personalization evidence** filled.  
3. DISPATCH **10–15** at a time; review replies before the next batch.  
4. Record Response / Rejection reason every time.  
5. After **30–50** deliberate sends, revise titles, triggers, and wedge from your data — not generic benchmarks.

---

## Related

- [ICP shortlist](./design-partner-icp-shortlist.md) · [Week-1 Scout](./design-partner-week1-mssp-scout-playbook.md) · [Outreach sequence](./design-partner-outreach-sequence.md)  
- [Heatmap Amnesty](./heatmap-amnesty-campaign.md) (later CISO/CFO lane) · [Control-to-Capital](./control-to-capital-market-narrative.md) · [Offer sheet](./design-partner-offer-sheet.md)
