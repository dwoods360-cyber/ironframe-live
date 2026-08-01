# Week-1 Scout playbook — MSSP / vCISO (beachhead D)

**Window:** first 7 days of live design-partner motion (while counsel D0 pending).  
**Goal:** **10–15 reachable PROSPECTs** on `prospect-pool` (score ≥12/20) → HITL DISPATCH — not 200 noisy SUSPECTs.  
**Sector tag:** `MSSP_ENCLAVE` on every D lead (SalesTeam StoryBrand face).  
**Cap:** prefer quality; purge dupes; no mega-RFP chase.

**Do in parallel Day 1–2:** live DISPATCH reachable MSSP/vCISO drafts with a **named buyer** To (not operator inbox). Fresh §D Scout rows only — **not** the HOLD accounts below.

**HOLD / channel-competitor (do not Path B cold DISPATCH or SMS):**
- **BlueRadius Cyber** — sells Radius360 (MSSP GRC); dry-run closed; qualify channel/competitor only.
- **CBIZ Pivot Point Security** — operates own client-facing **OSCAR** GRC platform; company switchboard only (not named-buyer mobile); no Promote / no SMS until named buyer + verified direct channel + complementary (not competitive) fit are confirmed.

**50-account sheet:** qualify cold/Scout targets on [MSSP 50-account shortlist](./design-partner-mssp-50-shortlist.md) — **Fit · Pain signal · Buyer access** + **no proprietary GRC-platform conflict** before Approvals. Manual Sales Nav selection; Apollo *or* Prospeo; no LinkedIn scrape plugins.

---

## System of record (do not parallel-spreadsheet)

```
Feed / alert signal
  → Ironleads SUSPECT (or manual CRM on prospect-pool)
  → Enrich real email / E.164 (+ buying committee if useful)
  → Promote PROSPECT (MSSP_ENCLAVE)
  → SalesTeam poll → Approvals ?kind=SALES
  → C1 edit (locks) → C2 live DISPATCH
  → Log shortlist §D
```

Surfaces: `/dashboard/operations/ironleads` · `/dashboard/operations/salesteam` · `/dashboard/admin/approvals?kind=SALES` · `/dashboard/operations/library/icp-shortlist#section-d`  
CLI (with prod DB): `node scripts/dev/b3-list-prospects.mjs`

**Reachability gate (email-first):** Promote / DISPATCH only with a **named buyer business email**. No EMAIL DISPATCH to `@ironleads.local`. **SMS is deferred** — do not Promote on switchboard phone alone; re-enable Textbelt/Twilio later when phone-only buyers are in scope.

---

## Day 1–2 — Three signal pipelines

### 1) Hiring (capacity / client-growth proxy)

Capture roles that imply program or portfolio expansion: GRC, compliance, IR, detection, cloud security, SOC, client onboarding, TPRM.

**Query fragments (combine with company or “MSSP” / “managed security” / “vCISO”):**

```
CISO OR "fractional CISO" OR vCISO
GRC OR "security compliance" OR "risk assessment"
SOC OR "security operations" OR "detection engineering"
"incident response" OR DFIR
"third-party risk" OR "vendor risk"
```

Context-only (do **not** pitch certification speed): `HIPAA` `FFIEC` `NIST` `ISO 27001` `SOC 2`

### 2) Press + partnerships (portfolio / offer expansion)

```
{company} AND (partner OR partnership OR acquired OR acquisition OR expanded OR "new offering" OR "managed services" OR MSSP)
```

Sources: security trade press RSS, MSSP blogs, partner announcement pages; Feedly/Inoreader folders for “MSSP growth”.

### 3) Evidence-pressure (convert lever)

```
evidence OR questionnaire OR "security assessment" OR "audit readiness"
"controls testing" OR "risk register"
board OR "executive reporting"
```

This lane turns “growing MSSP” into **paid co-builder soon**.

**Intake tip:** Feedspot CISO lists / job boards are discovery only — pick **10–20** durable feeds; treat Indeed-class pages as brittle alerts.

---

## Day 3–5 — Enrich + score (≥12/20)

Tag each candidate:

| Field | Values |
|-------|--------|
| Signal type | hiring / partnership / press / evidence-pressure |
| Security capacity expansion | yes/no |
| Client portfolio expansion | yes/no |
| Buyer proximity | CISO / VP Infra / Compliance / Managing Partner / GM / head of MSSP ops / vCISO |
| Urgency proxy | start date, audit readiness, questionnaire churn, quarter close |

Use [target-market scorecard](./target-market-research.md) (min **12/20**).  
**Promote to PROSPECT only if reachable + ≥12/20 + MSSP_ENCLAVE.**

**Pitch hygiene:** client bleed / multi-tenant evidence / board-$ for *their* clients — **not** “faster SOC 2 than Vanta.”

---

## Day 6–7 — DISPATCH by signal (message locks)

Every body: **$4,999** · **10–15 min workflow review** · **no free PoC** · **no demo tenants**.

| Signal | Angle |
|--------|--------|
| Hiring | Workflow review: spreadsheet/heatmap risk → multi-tenant isolation + defendable exposure for client delivery |
| Partnership / press | Co-build next client/evidence pipeline under hard enclaves |
| Evidence-pressure | Questionnaire/audit evidence that is whole-cent / board-defendable for clients |

**Skip:** “Send RFP / IRM bake-off / 2027 platform evaluation” as Path B primary door.

After send: log §D (date · company · trigger · deal/draft id · EMAIL/SMS · next touch).

---

## Day checklist

| Day | Operator actions |
|-----|------------------|
| 1 | Stand hiring + press folders; DISPATCH only **new** Scout PROSPECTs with named buyer + verified channel — **not** BlueRadius or Pivot Point (both HOLD) |
| 2 | Evidence-pressure alerts; Ironleads harvest + promote reachable non-HOLD accounts |
| 3–4 | Enrich top hits → PROSPECT; SalesTeam poll; purge draft dupes |
| 5 | Score pass; hold list ≤15 DISPATCH-ready |
| 6–7 | Batch C1/C2 live sends; log §D; note week-2 handoff to beachhead **A** (BHC) if D is flowing |

---

## Related

- [MSSP 50-account shortlist](./design-partner-mssp-50-shortlist.md) · [ICP shortlist](./design-partner-icp-shortlist.md) · [Offer sheet](./design-partner-offer-sheet.md) · [Outreach sequence](./design-partner-outreach-sequence.md)  
- [Live motion](../ops/design-partner-live-motion-next.md) · [Pre-outreach R4](./design-partner-pre-outreach-run-order.md)
