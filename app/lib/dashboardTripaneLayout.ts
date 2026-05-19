/**

 * Three-pane dashboard shell — symmetric 384px side rails; center uses `minmax(0,1fr)`.

 * Used by `DashboardHomeClient` (home tripane). Window scroll locked via root `h-screen overflow-hidden`.

 */



/** Tripane grid: explicit column tracks so the center cannot steal width from the side rails. */

export const DASHBOARD_TRIPANE_SHELL =

  "grid h-full min-h-0 w-full grid-cols-[24rem_minmax(0,1fr)_24rem] overflow-hidden bg-slate-950";



/** Symmetric vertebrae — 24rem floor lock (left nav + right audit). */
export const DASHBOARD_LAYOUT_SIDE_RAIL = "flex-none shrink-0 w-96 max-w-96";

export const DASHBOARD_LAYOUT_LEFT_RAIL = DASHBOARD_LAYOUT_SIDE_RAIL;

export const DASHBOARD_LEFT_PANE =

  `col-start-1 row-start-1 relative z-0 flex h-full min-h-0 ${DASHBOARD_LAYOUT_LEFT_RAIL} flex-col overflow-hidden border-r border-slate-800/50 bg-slate-950/50`;



/** Center column: grid track 2; `min-w-0` + `overflow-hidden` clip wide tables/cards. */

export const DASHBOARD_CENTER_PANE =

  "col-start-2 row-start-1 flex h-full min-h-0 min-w-0 w-full max-w-none flex-1 flex-col overflow-hidden bg-slate-950";

/** Strategic quad — strict 2×2 (Insurance | Horizon / Exposure | Gold). */
export const DASHBOARD_STRATEGIC_GRID =
  "grid w-full min-w-0 grid-cols-1 items-start gap-6 md:grid-cols-2";

/** Horizontal padding aligned with TopNav (`px-6`) and dashboard header strip. */
export const DASHBOARD_CENTER_PAD_X = "px-6";

export const DASHBOARD_CENTER_SCROLL =

  "flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable]";

/** Center-pane content — full bleed between w-96 rails (no container / max-w cap). */
export const DASHBOARD_CENTER_CONTENT = "flex w-full min-w-0 flex-1 flex-col";

/** Vertical operational risk stack (registry ACTIVE lane) — full bleed center focus. */
export const DASHBOARD_CENTER_RISK_STACK =
  "flex w-full min-w-0 flex-col items-center py-6";



/** Audit Intelligence rail — grid track 3; raised stacking so center overflow cannot paint over it. */

/** Right rail — symmetric 24rem audit intelligence column. */
export const DASHBOARD_LAYOUT_RIGHT_RAIL = DASHBOARD_LAYOUT_SIDE_RAIL;

export const DASHBOARD_RIGHT_PANE =

  `col-start-3 row-start-1 relative z-10 flex h-full min-h-0 ${DASHBOARD_LAYOUT_RIGHT_RAIL} flex-col overflow-hidden border-l border-slate-800/50 bg-slate-950/50`;



/** Right-pane scroll: audit logs move here while left/center rails stay fixed in the tripane row. */

export const DASHBOARD_RIGHT_SCROLL =

  "flex h-full min-h-0 w-full min-w-0 max-w-none flex-1 flex-col overflow-hidden";



/** Fills dashboard route-group height under `AppShell` (below TopNav). */

export const DASHBOARD_HOME_SHELL =

  "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden";



/** Dashboard route-group wrapper under `AppShell` (below TopNav). */

export const DASHBOARD_GROUP_SHELL =

  "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-950";


