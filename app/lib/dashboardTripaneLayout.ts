/**
 * Three-pane dashboard shell — w-80 left, fluid center, w-96 right audit rail.
 * Used by `DashboardHomeClient` (home tripane). Window scroll locked via root `h-screen overflow-hidden`.
 */

/** Shared column scroll track — each pane scrolls independently of the others. */
export const DASHBOARD_COLUMN_SCROLL =
  "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable] custom-scrollbar";

/** Tripane grid: explicit column tracks so the center cannot steal width from the side rails. */
export const DASHBOARD_TRIPANE_SHELL =
  "grid h-full min-h-0 w-full grid-cols-[20rem_minmax(0,1fr)_24rem] overflow-hidden bg-slate-950";

/** Left control rail — 20rem (Tailwind `w-80`). */
export const DASHBOARD_LAYOUT_LEFT_RAIL = "flex-none shrink-0 w-80 max-w-80";

/** Right audit rail — 24rem (Tailwind `w-96`). */
export const DASHBOARD_LAYOUT_RIGHT_RAIL = "flex-none shrink-0 w-96 max-w-96";

/** @deprecated Use {@link DASHBOARD_LAYOUT_LEFT_RAIL} or {@link DASHBOARD_LAYOUT_RIGHT_RAIL}. */
export const DASHBOARD_LAYOUT_SIDE_RAIL = DASHBOARD_LAYOUT_RIGHT_RAIL;

export const DASHBOARD_LEFT_PANE =
  `col-start-1 row-start-1 relative z-0 flex h-full min-h-0 ${DASHBOARD_LAYOUT_LEFT_RAIL} flex-col overflow-hidden border-r border-slate-900 bg-slate-950`;

export const DASHBOARD_LEFT_SCROLL = `${DASHBOARD_COLUMN_SCROLL} px-4 py-6`;

/** Center column: grid track 2; `min-w-0` + `overflow-hidden` clip wide tables/cards. */
export const DASHBOARD_CENTER_PANE =
  "col-start-2 row-start-1 flex h-full min-h-0 min-w-0 w-full max-w-none flex-1 flex-col overflow-hidden bg-slate-900/30 border-r border-slate-900";

/** Strategic quad — strict 2×2 (Insurance | Horizon / Exposure | Gold). */
export const DASHBOARD_STRATEGIC_GRID =
  "grid w-full min-w-0 grid-cols-1 items-start gap-6 md:grid-cols-2";

/** Horizontal padding aligned with TopNav (`px-6`) and dashboard header strip. */
export const DASHBOARD_CENTER_PAD_X = "px-6";

export const DASHBOARD_CENTER_SCROLL = `${DASHBOARD_COLUMN_SCROLL} px-6 py-6`;

/** Center-pane content — full bleed between side rails. */
export const DASHBOARD_CENTER_CONTENT = "mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col space-y-6 pb-12";

/** Vertical operational risk stack (registry ACTIVE lane) — full bleed center focus. */
export const DASHBOARD_CENTER_RISK_STACK =
  "flex w-full min-w-0 flex-col items-center py-6";

/** Audit Intelligence rail — grid track 3. */
export const DASHBOARD_RIGHT_PANE =
  `col-start-3 row-start-1 relative z-10 flex h-full min-h-0 ${DASHBOARD_LAYOUT_RIGHT_RAIL} flex-col overflow-hidden bg-slate-950`;

/** Right-pane scroll: sustainability pulse, search, and log ledger share this track. */
export const DASHBOARD_RIGHT_SCROLL = `${DASHBOARD_COLUMN_SCROLL} px-4 py-6`;

/** Fills dashboard route-group height under `AppShell` (below TopNav). */
export const DASHBOARD_HOME_SHELL =
  "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden";

/** Dashboard route-group wrapper under `AppShell` (below TopNav). */
export const DASHBOARD_GROUP_SHELL =
  "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-950";
