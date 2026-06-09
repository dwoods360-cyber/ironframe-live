export type AgentPillAnchorRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const POPOVER_WIDTH_PX = 288;
const VIEWPORT_MARGIN_PX = 12;
const GAP_ABOVE_PILL_PX = 8;

export function readAgentPillAnchorRect(el: HTMLElement | null): AgentPillAnchorRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/** Fixed coordinates — popover sits directly above the pill (bottom edge flush above pill top). */
export function computeAgentPillPopoverPosition(anchor: AgentPillAnchorRect): {
  left: number;
  top: number;
  width: number;
} {
  const width = Math.min(POPOVER_WIDTH_PX, Math.max(anchor.width, 220));
  const viewportW = typeof window !== "undefined" ? window.innerWidth : width;
  const left = Math.min(
    Math.max(anchor.left, VIEWPORT_MARGIN_PX),
    viewportW - width - VIEWPORT_MARGIN_PX,
  );
  const top = Math.max(VIEWPORT_MARGIN_PX, anchor.top - GAP_ABOVE_PILL_PX);
  return { left, top, width };
}
