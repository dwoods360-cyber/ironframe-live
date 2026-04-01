/**
 * Visual Workforce Lock v1.0 — 19-node geometry:
 * 1 orchestrator core (rendered separately) + 18 surround nodes = 6 hex arms × 3 interlocking segments.
 * Arms start at the top vertex (−90°) and advance 60° (pointy-top hex).
 */
export const DEFAULT_ARM_RADII: [number, number, number] = [18, 30, 42];

export type HexPoint = { x: number; y: number };

export function workforceHexSurroundNodes(
  cx: number,
  cy: number,
  radii: [number, number, number] = DEFAULT_ARM_RADII,
): HexPoint[] {
  const out: HexPoint[] = [];
  for (let arm = 0; arm < 6; arm++) {
    const θ = -Math.PI / 2 + arm * (Math.PI / 3);
    for (const dist of radii) {
      out.push({
        x: cx + dist * Math.cos(θ),
        y: cy + dist * Math.sin(θ),
      });
    }
  }
  return out;
}

/** Unit direction on each arm from core (for interlocking spokes). */
export function workforceHexArmDirections(): { dx: number; dy: number }[] {
  const dirs: { dx: number; dy: number }[] = [];
  for (let arm = 0; arm < 6; arm++) {
    const θ = -Math.PI / 2 + arm * (Math.PI / 3);
    dirs.push({ dx: Math.cos(θ), dy: Math.sin(θ) });
  }
  return dirs;
}
