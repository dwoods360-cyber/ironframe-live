# Pre-outreach dry-run — operator run order

**Purpose:** Verify the machine once, **in order**, before any real partner DISPATCH.  
**Timebox:** ~30–45 minutes. **Stop on first hard fail** in R3–R6.  
**Audience:** GLOBAL_ADMIN or designated BUSINESS_ADMIN (human host).  
**In-app directory:** Ops Hub → **Operator library** → `/dashboard/operations/library`  
(this doc: `/dashboard/operations/library/pre-outreach-run-order`)

**Companions:**  
[GTM operator glossary](./design-partner-gtm-operator-glossary.md) ·  
[Launch checklist](./design-partner-operator-launch-checklist.md) ·  
[Workflow review protocol](./design-partner-workflow-review-protocol.md) ·  
[Offer sheet](./design-partner-offer-sheet.md) ·  
[Order form](./design-partner-order-form.md) ·  
[Outreach sequence](./design-partner-outreach-sequence.md)

| Result | Meaning |
|--------|---------|
| **GO** | R1–R8 all Pass → proceed to [launch checklist §C](./design-partner-operator-launch-checklist.md) for real sends |
| **HOLD** | Any Fail in **R3–R6** → fix, then re-run only the failed R# (not the whole list) |

---

## 0. Before you start (2 min)

### 0.1 Browser

1. Use **Chrome** or **Edge** (required for LIVE mic).
2. Allow **microphone** for this site when prompted.
3. Prefer speakers (not exclusive headset) if you will later hear a prospect via the same mic path.

### 0.2 Base URL

| Environment | Base |
|-------------|------|
| Local | `http://127.0.0.1:3000` |
| Production | `https://www.ironframegrc.com` (or your current apex) |

Below, paths are written as `/dashboard/...` — prefix with your base.

### 0.3 Open these six tabs (leave them open)

| Tab | Full path | Why |
|-----|-----------|-----|
| A | `/dashboard/operations` | Ops Hub home |
| B | `/dashboard/operations/ironleads` | SUSPECT / harvest |
| C | `/dashboard/operations/salesteam` | SalesTeam portal |
| D | `/dashboard/admin/approvals?kind=SALES` | Draft queue + DISPATCH |
| E | `/dashboard/operations/workflow-review` | LIVE sidecar + recap |
| F | `/dashboard/operations?tab=calendar` | Action items after push |

### 0.4 Optional rail audit (terminal)

From repo root:

```bash
npx tsx scripts/dev/pre-outreach-run-order-audit.ts
```

Expect: `allMessageLocksPass: true` and at least one PENDING draft. This does **not** replace R3/R5 human steps.

---

## R1 — Operator access (~2 min)

### Steps

1. Go to `/login` if needed. Sign in as the platform GLOBAL_ADMIN (or designated BUSINESS_ADMIN).
2. Open tab **A**: `/dashboard/operations`.
3. Confirm the page title/area is **Operations** / Ops Hub (not a tenant Command Post only).
4. Open tab **D**: `/dashboard/admin/approvals?kind=SALES`.
5. Confirm you see a **SALES** queue (list or empty state), not “403” / “Perimeter workforce operator session required.”

### Pass criteria

| # | Pass when |
|---|-----------|
| R1.1 | Signed in with operator email |
| R1.2 | Ops Hub loads (no 403) |
| R1.3 | Approvals SALES page loads |

### Fail → fix

- Wrong account → switch to GLOBAL_ADMIN / BUSINESS_ADMIN.  
- 403 on Ops Hub → role assignment missing; do not continue.

**R1 done:** ☐

---

## R2 — Message lock spot-check (~3–5 min)

### Steps

1. Stay on Approvals: `/dashboard/admin/approvals?kind=SALES`.
2. In the left/queue list, open the **newest** PENDING draft for a known prospect  
   (today’s batch: **Pivot Point Security** or **BlueRadius Cyber**).
3. If two rows look like the same company, pick the **newest** (older may be purged/dupes). Prefer **PURGE** on stale duplicates so only one PENDING draft remains per contact.
4. Read the **editable body** in the detail pane (full draft text).
5. Check channel readiness:
   - Email ends with `@ironleads.local` → you must use **SMS** on DISPATCH (no real inbox).
   - Real email (e.g. `info@…`) → EMAIL or SMS OK.
   - Confirm a **phone** exists if using SMS.

### Must see / must not see

**R2.1–R2.4 = commercial message locks (necessary).**  
**R2.5–R2.8 = content quality (also necessary).** Locks alone are **not** a DISPATCH yes.

| # | Must see in draft | Must NOT see | Pass |
|---|-------------------|--------------|------|
| R2.1 | `$4,999` (or 4999) and Path B / 90-day co-builder frame | `free PoC`, `free pilot`, `free trial` | ☐ |
| R2.2 | CTA toward **workflow review** (10–15 min) | “Request Demo” as the main ask | ☐ |
| R2.3 | — | `medshield`, `vaultbank`, `gridcore` as customers | ☐ |
| R2.4 | Usable **email** and/or **phone** for the channel you will DISPATCH | Planning EMAIL with only `@ironleads.local` | ☐ |
| R2.5 | Plain-English trigger (e.g. “hiring signal”) | Raw tokens like `COMPLIANCE_JOB_POST`, `NEW_CISO` | ☐ |
| R2.6 | Human signature (**Ironframe** / operator) | Prompt leaks: `Anti-hallucination`, “never invent portals…”; **Ironframe Governance Frame** as sales signer | ☐ |
| R2.7 | — | `$0.00` “governed loss exposure”; eng dumps (BigInt / Irongate DMZ / RLS) | ☐ |
| R2.8 | Readable short paragraphs | Unfinished placeholders / instruction text meant for the model | ☐ |

### Fail → fix

1. Edit the draft in Approvals (if editable) to restore locks **and** content quality, **or**
2. SalesTeam portal → run poll / regenerate, then re-open newest draft.
3. Do **not** DISPATCH until **R2.1–R2.8** all pass. A green R2.1–R2.4 with failed R2.5–R2.8 is still **PURGE / rewrite**.

**R2 done:** ☐

---

## R3 — Dry-run DISPATCH (~5–10 min) — HARD GATE

Use **one** message to an inbox/phone **you control**. Do not DISPATCH a real cold prospect yet.

### Recommended dry-run target

| Option | How |
|--------|-----|
| **A (safest)** | Temporarily edit the draft recipient / use a test contact whose email/phone is yours |
| **B** | If testing SMS path only: ensure your phone is the destination (ops test number), not the prospect’s |
| **C** | BlueRadius has `info@blueradius.io` — **do not** dry-run EMAIL to them; use Option A |

### Steps (click-by-click)

1. Approvals → `/dashboard/admin/approvals?kind=SALES`.
2. Select the dry-run draft (newest, locks already Pass from R2).
3. In **Destination (editable before DISPATCH)**:
   - Choose **EMAIL** or **SMS**.
   - Set **To email** to your inbox, or **To phone** (E.164) to your test number.
   - Do not leave a real prospect destination for the dry-run.
4. Re-read the body one last time (R2.1–R2.8 — locks **and** content quality).
5. Click **Approve & dispatch** (or equivalent SALES DISPATCH button).
6. Wait for UI success (`SUCCESS_DISPATCHED` / success toast — not a red error).
7. Check **your** phone or inbox within ~2 minutes.
8. Open the received message and re-check R2.1–R2.8 on the **received** copy.
9. Confirm you did **not** get two copies for the same contact from this single click.

### Pass criteria

| # | Pass when |
|---|-----------|
| R3.1 | DISPATCH UI succeeds |
| R3.2 | You **receive** the message |
| R3.3 | Received copy still matches R2.1–R2.8 (locks + no prompt leaks) |
| R3.4 | Single send (no surprise duplicate) |

### Fail → HOLD

Do not start partner outreach. Debug Resend / Telnyx / Twilio / SMS_PROVIDER / From domain, then retry R3 only.

**R3 done:** ☐

---

## R4 — Ironleads → draft path (optional, ~5–10 min)

Skip if R2–R3 already passed **today** and the batch is already built.

### Steps

1. Open tab **B**: `/dashboard/operations/ironleads`.
2. Either:
   - Run a harvest cycle if the portal offers it, **or**
   - Open an existing **SUSPECT** from the list.
3. Open the SUSPECT report (per-contact report page if linked).
4. Confirm you can read: why SUSPECT, blockers, website/contact signals (as available).
5. If the UI offers **buying-committee research** (or research already ran), confirm members/switchboard notes look sane — not OSINT title noise.
6. Open tab **C**: `/dashboard/operations/salesteam`.
7. Run **poll** / sales cycle if available so drafts refresh.
8. Return to Approvals SALES.
9. Confirm **one** current PENDING draft per contact (newest); **PURGE** older dupes or ignore them.

### Pass criteria

| # | Pass when |
|---|-----------|
| R4.1 | Ironleads portal usable |
| R4.2 | SUSPECT report readable |
| R4.3 | Buying-committee / enrichment signals readable when present (or N/A) |
| R4.4 | SalesTeam poll does not 500; draft appears/refreshes |
| R4.5 | One newest PENDING draft per contact |

**R4 done / skipped:** ☐ / ☐ skipped

---

## R5 — Workflow-review LIVE assist (~8–12 min) — HARD GATE

URL (tab **E**): `/dashboard/operations/workflow-review`

### Steps

1. Hard refresh the page (`Ctrl+Shift+R`) so you have the latest LIVE/recap UI.
2. **Company** → e.g. `Western Alliance` (or dry-run name).
3. **Buyer** → e.g. `Stephen McMaster` (or your name).
4. **Channel** → Microsoft Teams (or Other).
5. **Microphone** → System default (or pick the mic that moves the level bar).
6. Click **Enable mic & go LIVE**.
7. Allow the browser microphone prompt if shown.
8. Speak a full sentence clearly for ~5 seconds.
9. Watch:
   - Status cycles **Recording…** / **Transcribing…**
   - **Green level bar** moves while you talk
   - Words appear in **Live transcript buffer**
10. Keep talking until **Close readiness** shows a band/score (not stuck on empty forever).
11. In **Live Q&A (sidecar)**, type exactly:  
    `Can we do a free PoC?`
12. Click **Pocket answer**.
13. Confirm the answer **rejects** free pilot/trial and mentions **Path B / $4,999** (or equivalent lock language).
14. Click **End LIVE → recap**.
15. Scroll to **Call recap**: expect Summary, Path B ask, and Action items.

### Pass criteria

| # | Pass when |
|---|-----------|
| R5.1 | Company/Buyer set |
| R5.2 | Level bar moves when speaking |
| R5.3 | Real words in buffer within ~5–10s |
| R5.4 | Close readiness updates |
| R5.5 | Pocket answer blocks free PoC + frames Path B |
| R5.6 | Recap card appears with action items |

### Fail → fix

| Symptom | Try |
|---------|-----|
| Level bar stuck at 0 | Change **Microphone** dropdown → **Re-arm mic** |
| “Permission denied” | Address bar → Site settings → Microphone → Allow |
| Buffer empty but bar moves | Wait for Transcribing…; check `GOOGLE_API_KEY` on server |
| Pocket answer wrong | Refresh page; retry exact free-PoC phrasing |

**R5 done:** ☐

---

## R6 — Recap → calendar (~3 min) — HARD GATE

### Steps

1. Stay on workflow-review with a **Call recap** visible (from R5.6).  
   If missing: click **Generate call recap** (needs non-empty buffer).
2. On the recap card, click **Push to calendar**.
3. Wait for success text (e.g. created/updated counts).
4. Click **Open calendar** (or tab **F**: `/dashboard/operations?tab=calendar`).
5. Find cards titled like `[WF review] <Company>: …`
6. Open one card; confirm synopsis mentions workflow-review / Path B and checklist steps exist.
7. Optional: mark the dry-run card done later with a short outcome note.

### Pass criteria

| # | Pass when |
|---|-----------|
| R6.1 | Push to calendar succeeds (no error toast) |
| R6.2 | Calendar shows `[WF review] …` cards |
| R6.3 | Card content is actionable (due date + checklist) |

**R6 done:** ☐

---

## R7 — Teams Graph (optional for v1) (~2 min)

Mic LIVE is enough for outreach go-live. Graph is bonus (meeting create + post-call transcript).

### Steps (if testing)

1. On `/dashboard/operations/workflow-review`, find **Microsoft Teams** panel.
2. Status should read **connected** (account name visible) if Azure was finished earlier.
3. Optional: **Create Teams meeting** → open join link in Teams.
4. Optional: after a transcribed meeting, **Poll Graph transcript**.
5. If anything Graph fails → mark **N/A**; do **not** HOLD outreach for Graph alone.

### Pass / N/A

| # | Result |
|---|--------|
| R7.1 | ☐ connected · ☐ N/A (mic-only) |
| R7.2 | Graph failure does not block GO |

**R7 done:** ☐ / ☐ N/A

---

## R8 — Path B next-step readiness (~3 min)

No send required — prove you can execute a **yes** without improvising.

### Steps

1. Open [order form](./design-partner-order-form.md). Confirm you know where **2–3 success criteria** go, and that convert credit = Path B fee toward year-1 Command (not a negotiated %).  
2. Open `/admin/onboarding`. Confirm provision uses a **client-owned** operator email (not `@ironframegrc.com`).
3. Say out loud (or note): after yes you send the **Path B activation link**, never generic `/pricing` for a PENDING partner. Path B is **non-refundable**; in-window convert credits **$4,999** to year-1 Command.
4. Skim [workflow review protocol](./design-partner-workflow-review-protocol.md) 15-minute agenda once.

### Pass criteria

| # | Pass when |
|---|-----------|
| R8.1 | Order form + criteria known |
| R8.2 | Provision path + client-owned email known |
| R8.3 | Activation link (not `/pricing`) known |

**R8 done:** ☐

---

## Sign-off

| Field | Value |
|-------|--------|
| Operator | |
| Date (UTC) | |
| Environment (local / prod) | |
| Dry-run channel used (EMAIL / SMS) | |
| Dry-run destination (your inbox/phone) | |
| R1 | ☐ Pass |
| R2 | ☐ Pass |
| R3 | ☐ Pass · ☐ Fail (HOLD) |
| R4 | ☐ Pass · ☐ Skipped |
| R5 | ☐ Pass · ☐ Fail (HOLD) |
| R6 | ☐ Pass · ☐ Fail (HOLD) |
| R7 | ☐ Pass · ☐ N/A |
| R8 | ☐ Pass |
| **R1–R8 result** | ☐ **GO** · ☐ **HOLD** |
| Hold blockers | |
| First real DISPATCH target (shortlist row) | |

### After GO

1. Open [launch checklist §C — Per-prospect send](./design-partner-operator-launch-checklist.md).
2. DISPATCH warm/priority prospects only; log touch dates on the [ICP shortlist](./design-partner-icp-shortlist.md).
3. Host workflow reviews with `/dashboard/operations/workflow-review` + [protocol](./design-partner-workflow-review-protocol.md).

### After HOLD

1. Fix only the failed R# steps.  
2. Re-run those steps.  
3. Do not start cold partner outreach.

---

## Quick reference — button names

| Where | Button / control |
|-------|------------------|
| Approvals SALES | **Approve & dispatch** |
| Workflow review | **Enable mic & go LIVE** |
| Workflow review | **Pocket answer** |
| Workflow review | **End LIVE → recap** |
| Workflow review | **Generate call recap** |
| Workflow review | **Push to calendar** |
| Workflow review | **Open calendar** |
| Workflow review | **Open order form** (after yes → library) |
| Workflow review | **Provision Path B** (`/admin/onboarding`) |
| Ops Hub | Tab **Calendar** |

---

## Automated rail check (optional)

```bash
npx tsx scripts/dev/pre-outreach-run-order-audit.ts
npx tsx scripts/dev/pre-outreach-calendar-smoke.ts
```

| Check | Last automated result (2026-07-20) |
|-------|-------------------------------------|
| Dev server `:3000` | UP |
| Unit tests (review + calendar + approvals) | PASS |
| PENDING drafts (newest/contact) | 2 — Pivot Point (SMS) · BlueRadius (EMAIL/SMS) |
| Message locks | PASS |
| CRM | 2 PROSPECT · 4 SUSPECT |
| Calendar smoke card | Creatable |

**Human still required for GO:** R3 (receive DISPATCH), R5 (LIVE + recap), R6 (UI Push to calendar).
