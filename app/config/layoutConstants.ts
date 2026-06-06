/**
 * Dashboard layout utility tokens — keep out of `app/(dashboard)/layout.tsx` so Next.js
 * route layout type generation only sees the default export.
 *
 * Feature 6: Immutable Audit Ledger Feed — Layout Architecture Registry
 * ---------------------------------------------------------------------
 * Stacking (low → high):
 *   #2 Header navigation strip (AUDIT TRAIL, INTEGRITY HUB, …) — z-30
 *   #1 Master window header (IRONFRAME CORE row) — z-40
 *   Drawer panels / slide-outs (portaled) — backdrop z-[45], panel z-50
 *   Primary global modals & pop-ups (portaled) — z-[100]+
 */

/** 0.25in structural clearance below fixed TopNav (24px) — non-collapsing spacer block. */
export const VIEWPORT_HEADER_CLEARANCE_CLASS =
  "h-6 w-full shrink-0 clear-both select-none pointer-events-none block";

/** #1 Master window header — IRONFRAME CORE / operator row. */
export const LAYOUT_MASTER_HEADER_Z_CLASS = "z-40";

/** #2 Header navigation strip — AUDIT TRAIL, INTEGRITY HUB, BOARD REPORT, etc. */
export const LAYOUT_SUBNAV_HEADER_Z_CLASS = "z-30";

/** Drawer backdrop (portaled, below drawer panel). */
export const LAYOUT_DRAWER_BACKDROP_Z_CLASS = "z-[45]";

/** Drawer panels / slide-outs (portaled, above header stack). */
export const LAYOUT_DRAWER_PANEL_Z_CLASS = "z-50";

/** Primary global modals & pop-ups (portaled, above drawers and headers). */
export const LAYOUT_GLOBAL_MODAL_Z_CLASS = "z-[100]";

/**
 * Mandatory top clearance for modal bodies — clears #1 + #2 header rows (~112px / pt-28).
 * Use on non-full-bleed modal content or inset shells.
 */
export const LAYOUT_VIEWPORT_HEADER_OFFSET_CLASS = "top-[112px]";
export const LAYOUT_VIEWPORT_HEADER_PADDING_CLASS = "pt-28";

/** Simulation airlock banner (`h-9`) stacked above standard header offset. */
export const LAYOUT_VIEWPORT_HEADER_OFFSET_SIMULATION_CLASS = "top-[148px]";

/** Fixed toast stack — clears Header #2 (~108px) + 26px breathing room. */
export const FLOATING_NOTIFY_TOP_STANDARD = "top-[134px]";

/** Simulation airlock banner (`h-9`) + standard nav footprint + 26px. */
export const FLOATING_NOTIFY_TOP_SIMULATION = "top-[170px]";

/** Dominant z-index for global notification / toast overlays (above modals when urgent). */
export const FLOATING_NOTIFY_Z_CLASS = "z-[9999]";

/** @deprecated Use {@link LAYOUT_DRAWER_BACKDROP_Z_CLASS} */
export const GRC_AGENT_DRAWER_BACKDROP_Z_CLASS = LAYOUT_DRAWER_BACKDROP_Z_CLASS;

/** @deprecated Use {@link LAYOUT_DRAWER_PANEL_Z_CLASS} */
export const GRC_AGENT_DRAWER_PANEL_Z_CLASS = LAYOUT_DRAWER_PANEL_Z_CLASS;

/** Left rail — 22% grid track (`DASHBOARD_LAYOUT_LEFT_MIN_WIDTH` in tripane layout). */
export const DASHBOARD_GROUP_LEFT_RAIL = "min-w-0 w-full";

export const DASHBOARD_GROUP_RIGHT_RAIL = "min-w-0 w-full";
