import type { ComponentPropsWithoutRef } from "react";

type RiskSparklineProps = {
  trendPoints: number[];
  riskTier: "CRITICAL" | "HIGH" | "LOW";
} & ComponentPropsWithoutRef<"svg">;

const STROKE_BY_RISK: Record<RiskSparklineProps["riskTier"], string> = {
  CRITICAL: "rgb(252 165 165)",
  HIGH: "rgb(253 186 116)",
  LOW: "rgb(110 231 183)",
};

export default function RiskSparkline({ trendPoints, riskTier, className, ...props }: RiskSparklineProps) {
  const width = 64;
  const height = 20;

  const bounded = trendPoints.length > 0 ? trendPoints : [50, 50, 50, 50, 50, 50, 50];
  const max = Math.max(...bounded, 1);
  const min = Math.min(...bounded, 0);
  const span = Math.max(max - min, 1);

  const polyline = bounded
    .map((value, index) => {
      const x = (index / Math.max(bounded.length - 1, 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`shrink-0 ${className ?? ""}`.trim()}
      aria-hidden="true"
      {...props}
    >
      <line x1="0" y1={height} x2={width} y2={height} stroke="rgb(51 65 85)" strokeWidth="1" />
      <polyline points={polyline} fill="none" stroke={STROKE_BY_RISK[riskTier]} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
