# UI Schematic v1 (Phase 43 Finalized)

## Scope
This document captures the finalized UI structure for:
- Header #2 (`/vendors` context)
- Vendor toolbar chip rail (`/vendors` page)
- Notification Bar triage logic

## Header #2 (Vendor Overview Route)

### Exact chip order (left-to-right)
1. `+ ADD VENDOR`
2. `SUMMARY`
3. `BACK`

### Chip color mapping
- `+ ADD VENDOR`
  - Tailwind classes: `bg-slate-900/80 border-slate-800`
  - Effective color: `rgba(15, 23, 42, 0.80)`
  - Hex equivalent: `#0f172acc`
- `SUMMARY`
  - Tailwind classes: `bg-slate-900/80 border-slate-800`
  - Effective color: `rgba(15, 23, 42, 0.80)`
  - Hex equivalent: `#0f172acc`

## Vendor Toolbar (Primary Controls on `/vendors`)

### Layout anchor checks
- `+ ADD VENDOR` is the far-left anchor.
- Search box is positioned immediately after `+ ADD VENDOR` and before `All Risk`.

### Full control flow (left-to-right)
1. `+ ADD VENDOR`
2. `Search`
3. `All Risk`
4. `High`
5. `Med`
6. `Low`
7. `Activity Log`
8. `Summary`
9. `Industry` dropdown
10. `Compliance Calendar` dropdown
11. `Download`
12. `Map View`
13. `Table View`

### Exact 9-chip set (excluding Search, dropdowns, Download)
1. `+ ADD VENDOR`
2. `All Risk`
3. `High`
4. `Med`
5. `Low`
6. `Activity Log`
7. `Summary`
8. `Map View`
9. `Table View`

## Notification Bar (Permission Required)

### Structural logic
- Badge counter renders to the **left** of `Permission Required` heading.
- Alerts render horizontally in compact pills.
- Alert detail line uses `break-words` and does **not** use `truncate` or `line-clamp`, allowing full text expansion.

### Vertical Approve/Reject stacking logic
- Each alert pill contains an action column: `flex flex-col items-end`.
- Button order is deterministic:
  1. `Approve` (top)
  2. `Reject` (bottom)
- This enforces vertical stacking and preserves compact horizontal card layout.

## Integrity Snapshot Notes
- Grade icon scaling remains at 75% (`h-9 w-9` icon container with compact text).
- Row-level bar graph/sparkline remains active (`risk-sparkline` per vendor row).
- Badge decrement behavior validated from `3 -> 2` on first approval in scripted verification.
