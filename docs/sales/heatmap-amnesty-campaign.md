# Heatmap Amnesty — campaign pack (CISO / CFO)

**Status:** ACTIVE · Priority-1 outbound for Path B  
**Public page:** `/marketing/heatmap-amnesty`  
**CTA:** 10–15 min workflow review → `/register/contact`  
**Audience:** Mid-market CISOs, CFOs, VP Risk / Compliance at multi-entity operators (BHC · UTIL · HEALTH · MSSP buyers who sit in board risk reviews)  
**Doctrine:** [Control-to-Capital narrative](./control-to-capital-market-narrative.md)

---

## Positioning (one line)

Stop defending **Red/Yellow/Green** as the board decision layer. Report **estimated loss exposure in whole cents** — with assumptions visible — then link controls, evidence, and remediation in one isolated command post.

---

## Landing page copy (canonical — matches live page)

**Eyebrow:** Heatmap Amnesty  
**Brand:** IRONFRAME  
**Headline:** Amnesty for color-coded guesswork  
**Support:** Keep the heatmap if you must. Make **estimated dollar exposure** the layer your board uses to allocate capital.  
**Primary CTA:** Schedule workflow review  
**Secondary:** Open Command Design Partner terms (`/pricing` or offer sheet — prefer contact)

**Body beats (below fold):**

1. **The decision gap** — Stoplight tiles don’t survive a CFO conversation the way market or credit risk does. NACD-style oversight wants probable impact, frequency, and spend vs exposure — not another 5×5.  
2. **What we replace** — Qualitative high/medium/low as the *truth* layer → whole-cent estimated exposure with visible assumptions.  
3. **What we don’t claim** — We don’t invent FAIR-only monopoly, “true ALE,” or “competitors can’t quantify.” We operationalize exposure inside the daily GRC loop with hard tenant walls.  
4. **Path B** — Command Design Partner $4,999 / 90 days / 2–3 written criteria / convert credit to year-1 Command.

---

## Email sequence (3 touches · HITL only)

### Touch 1 — Problem (CISO or CFO)

**Subject options:**
- Board risk in dollars, not tiles  
- Heatmap Amnesty for your next risk committee  
- When Red/Yellow/Green stops being enough  

**Body:**

```
{{FirstName}} —

Quick question for your next risk / audit committee pack:

Is the decision layer still a 5×5 color chart, or do you already show estimated loss exposure in dollars (with assumptions) the way finance shows other enterprise risks?

We’re opening a small Command Design Partner cohort ($4,999, 90-day convert-or-exit) for multi-entity operators who want whole-cent exposure, hard tenant walls, and auditor-ready exports in one command post — not another checkbox shelf.

Worth a 10–15 minute workflow review on how your board pack is built today?

{{Sender}}
Ironframe
```

### Touch 2 — Mechanism (3–5 business days later)

**Subject:** Estimated exposure beats “High”  

**Body:**

```
{{FirstName}} —

Following up with the mechanism, not a feature list:

Controls → evidence → scenarios → estimated loss exposure (ranges) → mitigation cost → residual exposure.

Heatmaps can stay as context. The decision layer should be dollars the CFO can argue with — stored in whole cents, not float theater.

If useful, we can walk your current board/export workflow in 10–15 minutes (no product circus). Command Design Partner seats are capped.

{{Sender}}
```

### Touch 3 — Soft close (5–7 business days later)

**Subject:** Command Design Partner — workflow review?  

**Body:**

```
{{FirstName}} —

Last note from me on this:

Command Design Partner is $4,999 for a 90-day co-builder window (2–3 written success criteria; Path B fee credits year-1 Command if you convert in-window).

If board-dollar exposure + entity isolation isn’t a live pain this quarter, I’ll close the loop. If it is, reply with a time for a short workflow review — or grab a slot via {{contact_link}}.

{{Sender}}
```

---

## SMS (only if Twilio live + named mobile)

```
{{FirstName}} — Ironframe: board risk in whole-cent exposure vs heatmap-only packs. 10–15 min workflow review? Reply YES or stop.
```

---

## Objection locks

| Objection | Response |
|-----------|----------|
| “We already have CRQ / FAIR elsewhere” | Good — we don’t replace a specialist CRQ program as the pitch. Path B makes estimated exposure + evidence + enclaves the **daily** loop, not a quarterly spreadsheet export. |
| “SEC requires dollars” | No — materiality is quantitative *and* qualitative. Dollars improve defensibility; they aren’t a FAIR mandate. |
| “Heatmaps are required by our board” | Keep them. Amnesty is for using color as the *only* decision layer. |
| “Vanta/Drata already do multi-framework” | Different job. We lead with exposure + isolation; mapping is supporting. |

---

## Ops

1. Enrich named buyer on ICP §A before DISPATCH.  
2. SalesTeam draft → Approvals HITL — never auto-send.  
3. Log touches on shortlist.  
4. Counsel D0 still gates first *paid* signature — campaign may run as workflow-review demand gen.
