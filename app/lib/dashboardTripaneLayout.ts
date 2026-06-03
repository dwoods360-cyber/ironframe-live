/**
 * Three-pane dashboard shell — locked 22% / 48% / 30% column proportions.
 * Used by `DashboardHomeClient` (home tripane). Window scroll locked via root `h-screen overflow-hidden`.
 */

/** Shared column scroll track — each pane scrolls independently of the others. */
export const DASHBOARD_COLUMN_SCROLL =
  "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable] custom-scrollbar";

/** Locked tripane proportions — left 22% · center 48% · right 30%. */
export const DASHBOARD_GRID_PROPORTIONS = "22%_48%_30%";

/** Tripane grid; `divide-x` draws panel separators. */
export const DASHBOARD_TRIPANE_SHELL =
  "grid h-full min-h-0 w-full grid-cols-[22%_48%_30%] divide-x divide-slate-900 items-stretch overflow-hidden bg-slate-950";

/** Column track fills its grid percentage (`min-w-0` prevents overflow blowout). */
export const DASHBOARD_LAYOUT_LEFT_RAIL = "min-w-0 w-full";

export const DASHBOARD_LAYOUT_RIGHT_RAIL = "min-w-0 w-full";

/** @deprecated Use {@link DASHBOARD_LAYOUT_LEFT_RAIL} or {@link DASHBOARD_LAYOUT_RIGHT_RAIL}. */
export const DASHBOARD_LAYOUT_SIDE_RAIL = DASHBOARD_LAYOUT_RIGHT_RAIL;

export const DASHBOARD_LEFT_PANE =
  `col-start-1 row-start-1 relative z-0 flex h-full min-h-0 ${DASHBOARD_LAYOUT_LEFT_RAIL} flex-col overflow-hidden bg-slate-950`;

export const DASHBOARD_LEFT_SCROLL = `${DASHBOARD_COLUMN_SCROLL} px-4 py-6`;

/** Center column: grid track 2; `min-w-0` clips wide tables/cards inside the third track. */
export const DASHBOARD_CENTER_PANE =
  "col-start-2 row-start-1 flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-slate-900/10";

/** Strategic quad — strict 2×2 (Insurance | Horizon / Exposure | Gold). */
export const DASHBOARD_STRATEGIC_GRID =
  "grid w-full min-w-0 grid-cols-1 items-start gap-6 md:grid-cols-2";

/** Horizontal padding aligned with TopNav (`px-6`) and dashboard header strip. */
export const DASHBOARD_CENTER_PAD_X = "px-6";

export const DASHBOARD_CENTER_SCROLL = `${DASHBOARD_COLUMN_SCROLL} px-6 py-6`;

/** Center-pane content — full width within the center third. */
export const DASHBOARD_CENTER_CONTENT = "flex w-full min-w-0 flex-1 flex-col space-y-6 pb-12";

/** Vertical operational risk stack (registry ACTIVE lane) — full bleed center focus. */
export const DASHBOARD_CENTER_RISK_STACK =
  "flex w-full min-w-0 flex-col items-center py-6";

/** Audit Intelligence rail — grid track 3. */
export const DASHBOARD_RIGHT_PANE =
  `col-start-3 row-start-1 relative z-10 flex h-full min-h-0 ${DASHBOARD_LAYOUT_RIGHT_RAIL} flex-col overflow-hidden bg-slate-950`;

/** Right-pane body: fixed height under tripane; Audit Intelligence log lane scrolls inside. */
export const DASHBOARD_RIGHT_SCROLL =
  "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-4 py-6";

/** Fills dashboard route-group height under `AppShell` (below TopNav). */
export const DASHBOARD_HOME_SHELL =
  "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden";

/** Dashboard route-group wrapper under `AppShell` (below TopNav). */
export const DASHBOARD_GROUP_SHELL =
  "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-950";
