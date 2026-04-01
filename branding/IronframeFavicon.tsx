"use client";

import type { SVGProps } from "react";
import {
  DEFAULT_ARM_RADII,
  workforceHexArmDirections,
  workforceHexSurroundNodes,
} from "./workforceHexGeometry";

/** v1.0 visual workforce lock — drives geometry + animation split (core vs 18 segments). */
export type IronframeWorkforcePhase = "ASSIGNED" | "SCANNING" | "VERIFIED";

/** Legacy workforce mark — RiskCard (Epic 6) uses border-only telemetry; use elsewhere as needed. */
export type IronframeFaviconColor =
  | "idle-blue"
  | "idle-cyan"
  | "processing-cyan"
  | "processing-amber"
  | "success-green";

export type IronframeFaviconSize = "xs" | "sm" | "md";
export type IronframeCoreStatus = "powered-on" | "dim";

const SIZE_PX: Record<IronframeFaviconSize, number> = {
  xs: 36,
  sm: 44,
  md: 56,
};

const CORE_R = 10;
const VIEW = 100;
const CX = 50;
const CY = 50;

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

type Props = {
  /** v1.0 state: idle cyan → scanning (amber outer pulse) → verified (full emerald flash). */
  phase: IronframeWorkforcePhase;
  size?: IronframeFaviconSize;
  coreStatus?: IronframeCoreStatus;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "width" | "height">;

/**
 * 19-node interlocking hex: 1 Ironcore + 6×3 outer segments (no monogram / no spinner).
 */
export function IronframeFavicon({
  phase,
  size = "sm",
  coreStatus = "powered-on",
  className,
  ...rest
}: Props) {
  const px = SIZE_PX[size];
  const nodes = workforceHexSurroundNodes(CX, CY, DEFAULT_ARM_RADII);
  const dirs = workforceHexArmDirections();
  const spokeInner = CORE_R + 1.2;

  const coreDimmed = coreStatus !== "powered-on";
  const coreOuterFill = coreDimmed ? "#94a3b8" : "#ffffff";
  const coreInnerFill = coreDimmed ? "#64748b" : "#ffffff";

  const outerGeometry = (
    <>
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
            stroke="currentColor"
            strokeWidth={1.35}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={phase === "ASSIGNED" ? 0.5 : 0.55}
          />
        );
      })}
      {nodes.map((p, i) => (
        <circle
          key={`n-${i}`}
          cx={p.x}
          cy={p.y}
          r={4.85}
          fill="currentColor"
          opacity={0.92}
        />
      ))}
    </>
  );

  const ironcore = (
    <g className="ironframe-ironcore">
      <circle
        cx={CX}
        cy={CY}
        r={CORE_R + 1.2}
        fill={coreOuterFill}
        opacity={coreDimmed ? 0.55 : 0.98}
        className={cn(
          !coreDimmed &&
            (phase === "SCANNING"
              ? "drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]"
              : phase === "ASSIGNED"
                ? "drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                : "drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]"),
        )}
      />
      <circle
        cx={CX}
        cy={CY}
        r={CORE_R - 1.5}
        fill={coreInnerFill}
        stroke={phase === "ASSIGNED" ? "currentColor" : phase === "SCANNING" ? "#22d3ee" : "none"}
        strokeWidth={phase === "ASSIGNED" ? 0.9 : phase === "SCANNING" ? 1.1 : 0}
        opacity={coreDimmed ? 0.7 : 1}
      />
    </g>
  );

  if (phase === "ASSIGNED") {
    return (
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        width={px}
        height={px}
        className={cn("text-cyan-400", className)}
        aria-hidden
        {...rest}
      >
        <title>Ironframe workforce lock</title>
        <g className="text-cyan-400">
          {outerGeometry}
          {ironcore}
        </g>
      </svg>
    );
  }

  if (phase === "SCANNING") {
    return (
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        width={px}
        height={px}
        className={className}
        aria-hidden
        {...rest}
      >
        <title>Ironframe workforce lock — scanning</title>
        <g className="text-amber-500 animate-pulse-amber">{outerGeometry}</g>
        {ironcore}
      </svg>
    );
  }

  /* VERIFIED — entire 19-node structure flashes emerald */
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={px}
      height={px}
      className={className}
      aria-hidden
      {...rest}
    >
      <title>Ironframe workforce lock — verified</title>
      <g className="text-emerald-500 animate-flash-green">
        {outerGeometry}
        <circle
          cx={CX}
          cy={CY}
          r={CORE_R + 1.2}
          fill="currentColor"
          opacity={0.95}
        />
        <circle cx={CX} cy={CY} r={CORE_R - 1.5} fill="currentColor" opacity={1} />
      </g>
    </svg>
  );
}
