# Design-partner GTM — operator glossary

**Audience:** GLOBAL_ADMIN / BUSINESS_ADMIN hosts (Ops Hub).  
**Not for:** Partner tenants (they use [`/docs/user-manuals/glossary`](/docs/user-manuals/glossary)).  
**Companions:** [Pre-outreach run order](./design-partner-pre-outreach-run-order.md) · [Operator library](/dashboard/operations/library)

Short definitions for the Path B design-partner motion. If a term conflicts with partner docs, **partner-facing language wins on calls**; this page is for operators.

---

## Pipeline stages

| Term | Meaning |
|------|---------|
| **SUSPECT** | Early CRM stage from Ironleads / OSINT. Not yet ready for Path B ask. Needs enrichment (website, buyer, blockers). |
| **Buying-committee research** | Ironleads enrichment that maps likely CISO/CFO/sponsor contacts + switchboard phones onto a SUSPECT before outreach. |
| **PROSPECT** | Qualified enough for SalesTeam outreach drafts and Approvals DISPATCH. |
| **CLOSED_WON / ACTIVE** | Partner accepted Path B; billing ACTIVE; SuccessTeam / onboarding owns adoption. |
| **CLOSED_LOST** | Disqualified or retired (including noise SUSPECTs). |

---

## Commercial locks

| Term | Meaning |
|------|---------|
| **Path B** | Paid design-partner seat: flat **$4,999** for default **90 days**, with **2–3 written success criteria**. Not a free pilot. |
| **Command Tier** | Same commercial path as Path B in packaging language. |
| **Order form** | Captures criteria + client-owned operator email before provision. |
| **Path B activation link** | Tenant-scoped Stripe / activation URL. **Never** send generic `/pricing` to a PENDING partner. |
| **Client-owned operator email** | Partner’s real work email for provision — not `@ironframegrc.com`. |

---

## Outreach & HITL

| Term | Meaning |
|------|---------|
| **SalesTeam** | Perimeter worker that drafts StoryBrand outreach → Approvals. Does not auto-send. |
| **Approvals (SALES)** | HITL queue at `/dashboard/admin/approvals?kind=SALES`. |
| **PENDING SALES DRAFT** | Draft waiting for human edit + DISPATCH. Use **newest** per contact if dupes appear. |
| **DISPATCH** | Operator-approved send (email Resend / SMS Telnyx|Twilio). |
| **PURGE** | Retire a bad/duplicate draft without sending. |
| **HITL** | Human-in-the-loop — humans host and send; agents are sidecars. |
| **Message lock** | Required copy: $4,999 · workflow-review CTA · no free PoC · no demo-tenant-as-customer. |
| **Workflow review CTA** | Primary ask: **10–15 minute** peer-to-peer diligence call — not “Request Demo.” |
| **Touch 1 / 2 / 3** | Outreach sequence cadence (see outreach sequence doc). |

---

## Call assist

| Term | Meaning |
|------|---------|
| **Workflow review** | The 15-min diligence call itself (protocol + LIVE tool). |
| **LIVE sidecar** | `/dashboard/operations/workflow-review` — mic STT, buying signs, Q&A while **you** host. |
| **Pocket answer** | Typed Q&A lookup on the LIVE page (not the Hey Pocket hardware). |
| **Buying signs** | Detected intent signals (price ask, order-form ask, stakeholder intro, etc.). |
| **Close readiness** | Score/band for whether Path B ask is earned. |
| **Call recap** | Post-call summary + Path B ask + action items (End LIVE → recap). |
| **Push to calendar** | Writes recap action items to Ops Hub Calendar as `OPS_GENERAL` cards. |
| **Teams Graph** | Optional Azure connect for meeting create / post-call transcript. Mic LIVE remains the in-call path. |

---

## Perimeter workers

| Term | Meaning |
|------|---------|
| **Ironleads** | OSINT / trigger harvest → SUSPECT ingress (`:8083` / Ops portal). |
| **SalesTeam** | PROSPECT outreach drafts (`:8084`). |
| **SuccessTeam** | Post–CLOSED_WON adoption / CS drafts. |
| **SupportTeam** | Break/fix intake drafts. |
| **Ironboard** | Advisory boardroom / strategy — not DISPATCH. |
| **Ops Hub** | Operator control surface at `/dashboard/operations`. |
| **Operator library** | Doc directory at `/dashboard/operations/library`. |

---

## Banned / careful language

| Term | Operator rule |
|------|----------------|
| **Free PoC / free pilot / free trial** | Do not offer. Redirect to Path B. |
| **Request Demo** | Not the primary CTA; diligence first. |
| **medshield / vaultbank / gridcore** | Engineering **seed** tenants — never cite as customers. |
| **SOC 2 Type II (logo claim)** | Do not claim completed logo unless true; use SOC2-aligned diligence language. |

---

## Related glossaries

| Doc | Use when |
|-----|----------|
| [Partner plain-English glossary](/docs/user-manuals/glossary) | Explaining ALE, WORM, billing gate to partners |
| [QA complete feature glossary](/dashboard/operations/library/qa-feature-glossary) | Deep screen / lab reference (internal) |
| [Governance Frame glossary](../governance-frame/style/glossary.md) | Editorial / GF publication terms |
