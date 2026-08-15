---
Document Type: Video Production Script
Status: ACTIVE
Security Classification: INTERNAL ONLY
Series: When Risk Enters the Room
Episode: V3 — The Wrong Client (The Boundary)
Last Updated: 2026-08-14
Canonical hub: ./when-risk-enters-the-room.md
Narrative: ./v3-the-wrong-client.md
Kickoff: ./v3-kickoff-phase2-shotlist.md
Full form: ./v3-the-boundary-production-form.md
Format: 16:9 master · 9:16 cutdown later
Target length: 75–90 seconds
Tool: Google Flow (preferred) or Runway · image-to-video from V3 refs
---

# V3 — The Boundary — production-ready script

**Logline:** An MSP analyst building a Client A report glimpses Client B — Ironframe proves isolation with deny paths and testable boundaries, not labels.

**Tone:** Institutional thriller, not product ad. Quiet desk. Hard cuts. No hype music stings.

**CTA:** Request a 10–15 minute workflow review → `/register/contact`

**Secondary:** `/solutions/enterprise`

---

## Global style (attach to every image/video prompt)

```
Photoreal cinematic corporate drama, muted navy charcoal and soft tungsten practicals,
shallow depth of field, 35mm anamorphic feel, no visible brand logos, no readable real
company names, no SOC2/ISO badges, no Medshield/Vaultbank/Gridcore labels, no stock-photo
smiles, restrained motion, continuity with locked character and desk reference stills.
```

**Negative prompt (always):**
```
logo, watermark, readable email address, real brand, certificate badge, cartoon, anime,
text overlay gibberish, extra fingers, warped faces, HUD sci-fi neon overload
```

---

## Phase 2 — Reference stills (generate these first)

Save winners to `Videos/WhenRisk/V3/refs/`.

### REF-ANALYST
```
Cinematic still portrait of an MSP shared-services analyst in their mid-30s, plain dark
shirt, sleeves rolled, headset resting on neck optional, focused laptop-forward posture,
soft desk key light, shallow depth of field, muted navy and charcoal palette, photoreal,
35mm, no logos, no text on clothing
```

### REF-AUDITOR
```
Cinematic still of an auditor in their late 40s, plain charcoal blazer over simple shirt,
reading a tablet with calm scrutiny, soft office light, shallow DOF, muted palette,
photoreal, 35mm, no logos
```

### REF-MSP-DESK
```
Wide cinematic still of a modern MSP open-plan desk area, dual monitors on a clean desk,
soft daylight through blinds, navy charcoal palette, empty of people, photoreal, 24mm wide,
no vendor logos, no readable tickets
```

### REF-SHARED-UI
```
UI plate still: generic multi-client admin console (not Ironframe), tabs labeled Client A
and Client B with blurred control-record rows, soft screen glow, crisp product UI not
sci-fi HUD, fictional MSP workspace only, no real logos
```

### REF-UI-BOUNDARY
```
UI plate still: dark Ironframe operations console showing workspace identity, user role,
row-level policy, entity scope, query scope, export restriction, privileged action log,
cyan accents, fictional tenant label "Harborline Managed" only, crisp product UI, not
sci-fi HUD
```

### REF-ISOLATION-REPORT
```
UI plate still: clean isolation test report with two columns Permitted and Denied test
cases, abstract case IDs only, dark ops theme cyan accents, Harborline Managed label only,
photoreal screen, no logos
```

### REF-TITLE / REF-END
Build in Canva or Resolve (static). Copy locked in shots 01 and 11.

---

## Timeline (75–90s)

| T | Shot | Content |
|---|------|---------|
| 0:00–0:04 | 01 | Title card |
| 0:04–0:12 | 02 | Analyst + Client A report loading |
| 0:12–0:17 | 03 | Client B flash in results |
| 0:17–0:23 | 04 | Freeze + "That should not be here." |
| 0:23–0:33 | 05 | Narrator on multi-client boundaries |
| 0:33–0:42 | 06–07 | Problem montage (export / admin) |
| 0:42–0:50 | 08 | Ironframe isolation stack |
| 0:50–0:57 | 09 | Deny + alert |
| 0:57–1:06 | 10 | Auditor isolation test + closing VO |
| 1:06–1:14 | 11 | End card |

---

## Shot-by-shot

### Shot 01 — Title · 3–4s · static

| | |
|--|--|
| **Visual** | Dark plate, series wordmark, episode title |
| **On-screen** | When Risk Enters the Room · Episode 3: The Boundary |
| **VO / dialogue** | — |
| **SFX / music** | Low ambient room tone starts under |
| **Camera** | Hold |
| **Gen** | Canva / Resolve — no AI video credits |

---

### Shot 02 — Cold open · 6–8s · Quality

| | |
|--|--|
| **Visual** | Analyst at MSP desk; dual monitors; Client A report loading |
| **On-screen** | Optional soft: Client A |
| **VO** | — |
| **SFX** | Soft HVAC / mouse click |
| **Camera** | Slow push toward analyst and primary screen |
| **Image→video prompt** | `Using REF-ANALYST and REF-MSP-DESK: analyst at dual-monitor MSP desk watches a Client A report load on screen, soft daylight, photoreal, restrained camera push, no logos, no readable PII` |

---

### Shot 03 — Bleed flash · 4–5s · Quality

| | |
|--|--|
| **Visual** | Results list: for a fraction of a second a Client B control record appears |
| **On-screen** | Brief flash: Client B (then cut) |
| **VO** | — |
| **SFX** | Soft digital glitch / wrong-note click |
| **Camera** | Screen insert, hard cut |
| **Image→video prompt** | `Using REF-SHARED-UI: close on multi-client console results where a Client B control record briefly appears among Client A rows, subtle flash highlight, photoreal screen, no real company names` |

---

### Shot 04 — Freeze · 4–6s · Quality

| | |
|--|--|
| **Visual** | Analyst freezes; eyes locked on screen |
| **On-screen** | Optional lower-third: Analyst |
| **Dialogue** | **Analyst:** "That should not be here." |
| **SFX** | Dialogue clear; sparse underscore |
| **Camera** | Medium close, slight push |
| **Image→video prompt** | `Using REF-ANALYST: medium close of MSP analyst freezing mid-click, eyes locked on laptop screen glow, tense recognition, photoreal, subtle stillness, no logos` |
| **Note** | Lip-sync optional; burn dialogue as VO + caption OK |

---

### Shot 05 — Narrator beat · 8–10s · Quality or Fast

| | |
|--|--|
| **Visual** | Soft push on shared multi-client / multi-entity platform UI |
| **On-screen** | Optional: More than labels |
| **VO** | **N:** "Multi-client and multi-entity systems depend on more than labels. Every query, export, background job, support action, and administrative privilege must remain inside its authorized boundary." |
| **SFX** | Soft underscore enters |
| **Camera** | Slow push on screen |
| **Image→video prompt** | `Using REF-SHARED-UI: slow cinematic push on generic multi-client admin console with Client A and Client B tabs, blurred rows, photoreal, no logos` |

---

### Shot 06 — Problem · export bleed · 4–5s · Fast

| | |
|--|--|
| **Visual** | Export / CSV download dialog that ignores entity filter (abstract) |
| **Prompt** | `Close cinematic shot of an export dialog downloading a spreadsheet while an entity filter toggle is visibly off or ignored, blurred filenames, corporate desk, photoreal, no logos` |

---

### Shot 07 — Problem · support privilege · 4–5s · Fast

| | |
|--|--|
| **Visual** | Abstract "view as client" / support impersonation toggle |
| **Prompt** | `Extreme close-up of an admin console toggle labeled View as client with soft warning glow, shallow DOF, photoreal UI, no vendor logos, no readable customer names` |

---

### Shot 08 — Ironframe stack · 8s · Quality

| | |
|--|--|
| **Visual** | Ironframe UI: workspace identity, role, RLS, entity scope, query scope, export restriction, privileged action log |
| **On-screen** | Subtle: Harborline Managed (fictional) |
| **VO** | **N:** "Ironframe applies governed isolation throughout the workflow—not only at the interface." |
| **Camera** | Gentle pan down the isolation stack |
| **Image→video prompt** | `Using REF-UI-BOUNDARY: gentle camera pan across dark ops console showing workspace identity, user role, row-level policy, entity scope, query scope, export restriction, and privileged action log, cyan accents, Harborline Managed label only, crisp UI, photoreal screen` |
| **Alt** | Record a sanitized local UI walkthrough if AI UI gibbers — preferred if plate fails |

---

### Shot 09 — Deny + alert · 5–7s · Quality

| | |
|--|--|
| **Visual** | Cross-tenant request denied; alert records the attempt |
| **On-screen** | Denied · Attempt logged |
| **VO** | — (hold under prior VO tail or silent beat) |
| **Image→video prompt** | `Using REF-UI-BOUNDARY: Ironframe console shows a cross-tenant request denied with an alert toast recording the attempt, subtle red deny state then calm cyan log entry, photoreal UI, Harborline Managed only, no logos` |

---

### Shot 10 — Auditor proof · 6–8s · Quality

| | |
|--|--|
| **Visual** | Auditor opens isolation test report — permitted vs denied cases |
| **VO** | **N:** "Separation is not established by saying clients are separate. It is established by controls that can be tested." |
| **Image→video prompt** | `Using REF-AUDITOR and REF-ISOLATION-REPORT: auditor reviews isolation test report with Permitted and Denied columns on tablet or laptop, calm scrutiny, soft office light, photoreal, no logos` |

---

### Shot 11 — End card · 5–6s · static

| | |
|--|--|
| **On-screen** | **IRONFRAME** · Multi-entity governance with demonstrable boundaries. · Request a 10–15 minute workflow review |
| **URL** | ironframegrc.com/register/contact (add UTM at publish) |
| **Gen** | Canva / Resolve |

---

## Full VO + dialogue (record as one pass)

```
ANALYST: That should not be here.

NARRATOR: Multi-client and multi-entity systems depend on more than labels. Every query, export, background job, support action, and administrative privilege must remain inside its authorized boundary.

NARRATOR: Ironframe applies governed isolation throughout the workflow—not only at the interface.

NARRATOR: Separation is not established by saying clients are separate. It is established by controls that can be tested.
```

**VO direction:** Neutral institutional male or female; no radio-ad energy; leave room under freeze after analyst line.

---

## ChatGPT — paste this to refine prompts (optional)

```
You are the production assistant for Ironframe's series "When Risk Enters the Room," Episode 3 "The Boundary."

Constraints:
- CTA only: 10–15 minute workflow review
- No SOC 2 / ISO claims, no invented customers, no Medshield/Vaultbank/Gridcore as customers
- Fictional MSP label only: Harborline Managed; Client A / Client B labels OK
- Photoreal cinematic, muted navy/charcoal, no logos
- Output: improve Flow/Runway image-to-video prompts shot-by-shot; keep dialogue and VO wording locked exactly as provided

I will paste one shot at a time. Return: Final image prompt, Final video prompt, Camera, Duration, Continuity notes.
```

---

## Anti-hallucination checklist (before publish)

- [ ] No cert claims on screen or VO  
- [ ] No real customer logos  
- [ ] Demo tenants not named  
- [ ] Harborline Managed / Client A–B only  
- [ ] CTA = workflow review only  
- [ ] Captions match locked VO  

---

## Operator — start now

1. Generate **REF-ANALYST, REF-AUDITOR, REF-MSP-DESK, REF-SHARED-UI, REF-UI-BOUNDARY, REF-ISOLATION-REPORT**.  
2. Build Episode 3 title + end cards.  
3. Generate shots **02→10** in order with locked refs.  
4. Edit + captions + 9:16 → publish window **2026-09-11**.
