"use client";

import type { SVGProps } from "react";
import {
  DEFAULT_ARM_RADII,
  workforceHexArmDirections,
  workforceHexSurroundNodes,
} from "@/branding/workforceHexGeometry";

const IDLE_CYAN = "#22d3ee";
const CORE = "#ffffff";
const CX = 50;
const CY = 50;
const CORE_R = 10;
const spokeInner = CORE_R + 1.2;

/**
 * v1.0 header mark: 19-node interlocking hex (1 core + 6×3 surround), idle cyan-400.
 */
export function IronframeHexMark({ className, ...rest }: SVGProps<SVGSVGElement>) {
  const nodes = workforceHexSurroundNodes(CX, CY, DEFAULT_ARM_RADII);
  const dirs = workforceHexArmDirections();

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden {...rest}>
      <title>Ironframe</title>
      <g>
        {dirs.map((dir, arm) => {
          const [r1, r2, r3] = DEFAULT_ARM_RADII;
          const p0 = { x: CX + dir.dx * spokeInner, y: CY + dir.dy * spokeInner };
          const p1 = { x: CX + dir.dx * r1, y: CY + dir.dy * r1 };
          const p2 = { x: CX + dir.dx * r2, y: CY + dir.dy * r2 };
          const p3 = { x: CX + dir.dx * r3, y: CY + dir.dy * r3 };
          return (
            <polyline
              key={`arm-${arm}`}
              points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
              fill="none"
              stroke={IDLE_CYAN}
              strokeWidth={1.35}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.45}
            />
          );
        })}
        {nodes.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4.85} fill={IDLE_CYAN} opacity={0.92} />
        ))}
      </g>
      <circle cx={CX} cy={CY} r={CORE_R + 1.2} fill={CORE} className="drop-shadow-[0_0_6px_rgba(255,255,255,0.85)]" />
      <circle cx={CX} cy={CY} r={CORE_R - 1.5} fill={CORE} opacity={0.98} />
    </svg>
  );
}
