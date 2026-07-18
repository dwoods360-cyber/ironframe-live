---
Document Type: Marketing Production Plan
Status: ACTIVE
Security Classification: INTERNAL ONLY
Last Updated: 2026-07-18
Series: When Risk Enters the Room
Source brief: User-supplied production plan + scripts (ChatGPT thread not machine-readable without login)
---

# When Risk Enters the Room — Video campaign calendar

Public cinematic series for Ironframe. Fully AI-generated scenes. Canonical production plan and calendar.

## Campaign totals

| Item | Target |
|------|--------|
| Episodes | 5 × 75–90s |
| Main film | 1 × 2–3 min |
| Finished runtime | ~8–10.5 min |
| Expected raw AI footage | ~25–50 min (3–5 gens per kept clip) |
| Production tool (recommended) | Google Flow (Veo) or Runway |
| Full-campaign budget | **$300–$500** DIY |
| Phase-1 budget (Episodes 1–2) | **~$200** |

Do **not** plan on Sora (discontinued Apr 26, 2026).

## CTA lock (message constitution)

Public end cards should prefer:

> Request a **10–15 minute workflow review** → `/register/contact`

Avoid “free pilot” / primary “Request Demo.” Path B design-partner economics stay on pricing/contact surfaces.

Secondary links: `/product-demo`, matching `/solutions/*`.

## Production phases

### Phase 0 — Style lock (2026-07-21 → 2026-07-25)

| Day | Deliverable |
|-----|-------------|
| Mon 7/21 | Character reference sheets (CFO, CISO, risk analyst, auditor, counsel) |
| Tue 7/22 | Boardroom + office environment stills; Ironframe UI plate style |
| Wed 7/23 | Series title card + end-card template |
| Thu 7/24 | Shot list for Episodes 1–2 (4–10s clips) |
| Fri 7/25 | Flow/Runway account + credit plan confirmed ($200 month preferred) |

### Phase 1 — Episodes 1–2 ($200) (2026-07-28 → 2026-08-14)

| Window | Project | Publish target |
|--------|---------|----------------|
| 7/28–8/01 | **V1 — The Risk Register** (*The Number*) generate + select | Wed 8/06 LinkedIn |
| 8/04–8/08 | **V2 — The Audit Request** (*The Evidence*) generate + select | Wed 8/13 LinkedIn |
| 8/11–8/14 | Edit, VO, music, QC both episodes; freeze style pack | — |

### Phase 2 — Episodes 3–5 (2026-08-18 → 2026-09-12)

| Window | Project | Publish target |
|--------|---------|----------------|
| 8/18–8/22 | **V3 — The Wrong Client** (*The Boundary*) | Wed 8/27 |
| 8/25–8/29 | **V4 — The AI-Generated Board Report** (*The Draft*) | Wed 9/03 |
| 9/01–9/05 | **V5 — The Connector** (*The Intake*) | Wed 9/10 |
| 9/08–9/12 | Continuity polish + LinkedIn newsletter tie-in | — |

### Phase 3 — Main film (2026-09-15 → 2026-10-03)

| Window | Project | Publish target |
|--------|---------|----------------|
| 9/15–9/26 | **V6 — The Complete Ironframe Story** (2–3 min) | Wed 10/01 |
| 9/29–10/03 | Cutdowns, captions, product-page embed, Trust/solutions CTAs | — |

## Project register (all six)

| ID | Title | Length | Primary problem | Product surface | Solution page |
|----|-------|--------|-----------------|-----------------|---------------|
| V1 | The Risk Register — *The Number* | 75–90s | Qualitative heatmaps | Quantified scenario / cents | `/solutions/risk-engineering` |
| V2 | The Audit Request — *The Evidence* | 75–90s | Evidence scramble | Control ↔ evidence chain | `/solutions/healthcare` |
| V3 | The Wrong Client — *The Boundary* | 75–90s | Cross-tenant bleed | Isolation / RLS | `/solutions/enterprise` |
| V4 | The AI-Generated Board Report — *The Draft* | 75–90s | Unapproved AI text | HITL draft gate | `/solutions/enterprise` |
| V5 | The Connector — *The Intake* | 75–90s | Reckless automation | Irongate sanitize-before-persist | `/solutions/infrastructure` + intake narrative |
| V6 | The Complete Ironframe Story | 2–3 min | Fragmented incident response | End-to-end workflow | `/product-demo` |

## Generation budget notes

- Prefer **Google Flow Ultra $200/mo** (~250 Quality gens @ 100 credits / 8s) for Phase 1–2.
- Use Quality for boardroom/character; Fast/Lite for exteriors/transitions.
- Runway Max as alternate for image-to-video continuity.
- Ancillary: free editor (Clipchamp/Resolve), narration $0–25, music $0–30, upscaling buffer $20–100.

## Anti-hallucination (on-camera / VO)

- No SOC 2 / ISO certification claims.
- No invented customers or logos.
- Demo tenants (Medshield / Vaultbank / Gridcore) are not customers — use fictional bank/MSP/utility labels only.
- BigInt / whole-cents language is allowed; do not invent live loss figures as real customer data.

## Companion story bank (longer-form)

Persona vignettes for LinkedIn / newsletter / future cutdowns (not separate video IDs yet):

1. The CISO and the Red Square  
2. The CISO and the Missing Evidence  
3. The CRO and the Risk That Would Not Fit  
4. The Data Protection Officer and the Open Door  
5. The CFO and the Word “Material”  
6. General Counsel and the Draft That Almost Escaped  
7. The Head of ITSM and the Emergency Change  
8. The Head of Product Security and the Helpful Agent  

Plus **When the Evidence Breaks** (10 short scenes) for Friday Governance Frame lessons.

## Schedule (canonical: Ops Calendar)

**Canonical task calendar:** Ironframe Ops Hub → [Calendar](/dashboard/operations?tab=calendar).

Seed the video + Governance Frame summer slate (idempotent):

- Ops Hub → Calendar → **Seed summer 2026 slate**, or
- `npx tsx scripts/seed-ops-calendar.ts`

Ops already sends **T-3 / T-2 / T-1 / T-0** reminders against each activity `dueAt`. Markdown in this folder is the production plan only — it does not drive reminders.

Optional personal mirror (not the system of record): [`when-risk-enters-the-room.ics`](./when-risk-enters-the-room.ics) for Google / Outlook / Apple.

## Related

- [Content Calendar](../content-calendar.md)
- [LinkedIn founder cadence](../linkedin-founder-cadence.md)
- Scripts: [episode-scripts.md](./episode-scripts.md)
