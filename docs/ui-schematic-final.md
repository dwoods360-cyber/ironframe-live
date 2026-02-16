# UI Schematic Final (Phase 43.21 Certified)

## Scope
Final synchronized layout for:
- Subheader #2 anchor-and-exit controls
- Vendor toolbar ordering
- Scorecard Shield interaction link
- Notification triage behavior

## Subheader #2 (Anchor-and-Exit Logic)

### Left anchor
1. `+ ADD VENDOR` (far-left anchor)

### Right-aligned exit group
1. `SUMMARY`
2. `BACK`

- `SUMMARY` is intentionally left of `BACK` in the right-side group.
- `+ ADD VENDOR` and `SUMMARY` retain matched background color (`bg-slate-900/80`, `#0f172acc`).

## Vendor Toolbar Final Order (`/vendors`)
1. `+ ADD VENDOR`
2. `Search`
3. `All Risk`
4. `High`
5. `Med`
6. `Low`
7. `Activity Log`
8. `Industry` dropdown
9. `Compliance Calendar` dropdown
10. `Download`
11. `Map View`
12. `Table View`
13. `Summary`
14. `Back`

## Scorecard Shield Functional Link
- Each row score badge is a compact Shield grade control.
- Clicking the Scorecard Shield triggers a smooth horizontal scroll target to the `SECURITY RATING` table header (`data-testid="security-rating-header"`).
- This preserves the direct analyst workflow from grade context to current security rating review.

## Drift Indicators + Recent Change Labels
- Drift indicators render as five centered vertical bars.
- Recent change label (`Recently Alight // ...`) is centered beneath bars.
- Label width is constrained to prevent overlap with neighboring row data.

## Notification Bar
- Header order remains `PERMISSION REQUIRED` then numeric badge.
- Approve/Reject actions remain vertically stacked.
- Badge decrement behavior verified from `3 -> 2` on first approval.
