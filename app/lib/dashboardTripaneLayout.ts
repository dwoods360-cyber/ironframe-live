/**
 * Three-pane dashboard shell — fixed viewport fractions 22vw · 48vw · 30vw.
 * Flex row (no wrap). Parent bans horizontal window scroll.
 * LKG snapshot: 2026-06-05 23:55 CDT (pre-board stability pass).
 */

/** Tripane layout token (left 22vw · center 48vw · right 30vw). */
export const DASHBOARD_GRID_PROPORTIONS = "22vw_48vw_30vw";

/** Parent outer container — zero horizontal window scroll; fills AppShell viewport. */
export const DASHBOARD_TRIPANE_SHELL =
  "flex flex-row flex-nowrap w-screen h-full min-h-0 overflow-hidden bg-slate-950 select-text";

/** Cyber insurance re-underwriting row — left card · gap connector · right card (Approved section.png). */
export const INSURANCE_UNDERWRITING_ROW =
  "flex min-w-0 flex-row flex-nowrap items-stretch gap-4";

/**
 * Stacked gap connector shell — `----` on vertical midline between cards; `>` stacked below.
 */
export const INSURANCE_FORENSIC_GAP_CONNECTOR =
  "pointer-events-none flex h-full min-h-0 w-8 min-w-8 shrink-0 flex-col items-center justify-center self-stretch font-mono text-slate-600 select-none";

export const INSURANCE_FORENSIC_GAP_CONNECTOR_STACK =
  "flex flex-col items-center justify-center space-y-0.5";

/** Left Panel (Data Deck) — 22vw fixed rail, independent vertical scroll. */
export const DASHBOARD_LEFT_PANE =
  "relative z-0 w-[22vw] min-w-[22vw] max-w-[22vw] h-full min-h-0 overflow-y-auto overflow-x-hidden flex-shrink-0 border-r border-slate-800 bg-slate-950 select-text";

/** Center Panel (Workspace Canvas) — 48vw fixed rail, independent vertical scroll. */
export const DASHBOARD_CENTER_PANE =
  "relative z-0 w-[48vw] min-w-[48vw] max-w-[48vw] h-full min-h-0 overflow-y-auto overflow-x-hidden flex-shrink-0 bg-slate-900/10 select-text";

/** Right Panel (Audit Column) — 30vw fixed rail, independent vertical scroll. */
export const DASHBOARD_RIGHT_PANE =
  "relative z-10 w-[30vw] min-w-[30vw] max-w-[30vw] h-full min-h-0 overflow-y-auto overflow-x-hidden flex-shrink-0 border-l border-slate-800 bg-slate-950 select-text";

/** Inner column body — pane owns scroll; no nested overflow-y here. */
export const DASHBOARD_COLUMN_INNER = "flex w-full min-w-0 flex-col";

export const DASHBOARD_LEFT_SCROLL = `${DASHBOARD_COLUMN_INNER} px-4 py-4`;

/** Horizontal padding aligned with TopNav (`px-6`) and dashboard header strip. */
export const DASHBOARD_CENTER_PAD_X = "px-6";

export const DASHBOARD_CENTER_SCROLL = `${DASHBOARD_COLUMN_INNER} px-6 py-6`;

/** Center-pane content — full width within the center third. */
export const DASHBOARD_CENTER_CONTENT = "flex w-full min-w-0 flex-1 flex-col space-y-6 pb-12";

/** Vertical operational risk stack (registry ACTIVE lane) — full bleed center focus. */
export const DASHBOARD_CENTER_RISK_STACK =
  "flex w-full min-w-0 flex-col items-center py-6";

/** Right-pane body — flex fill; Audit Intelligence stream scrolls inside. */
export const DASHBOARD_RIGHT_SCROLL =
  "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-4 custom-scrollbar";

/** Fills dashboard route-group height under `AppShell` (below TopNav). */
export const DASHBOARD_HOME_SHELL =
  "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden";

/** Dashboard route-group wrapper under `AppShell` (below TopNav). */
export const DASHBOARD_GROUP_SHELL =
  "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-950";

/** @deprecated Grid-era token — flex tripane uses fixed vw rails above. */
export const DASHBOARD_LAYOUT_LEFT_RAIL = "min-w-0 w-full";

/** @deprecated Grid-era token — flex tripane uses fixed vw rails above. */
export const DASHBOARD_LAYOUT_RIGHT_RAIL = "min-w-0 w-full";
