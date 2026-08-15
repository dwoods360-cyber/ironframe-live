---
Document Type: Video Production Working Pack
Status: ACTIVE
Security Classification: INTERNAL ONLY
Series: When Risk Enters the Room
Episode: V3 — The Wrong Client (The Boundary)
Last Updated: 2026-08-14
Canonical hub: ./when-risk-enters-the-room.md
Script: ./v3-the-wrong-client.md
Production script (shot-by-shot + AI prompts): ./v3-production-script.md
Full form: ./v3-the-boundary-production-form.md
---

# V3 kickoff — Phase 2 shot list (*The Boundary*)

**Goal:** Generate V3 (*The Boundary*) for publish **Fri 2026-09-11**.  
**Window:** Phase 2 generate/select **2026-08-18 → 2026-08-22** (edit/VO can trail).  
**Budget:** Remainder of $300–$500 campaign (prefer Google Flow Ultra; Runway Max alternate).  
**CTA lock:** 10–15 minute workflow review → `/register/contact` only.  
**Solution CTA (secondary):** `/solutions/enterprise`

**Full production pack:** [v3-production-script.md](./v3-production-script.md) · [v3-the-boundary-production-form.md](./v3-the-boundary-production-form.md)

Reuse **Phase 0 series chrome** (title/end card templates, navy/charcoal look, no-logo rule). Do **not** re-spend Quality on boardroom CFO refs — V3 is MSP desk + isolation UI.

---

## Continuity from Phase 0 / V1–V2 (reuse)

| Asset | Action |
|-------|--------|
| Series title / end-card templates | Reuse; swap episode line to **Episode 3: The Boundary** |
| Global style + negative prompts | Same as V1 pack |
| Folder | `Videos/WhenRisk/V3/` with `refs/`, `raw/`, `selects/`, `edit/` |

---

## V3-only reference stills (generate these first)

| ID | Role / plate | Notes |
|----|--------------|-------|
| REF-ANALYST | MSP / shared-services analyst, 30s–40s, headset optional, sleeves, laptop-forward | Speaks: "That should not be here." |
| REF-AUDITOR | Internal / external auditor, 40s–50s, plain blazer, reading tablet/laptop | Isolation test open |
| REF-MSP-DESK | Open-plan MSP / SOC-adjacent desk, dual monitors, soft daylight, no vendor logos | Cold open environment |
| REF-SHARED-UI | Generic multi-client admin console (NOT Ironframe) — Client A / Client B tabs, blurred labels | Bleed beat |
| REF-UI-BOUNDARY | Ironframe dark ops console: workspace identity, role, RLS, entity scope, query scope, export restriction, privileged action log; deny + alert | Fictional MSP label **Harborline Managed** only |
| REF-ISOLATION-REPORT | Clean report UI: permitted vs denied isolation test cases | Proof beat |

**Prompt seed:**  
`Cinematic still, photoreal corporate [SUBJECT], soft desk key light, shallow DOF, muted navy and charcoal palette, no visible brand logos, no text on clothing, 35mm, continuity with locked refs`

---

## V3 — Shot list (4–10s clips)

Script: [v3-the-wrong-client.md](./v3-the-wrong-client.md). Target **75–90s**. Expect **3–5 gens per kept clip**.

| # | Scene | Duration | Visual | VO / dialogue | Gen notes |
|---|-------|----------|--------|---------------|-----------|
| 1 | Title | 3–4s | Series + Episode 3: The Boundary | — | Static/Canva OK |
| 2 | 1 open | 6–8s | Analyst at MSP desk; Client A report loading | — | Quality; REF-ANALYST + REF-MSP-DESK |
| 3 | 1 flash | 4–5s | Fraction-second Client B control record in results | — | Quality; REF-SHARED-UI |
| 4 | 1 freeze | 4–6s | Analyst freezes on screen | **Analyst:** "That should not be here." | Lip-sync optional |
| 5 | 2 VO | 8–10s | Soft push on multi-client / multi-entity shared platform UI | **N:** "Multi-client and multi-entity systems depend on more than labels. Every query, export, background job, support action, and administrative privilege must remain inside its authorized boundary." | May split VO across #5–#7 |
| 6 | 2 problem | 4–5s | Export / download crossing entity filter | — | Fast/Lite |
| 7 | 2 problem | 4–5s | Admin / support impersonation toggle (abstract) | — | Fast/Lite; no real product logos |
| 8 | 3 Ironframe | 8s | Boundary UI stack: identity → role → RLS → entity → query → export → privileged log | **N:** "Ironframe applies governed isolation throughout the workflow—not only at the interface." | REF-UI-BOUNDARY |
| 9 | 3 deny | 5–7s | Cross-tenant request **denied**; alert records attempt | — | Quality; alert toast readable as abstract |
| 10 | 4 auditor | 6–8s | Auditor opens isolation test report (permitted / denied cases) | **N:** "Separation is not established by saying clients are separate. It is established by controls that can be tested." | REF-AUDITOR + REF-ISOLATION-REPORT |
| 11 | End card | 5–6s | IRONFRAME + multi-entity line + CTA | — | Exact CTA; UTM at publish |

**Clip budget hint:** ~11 keeps × ~4 gens ≈ **~45 Quality-equivalent** — fits Phase 2 remainder if Fast used for #6–#7.

---

## Anti-hallucination (on-camera / VO)

- [ ] No SOC 2 / ISO certification claims  
- [ ] No invented customers or logos  
- [ ] Demo tenants (Medshield / Vaultbank / Gridcore) **not** named  
- [ ] Fictional MSP label only: **Harborline Managed** · Client A / Client B (or West / East) as labels — not real firms  
- [ ] No "we are multi-tenant certified" language  
- [ ] CTA = workflow review only  

---

## Locked assets (2026-08-14)

Local folder: `Videos/WhenRisk/V3/`

| Asset | Path |
|-------|------|
| REF-ANALYST | `refs/REF-ANALYST.png` |
| REF-AUDITOR | `refs/REF-AUDITOR.png` |
| REF-MSP-DESK | `refs/REF-MSP-DESK.png` |
| REF-SHARED-UI | `refs/REF-SHARED-UI.png` |
| REF-UI-BOUNDARY | `refs/REF-UI-BOUNDARY.png` |
| REF-ISOLATION-REPORT | `refs/REF-ISOLATION-REPORT.png` |
| Title card | `cards/CARD-TITLE-V3.png` |
| End card | `cards/CARD-END-V3.png` |

**Status:** Phase 2 refs + series chrome locked. Next = Flow/Runway image-to-video for shots 02–10.

---

## Operator sequence (start now)

1. ~~Generate refs + title/end cards~~ **DONE** (see Locked assets).  
2. Confirm Flow/Runway credits for Phase 2.  
3. Generate clips **in shot order** (`#v3-build` / Phase 2 window) using locked refs — start Shot 02.  
4. Edit → captions → 9:16 cutdown → publish **Fri 2026-09-11**.

## Related

- Hub: [when-risk-enters-the-room.md](./when-risk-enters-the-room.md)  
- Narrative: [v3-the-wrong-client.md](./v3-the-wrong-client.md)  
- Budget: [budget-and-production.md](./budget-and-production.md)  
- Sibling theme (LinkedIn): *Collection is not verification* — provenance / entity / auth; keep as text post, not a remake of this episode  
- Ops: Phase 2 · V3 publish  
