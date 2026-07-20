# Chapter 3 — Auditor export pack

> **Track:** ANALYST · **Reading level:** 11th grade · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/exports` · **Lab IDs:** ANALYST-003

## Why this chapter matters

Junior analysts prepare **tenant-scoped** files for auditors. Core exports live at `/exports`. PILOT vendor screens are not auditor packs.

## Learning objectives

When you finish, you can:

- Open `/exports`.
- Attempt a CSV or PDF download (or record the setup banner).
- Name the active tenant on the file or in your journal.

## How to get there

1. Confirm the active tenant name in the UI.
2. Open `/exports`.
3. Choose CSV or PDF when unlocked.
4. If a banner blocks download, copy the banner text into your journal and ask your trainer.

## Reference screenshot

![Chapter 3 — Auditor export pack](/docs/training/assets/analyst-03-auditor-export.png)

*Captured near `/exports`. Asset: `/docs/training/assets/analyst-03-auditor-export.png`.*

source-file: public/docs/training/assets/analyst-03-auditor-export.png

## GRC knowledge (apply from manuals)

- Name one SOC 2 trust criterion your export might support (Security / Availability / etc.).  
- Why tenant scope matters for confidentiality.  

Review: [frameworks-map.md](../manuals/frameworks-map.md).

## Lab — Export attempt (ANALYST-003)

1. Journal: route · CSV or PDF · tenant · pass/blocked · time.
2. If download works, save with `tenant-date` in the filename.
3. Confirm you did **not** use a PILOT vendor CSV as the auditor pack.
4. Note one difference between “export for auditor” and “screenshot for lab notes.”
5. Write one sentence an auditor might ask next (“Show me the control that produced this”).

## Check your understanding

- [ ] I used `/exports` (or logged a clear gate).
- [ ] I kept the pack tenant-scoped in my notes.
- [ ] I avoided PILOT demo CSVs for auditor claims.

## Next chapter

Continue to [`04-board-note.md`](./04-board-note.md).
