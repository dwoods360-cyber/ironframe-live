# Ironframe SaaS app test plan

**Production base:** https://ironframegrc.com  
**Session status (2026-07-27):** **12/17 PASS** — guest funnel + core GTM dry-run complete.  
**Rule:** Dry-run EMAIL only to your inbox — never live ICP.

| Bucket | Done | Total |
|--------|------|-------|
| Guest paths | 9 | 9 |
| GTM paths | 3 | 7 |
| Admin paths | 0 | 1 |
| **Scorecard** | **12** | **17** |

## Next up — QA-17 (T2/T3 Central SLA worker)

Open P1 inbound with **no** HITL DISPATCH. After **6 Central business hours** (75% of the 1-business-day SLA), cron `/api/internal/cron/inbound-lead-sla` (or wait for `*/15`) → ops “SLA risk — inbound still open” + `[SLA_T2_ESCALATED]`. T3 only if `IRONFRAME_INBOUND_SLA_AUTOSEND=true` and ≥8 Central business hours (full SLA day). Weekend/holiday time does not count.

Then: **QA-12 → QA-13 → QA-06 → QA-07**.

### Run order from here

`QA-17` (when ready) → `QA-12` → `QA-13` → `QA-06` → `QA-07`

Optional after deploy `791a1c5`: re-spot LIVE mic STT under QA-05 (clients noun; no Path B filler; no `EMPTY`).

---

## Scorecard

| ID | Name | Status |
|----|------|--------|
| QA-01 | Marketing CTAs → contact | **PASS** |
| QA-14 | Alias redirects | **PASS** |
| QA-15 | Blocked self-serve register | **PASS** |
| QA-08 | `/pricing` — no public Stripe | **PASS** |
| QA-09 | Instant webhook blocked | **PASS** |
| QA-10 | Product demo schedule-first | **PASS** |
| QA-11 | Demo banner → contact | **PASS** |
| QA-02 | Public lead → P1 + T0 Central copy | **PASS** |
| QA-16 | T1 instant system ack email | **PASS** |
| QA-03 | SalesTeam inbound queue | **PASS** |
| QA-04 | Approvals EMAIL DISPATCH (dry-run) | **PASS** |
| QA-17 | T2/T3 Central SLA worker | pending |
| QA-05 | LIVE workflow review smoke | **PASS** |
| QA-12 | Ops Hub GTM pipeline strip | pending |
| QA-13 | Warm intro kit (ICP shortlist) | pending |
| QA-06 | Order form AGREED notify | pending |
| QA-07 | Path B receipt + counsel D0 | pending |

---

## Guest / public funnel — complete (9/9)

### QA-01 · Marketing CTAs → contact

### QA-14 · Alias redirects

### QA-15 · Blocked self-serve register

### QA-08 · `/pricing` — no public Stripe

### QA-09 · Instant webhook blocked

### QA-10 · Product demo schedule-first

### QA-11 · Demo banner → contact

### QA-02 · Public lead → P1 + T0 Central copy

### QA-16 · T1 instant system ack email — **PASS**

**Full URLs:** https://ironframegrc.com/register/contact

**Preconditions**

- Lead submitted to operator inbox (QA-02)
- `IRONFRAME_INBOUND_SLA_T1_ACK` unset or true
- RESEND configured

**PASS evidence (session)**

- Inbox subject: `We received your Ironframe workflow review request`
- Body: 1 business day + Central Time window; peer review not product demo; no workspace
- Approvals draft remained PENDING (T1 ≠ HITL DISPATCH)
- OpsActivity notes: `[SLA_T1_ACK]` when checked in GTM

| PASS | FAIL |
|------|------|
| One T1 ack received · Marker on OpsActivity · Draft still PENDING | No T1 when Resend + T1 enabled · T1 body pitches Path B hard-sell / creates workspace · Draft auto-DISPATCHED by T1 |

---

## GTM host (auth)

### QA-03 · SalesTeam inbound queue — **PASS**

### QA-04 · Approvals EMAIL DISPATCH (dry-run) — **PASS**

### QA-17 · T2/T3 Central SLA worker — **next**

**Full URLs**

- https://ironframegrc.com/api/internal/cron/inbound-lead-sla
- https://ironframegrc.com/dashboard/operations/salesteam#inbound-leads

**Preconditions**

- Auth Bearer `IRONFRAME_CRON_SECRET`
- Open P1 inbound with no HITL DISPATCH
- T2: ≥6 Central business hours elapsed (weekend/holiday time does not count)
- T3: `IRONFRAME_INBOUND_SLA_AUTOSEND=true` and ≥8 Central business hours (1 business day)

**Steps**

1. Submit a throwaway lead during Central business hours (or wait across pause)
2. Do not DISPATCH
3. After 6 business hours: cron or wait for `*/15` job → ops alert “SLA risk — inbound still open”
4. OpsActivity notes gain `[SLA_T2_ESCALATED]`
5. If autosend on + 8 business hours: T3 hold email + `[SLA_T3_HOLD]`; ops “T3 SLA-hold auto-sent”
6. DISPATCH a parallel lead early → that lead must skip T2/T3

| PASS | FAIL |
|------|------|
| T2 ops-only; T3 only when autosend on · No weekend/holiday decay · Dispatched leads skipped | T2/T3 fire overnight/weekend without business elapsed · T3 sends while AUTOSEND off · T2/T3 after DISPATCH |

### QA-05 · LIVE workflow review smoke — **PASS**

Mic STT hygiene (`791a1c5`) is on production. Optional recheck: *“What is the maximum number of clients we can load into the Ironframe system.”* — keep `clients`; no Path B / workflow-review filler; no `EMPTY`; UI ~6s chunks.

### QA-12 · Ops Hub GTM pipeline strip — pending

### QA-13 · Warm intro kit (ICP shortlist) — pending

### QA-06 · Order form AGREED notify — pending

---

## Admin SoD

### QA-07 · Path B receipt + counsel D0 — pending

---

## Env gates to confirm

| Flag | Expected prod | Affects |
|------|---------------|---------|
| `IRONFRAME_PUBLIC_INSTANT_CHECKOUT_ENABLED` | off | QA-08 / QA-09 |
| `NEXT_PUBLIC_IRONFRAME_COUNSEL_D0_APPROVED` | off until counsel | QA-07 |
| `OPS_SCHEDULE_NOTIFY_EMAIL` | set | QA-02 / QA-06 / T2 |
| `IRONFRAME_WORKFLOW_REVIEW_BOOKING_URL` | optional (enables self-book in T1/T3) | QA-02 / QA-16 / QA-17 |
| `IRONFRAME_INBOUND_SLA_T1_ACK` | on (default) | QA-16 |
| `IRONFRAME_INBOUND_SLA_AUTOSEND` | off until ready | QA-17 T3 |
| `IRONFRAME_CRON_SECRET` | set | QA-17 cron |
| `RESEND_API_KEY` + `SALES_FROM_*` | set | QA-16 / QA-04 |

**Companions:** [docs/ops/design-partner-production-smoke.md](../ops/design-partner-production-smoke.md) · Reviewed **2026-07-27** · SLA clock `America/Chicago` Mon–Fri 09:00–17:00, no weekends/US federal holidays
