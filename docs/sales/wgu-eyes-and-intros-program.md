# WGU Eyes & Intros Program  
### Ironframe Academic Sandbox Fellowship (IGF) · dual-track with Path B

**Status:** READY — operator program (2026-08-27)  
**Audience:** Founder / GTM ops  
**Library:** `/dashboard/operations/library/wgu-eyes-and-intros`  
**Companions:** [Recruitment](./design-partner-recruitment.md) · [ICP shortlist](./design-partner-icp-shortlist.md) · [Outreach sequence](./design-partner-outreach-sequence.md) · [Four checks](./four-checks-shared-grc-stack.md)

**Bottom line:** Use WGU for **eyes on the product** and **warm intros**. Reserve **design partner / Path B** for people who match the MSSP/vCISO isolation wedge and the paid commercial frame.

**Path B mention rule:** Soft mention **only at the end** of a conversation — after they show multi-client delivery pain or ask about commercial next steps. Never in the first LinkedIn/email touch to students, faculty, or club leads. Never as the headline of Tier 2 / Track A (Eyes).

**Portal brand lock:** `fellows.ironframegrc.com` uses **Ironframe** visual identity (not a WGU site clone). Affinity is **text-only** (e.g. “Built for WGU cybersecurity / MSCSIA candidates”). No WGU logos or WGU marketing palette. Independent academic lab — not a WGU-operated site.

**Phase 1 live path:** `https://fellows.ironframegrc.com/` (also apex `/fellows`) — apply → lab → Missions 01–04 (server receipts) → rubric → completion hash. **Production smoke verified 2026-08-27** (apply → M1–M4 → rubric). Faculty pre-approval asset: [Fellows faculty brief (1-pager)](./fellows-faculty-brief-one-pager.md). Soft-open: capped seats after **one instructor blessing** — no mass student outreach as the first move. Env: `FELLOWS_DATABASE_URL`, `FELLOWS_DIRECT_URL`, `FELLOWS_SESSION_SECRET`.

---

## Two-tier engagement model

```text
┌──────────────────────────────────────────────────────────────┐
│                   TWO-TIER ENGAGEMENT MODEL                  │
├──────────────────────────────┬───────────────────────────────┤
│ Tier 1: Commercial Partner   │ Tier 2: Academic Fellowship   │
│ • Command Design Partner     │ • IGF — Academic Sandbox      │
│ • $4,999 / 90 days           │ • Free non-prod sandbox       │
│ • MSP / MSSP / vCISO ICP     │ • WGU students (coursework)   │
│ • Multi-tenant isolation     │ • Capstone / portfolio labs   │
│ • Soft Path B ask at END only│ • Product eyes; optional intros│
│ • Direct Path B revenue      │ • NOT design partner · NOT Path B│
└──────────────────────────────┴───────────────────────────────┘
```

| | Tier 1 — Commercial | Tier 2 — IGF (Academic) |
|--|---------------------|-------------------------|
| **Who** | MSSP / vCISO / multi-client operators (incl. working alumni who deliver) | WGU students in coursework; faculty-blessed lab sections |
| **Access** | Path B tenant + client-owned operator email | Capped `ironframe-sandbox` (non-production) **or** `/product-demo` + checklist |
| **Ask** | Workflow review → soft Path B **at end** | Lab / friction report; **no** price in first touch |
| **Title** | Command Design Partner | Lab participant / IGF fellow — **not** “Sandbox Auditor,” not a certification |

---

## Why WGU

WGU Cybersecurity / IT / GRC-adjacent paths (incl. MSCSIA and BS tracks) concentrate working adults — many already at MSPs, MSSPs, healthcare IT, gov contractors — plus faculty with practitioner networks.

Valuable for **product stress-testing** and **intro paths**. Not automatically a Path B buyer pool.

---

## Non-goals (hard locks)

| Do not | Why |
|--------|-----|
| Offer free Path B / “VIP tester cohort” | Breaks Path B scarcity |
| Pitch $4,999 / Path B in first student, faculty, or club message | Soft mention **only at end** |
| Call classroom reviewers “design partners” | Dilutes Path B title |
| Brand IGF as a **credential / Sandbox Auditor** | Ironframe does not issue certifications |
| Unlimited free seats for every workshop attendee | Cap + term expiry or it becomes free VIP by another name |
| Give **ICP alumni at MSPs** free sandbox as the primary offer | They get workflow review → Tier 1; free sandbox undercuts Path B |
| Require intros as fellowship quid pro quo | Intros optional when **they** feel employer pain |
| Auto-DISPATCH LinkedIn via SalesTeam | Founder paste / HITL only |
| Lead with demo-tenant screenshots (`medshield`, etc.) | `/product-demo` or controlled sandbox |

---

## Tier 2 — Ironframe Academic Sandbox Fellowship (IGF)

### What the student gets

- Free access to an isolated **non-production** sandbox **or** public `/product-demo` + written lab checklist  
- Hands-on practice: multi-tenant evidence isolation, estimated loss exposure (whole cents, assumptions visible), control/evidence workflow — **honest to what the lab surface actually supports**  
- Portfolio / capstone material suitable for MSCSIA Graduate Capstone or GRC coursework  
- Optional GF research reading (vendor-neutral): https://research.ironframegrc.com  

**Not offered:** Path B economics, design-partner title, “certified auditor” badge, forever seats.

### What Ironframe gets

- Friction reports (UX, methodology, evidence ingestion)  
- Scrutiny of whole-cents math and isolation intuition  
- **Optional** warm intros when a fellow’s **employer** already feels multi-client pain — never a mandatory champion quota  

### Caps (operator lock)

| Rule | Default |
|------|---------|
| Cohort size | **≤20** IGF seats per term (adjust down for ops load) |
| Duration | **60 days** default (≤90 or end of course term) — then revoke / archive |
| Workshop | Cap seats **in the invite**; do not promise “everyone forever” |
| Provisioning | Sandbox ≠ Path B activation; no Stripe; no client-owned commercial mailbox required |

---

## Program flows

```text
Tier 2 — EYES (IGF / curriculum)
  Faculty or club blessing → bounded lab
  → feedback (what broke / what held)
  → optional GF read
  → NO Path B in open
  → if they self-ID as ICP operator at work → switch to Tier 1 flow (workflow review)

Tier 1 door — INTROS (practitioners / ICP alumni)
  Faculty intro or LinkedIn peer ask
  → 10–15 min workflow review (no Path B in open)
  → Fit · Pain · Buyer · Email
  → soft Path B mention ONLY AT END
  → HITL DISPATCH / order form / Path B
```

| Track | Success metric (30–60 days) | Not a success metric |
|-------|----------------------------|----------------------|
| Tier 2 Eyes | 1 faculty yes · 1 lab · written feedback | “N free forever seats” |
| Tier 1 Intros | 3–5 intro chats · 1–2 workflow reviews | InMail volume · forced champion intros |

---

## Lab checklist (Tier 2)

1. Two client enclaves — no cross-bleed intuition  
2. One evidence object with owner / scope  
3. Untrusted ingest → quarantine (if in lab scope)  
4. One board / export packet without soft-tag theater  
5. Optional discussion: [four-checks](./four-checks-shared-grc-stack.md)  

Surfaces: `/product-demo` · `/docs` / training manuals · GF research.

---

## Approaching WGU (institutional)

Order: faculty first → chair/mentor → career services → club **after** faculty blessing.

| Channel | Angle |
|---------|--------|
| **Cyber club / career services** | 45–60 min guest lab: multi-tenant evidence isolation & continuous evidence vs point-in-time theater. **Capped** sandbox/`product-demo` seats — not unlimited |
| **MSCSIA / GRC instructors & capstone evaluators** | Non-commercial lab for evidence ingestion, isolation, estimated exposure — curriculum-aligned, zero Path B in the classroom ask |
| **Courses (examples to research live)** | Cybersecurity management · GRC / risk · graduate capstone — verify current titles before naming them in outreach |

**Faculty ask (email or LinkedIn)** — no Path B:

> Hi {Name} — Dereck Woods, founder of Ironframe (control-first GRC). I’m looking for a small **curriculum stress-test**, not a sales pilot.
>
> Would a WGU security / GRC section benefit from a **60–90 minute lab** on multi-client evidence isolation (walls vs soft tags) using our public product demo + a short checklist? Happy to provide a one-page lab brief and join office hours once.
>
> Separately: if you know **practitioners** already running MSSP / vCISO multi-client GRC who hate shared-stack evidence, I’d value an intro to a **10–15 minute workflow review** — different track from the student lab.
>
> Classroom track is not a commercial seat and not a “design partner” label.

**Assets before first faculty call:** this doc · 1-page lab brief + feedback form · four-checks (optional) · classroom ≠ Path B line.

---

## LinkedIn playbooks

### Search angles

| Theme | Query ideas |
|-------|-------------|
| Faculty | `WGU` + (`faculty` OR `instructor` OR `mentor`) + (`cyber` OR `GRC` OR `information security` OR `compliance`) |
| MSCSIA students (Tier 2) | `WGU` + (`MSCSIA` OR `Master of Science in Cybersecurity`) + (`student` OR `candidate`) |
| Working students | `WGU` + (`MSSP` OR `MSP` OR `vCISO` OR `SOC` OR `GRC`) + student cues |
| ICP alumni (Tier 1 door) | `WGU` + (`alumni` OR WGU) + (`MSSP` OR `MSP` OR `compliance` OR `vCISO`) at delivery orgs |

### Connection notes (short)

**Faculty:**  
> WGU {cyber/GRC} faculty — building a short multi-tenant evidence isolation lab for courses (not a sales pilot). Open to a brief chat on fit?

**Coursework student:**  
> WGU cyber/GRC — we run a small academic sandbox lab for capstone/portfolio (not a sales seat). Open to details if useful this term?

**ICP alumni / working delivery:**  
> Fellow traveler on multi-client GRC — founder at Ironframe. Curious how you keep client evidence isolated today. Open to a short peer workflow review?

---

### Track A — Current MSCSIA / coursework students (Tier 2 eyes)

**Offer:** capped academic sandbox or `/product-demo` lab. **No Path B / $4,999.**

```text
Hi {First Name},

Noticed you’re in the WGU cybersecurity / MSCSIA path.

We’ve built a control-first GRC platform around multi-tenant evidence isolation and estimated financial exposure (whole-cent ranges with visible assumptions — not color-only decision packs).

We’re opening a small Academic Sandbox Fellowship for a few WGU students: non-production lab access to run mock isolation / evidence workflows or support capstone/portfolio work. In exchange we only ask for candid friction notes on the workflows and math.

Not a paid pilot and not a design-partner seat. If a live GRC lab would help your coursework this term, reply and I’ll share the lab brief + access path.

Dereck Woods
Founder, Ironframe
dereck@ironframegrc.com
```

---

### Track B — Alumni / working operators at MSPs · enterprises (Tier 1 door)

**Offer:** workflow review. **Not** free fellowship as the primary ask. Path B soft mention **only at end** if earned.

```text
Hi {First Name},

Saw your profile through the WGU cybersecurity network and your security/compliance work at {Company}.

When your team manages evidence across client or business-unit boundaries, how do you keep registers isolated today — without shared-stack sprawl?

We’ve built Ironframe around hard tenant walls and whole-cent estimated exposure. Would you be open to a 10–15 minute peer workflow review to pressure-test isolation / export / board-pack friction on a real scenario?

(Classroom sandbox is a separate student track — happy to keep that off this thread.)

Dereck Woods
Founder, Ironframe
dereck@ironframegrc.com
```

**If they later say** their MSP/company lives in that mess → soft Path B pivot (see Hand-off).

---

### Track C — Cyber club / student leaders (workshop ingest)

**Offer:** guest lab + **capped** seats. No Path B in the open.

```text
Hi {First Name},

Saw your leadership with the WGU Cybersecurity Club.

Would the club be interested in a practical walkthrough on continuous evidence assurance vs point-in-time packs — and multi-tenant isolation (walls vs soft tags)? We can provision a limited number of non-production lab enclaves for attendees to run a short checklist.

Not a sales pilot. If it fits what you’re running this term, I’ll send a one-page lab brief and seat cap.

Dereck Woods
Founder, Ironframe
dereck@ironframegrc.com
```

---

### Cadence & CRM

| Day | Action |
|-----|--------|
| 0 | Connect + note |
| 3–5 | One value follow-up (lab brief or isolation question) |
| 10+ | Stop or move to email |
| Never | Daily bumps; Path B/$4,999 in first student/faculty/club message |

| Person | CRM |
|--------|-----|
| Faculty / IGF lab | `wgu_eyes` — not Path B PROSPECT |
| ICP alumni / working delivery | Gatekeeper → PROSPECT only when Fit·Pain·Buyer·Email pass |
| Lab participants | Feedback only unless they opt into practitioner track |

---

## Messaging locks

| Say | Don’t say |
|-----|-----------|
| Academic sandbox / curriculum lab | Free design partner / VIP cohort |
| Estimated exposure + visible assumptions | “True ALE” |
| Decision layer vs color-only packs | “Boards are rejecting heatmaps” / “replacing all heatmaps” |
| Workflow review (peer) | Request demo / product tour |
| Soft Path B **only at end** | Path B / $4,999 in the open |
| Lab completion / portfolio project | Sandbox Auditor credential / Ironframe certification |
| Optional intro when they feel employer pain | Mandatory champion / CISO intro quota |

---

## Hand-off to Path B (soft mention only at the end)

**First touches:** lab, isolation ask, workflow review — **no** Path B / $4,999.  
**End only (earned):** they name employer multi-client pain *or* ask how companies buy → soft pivot:

> If {Company} is feeling that multi-tenant evidence / board-pack friction today, we run a separate **Command Design Partner** seat — 90 days, flat fee, around 2–3 criteria you set. Who owns multi-client tooling or vCISO delivery on your side?

```text
Conversation
  → workflow review (no Path B in the open)
  → Fit · Pain · Buyer · Email PASS
  → soft Path B mention (END ONLY)
  → Approvals HITL DISPATCH
  → order form + client-owned operator email
  → Path B activation
```

Classroom / IGF feedback **never** auto-creates a Path B offer.

---

## 30-day operator checklist

- [ ] Identify 5–10 WGU faculty / mentors  
- [ ] Draft 1-page lab brief + feedback form; set IGF seat cap for the term  
- [ ] Send 5 faculty approaches  
- [ ] Send Track A messages to coursework MSCSIA/BS students (Tier 2 only)  
- [ ] Send Track B messages to **ICP** alumni/working operators (workflow review — no free sandbox lead)  
- [ ] Optional Track C: one club advisor after faculty blessing  
- [ ] Book ≤2 workflow reviews when gates pass; Path B soft mention only at end  
- [ ] Log `wgu_eyes` / `wgu_intro` on ops calendar — no auto-DISPATCH  

---

## Related

- [Design partner recruitment](./design-partner-recruitment.md)  
- [Week-1 MSSP Scout playbook](./design-partner-week1-mssp-scout-playbook.md)  
- [Workflow review protocol](./design-partner-workflow-review-protocol.md)  
- [Control-to-Capital](./control-to-capital-market-narrative.md)  
- Student / partner manuals: `/docs` · GF: https://research.ironframegrc.com  
