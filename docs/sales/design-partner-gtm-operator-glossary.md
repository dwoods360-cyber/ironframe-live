# Design-partner GTM — operator glossary

**Audience:** Human GTM hosts + Ops Hub readers.  
**Not for:** Partner tenants (they use [`/docs/user-manuals/glossary`](/docs/user-manuals/glossary)).  
**Companions:** [Pre-outreach run order](./design-partner-pre-outreach-run-order.md) · [Operator library](/dashboard/operations/library) · [Workforce briefing](./design-partner-workforce-briefing.md)

Short definitions for the Path B design-partner motion. If a term conflicts with partner docs, **partner-facing language wins on calls**; this page is for operators.

---

## Separation of duties (control-first · locked)

Administrative control over platform infrastructure **must stay isolated** from GTM execution. Do **not** invent a `sales_admin` enum until a TAS Amendment defines a GTM-only assignment. Until then, **procedure SoD is mandatory** even when the same human holds multiple hats.

| Lane | Actors | May do | Must not do |
|------|--------|--------|-------------|
| **Platform / commercial control** | `GLOBAL_ADMIN` · `BUSINESS_ADMIN` | Commercial approvals, tenant provision, Path B activation oversight, billing status | Day-to-day top-of-funnel hosting as the default persona |
| **GTM execution** | Human workflow-review **host** · `SalesTeam` drafts (HITL) · `board-sales-lead` briefs | Pipeline progression, peer-to-peer workflow reviews, order-form prep, DISPATCH propose/edit | Global admin boundaries, tenant provision, billing flips |

**Why:** Merging high-privilege Ops Hub administration with top-of-funnel sales execution violates least privilege and weakens a defendable audit posture (separation of duties).

**Code note (drift):** Perimeter surfaces (Ops Hub, LIVE desk, SalesTeam portal) are still session-gated by `GLOBAL_ADMIN | BUSINESS_ADMIN` today. That **does not** authorize collapsing the lanes above. Founders who wear both hats must still execute GTM steps and provision steps as **separate duties** (different checklist rows, different timestamps). A future TAS-scoped GTM host capability (not named `sales_admin` by default) may split the login boundary.

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
| **SalesTeam** | Perimeter worker that drafts StoryBrand outreach → Approvals. Does not auto-send. **GTM lane** — not a substitute for `BUSINESS_ADMIN`. |
| **Approvals (SALES)** | HITL queue at `/dashboard/admin/approvals?kind=SALES`. Commercial send gate; treat as control surface, not casual GTM chat. |
| **PENDING SALES DRAFT** | Draft waiting for human edit + DISPATCH. Use **newest** per contact if dupes appear. |
| **DISPATCH** | Operator-approved send (email Resend / SMS Telnyx|Twilio). |
| **PURGE** | Retire a bad/duplicate draft without sending. |
| **HITL** | Human-in-the-loop — humans host and send; agents are sidecars. |
| **GTM host (human)** | Runs the workflow review + order-form prep. **Not** the provisioner by duty — hand off to `BUSINESS_ADMIN` / `GLOBAL_ADMIN` for `/admin/onboarding`. |
| **BUSINESS_ADMIN** | High-privilege Ops Hub role: platform governance, commercial approvals, tenant provisioning, Path B transition oversight. **Not** the default top-of-funnel sales persona. |
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
