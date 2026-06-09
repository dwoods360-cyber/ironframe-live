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
 *
 * Fixed header stack (TopNav, viewport-fixed):
 *   #1 Master bar — h-16 (4rem)
 *   Tenant / scale bar — h-10 (2.5rem)
 *   #2 Sub-nav chip bar (HeaderTwo) — h-10 (2.5rem)
 *   → 9rem total clearance before scrollable command-center content
 *
 * Simulation adds AirlockBanner — h-9 (2.25rem) above the stack.
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

/** Full fixed TopNav height (3 rows). */
export const LAYOUT_HEADER_STACK_OFFSET = "9rem";

/** Airlock banner (`h-9`) when simulation mode is active. */
export const LAYOUT_AIRLOCK_OFFSET = "2.25rem";

/** Main tripane shell — clears Header #1 + tenant bar + Header #2. */
export const LAYOUT_CONTENT_SHELL_MT = "mt-[9rem]";
export const LAYOUT_CONTENT_SHELL_H = "h-[calc(100dvh-9rem)]";

/** Simulation: airlock + full header stack. */
export const LAYOUT_CONTENT_SHELL_MT_SIM = "mt-[11.25rem]";
export const LAYOUT_CONTENT_SHELL_H_SIM = "h-[calc(100dvh-11.25rem)]";

/** Viewport-fixed notices stay until the operator dismisses them (not scroll-linked). */
export const FLOATING_NOTIFY_INTERACTIVE_CLASS = "pointer-events-auto";

/** Tier-1 center notices — below Header #2 + 0.5rem gap. */
export const FLOATING_NOTIFY_TOP_TIER1 = "top-[9.5rem]";
export const FLOATING_NOTIFY_TOP_TIER1_SIM = "top-[11.75rem]";

/** Tier-2 center notices — stacked under tier-1 (~4rem lane). */
export const FLOATING_NOTIFY_TOP_TIER2 = "top-[13rem]";
export const FLOATING_NOTIFY_TOP_TIER2_SIM = "top-[15.25rem]";

/** Upper-right notices (simulation dispatch, clock drift) — same clearance as tier-1. */
export const FLOATING_NOTIFY_TOP_RIGHT = FLOATING_NOTIFY_TOP_TIER1;
export const FLOATING_NOTIFY_TOP_RIGHT_SIM = FLOATING_NOTIFY_TOP_TIER1_SIM;

export function floatingNotifyTopClass(isSimulationMode: boolean, tier: 1 | 2 = 1): string {
  if (isSimulationMode) {
    return tier === 1 ? FLOATING_NOTIFY_TOP_TIER1_SIM : FLOATING_NOTIFY_TOP_TIER2_SIM;
  }
  return tier === 1 ? FLOATING_NOTIFY_TOP_TIER1 : FLOATING_NOTIFY_TOP_TIER2;
}

export function floatingNotifyTopRightClass(isSimulationMode: boolean): string {
  return isSimulationMode ? FLOATING_NOTIFY_TOP_RIGHT_SIM : FLOATING_NOTIFY_TOP_RIGHT;
}

export function layoutContentShellClass(isSimulationMode: boolean): {
  marginTop: string;
  height: string;
} {
  return isSimulationMode
    ? { marginTop: LAYOUT_CONTENT_SHELL_MT_SIM, height: LAYOUT_CONTENT_SHELL_H_SIM }
    : { marginTop: LAYOUT_CONTENT_SHELL_MT, height: LAYOUT_CONTENT_SHELL_H };
}

/** Agent inspect slide-out (portaled) — aligns with Agent Log Inspector. */
export const LAYOUT_AGENT_INSPECT_PANEL_Z_CLASS = "z-[190]";

/** GRC agent meta drawer width (b8cc1adf `GrcAgentMetaDrawer`). */
export const LAYOUT_AGENT_INSPECT_DRAWER_WIDTH_CLASS = "w-[min(100vw,380px)]";

/** Inspect rail clears the three-row fixed header (9rem). */
export const LAYOUT_AGENT_INSPECT_DRAWER_TOP_CLASS = "top-[9rem]";

export const LAYOUT_AGENT_INSPECT_DRAWER_TOP_SIM_CLASS = "top-[11.25rem]";

/** 19-agent pulse roster — locked 3-column matrix (d3519f91 / b8cc1adf). */
export const WORKFORCE_PULSE_GRID_CLASS = "grid w-full min-w-0 grid-cols-3 gap-1.5";

/** Single-click audit/runtime notice — notification lane width (matches center toasts). */
export const AGENT_INSPECT_FLOATING_NOTICE_WIDTH_CLASS = "w-[min(92vw,28rem)]";
