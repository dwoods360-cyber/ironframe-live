import type { ComponentPropsWithoutRef } from "react";

type RiskSparkbarProps = {
  trendPoints: number[];
  statusLabel?: string;
} & ComponentPropsWithoutRef<"div">;

type BarTone = "improved" | "declined" | "neutral";

const BAR_TONE_CLASS: Record<BarTone, string> = {
  improved: "bg-emerald-400",
  declined: "bg-red-400",
  neutral: "bg-slate-500",
};

const LABEL_TONE_CLASS: Record<BarTone, string> = {
  improved: "text-emerald-300",
  declined: "text-red-300",
  neutral: "text-slate-400",
};

const MIN_HEIGHT = 5;
const MAX_HEIGHT = 16;

export default function RiskSparkbar({ trendPoints, statusLabel, className, ...props }: RiskSparkbarProps) {
  const source = trendPoints.length >= 5 ? trendPoints.slice(-5) : [...trendPoints];
  while (source.length < 5) {
    source.unshift(source[0] ?? 50);
  }

  const max = Math.max(...source, 1);
  const min = Math.min(...source, 0);
  const span = Math.max(max - min, 1);

  const bars = source.map((value, index) => {
    const prior = index === 0 ? source[index] : source[index - 1];
    const delta = value - prior;
    const tone: BarTone = delta > 0 ? "improved" : delta < 0 ? "declined" : "neutral";
    const normalized = (value - min) / span;
    const height = Math.round(MIN_HEIGHT + normalized * (MAX_HEIGHT - MIN_HEIGHT));

    return {
      key: `risk-bar-${index}-${value}`,
      height,
      tone,
    };
  });

  const latestTone = bars[bars.length - 1]?.tone ?? "neutral";
  const resolvedStatusLabel = statusLabel && statusLabel.trim().length > 0 ? statusLabel : "Status Stable";

  return (
    <div
      className={`flex shrink-0 flex-col items-center gap-0.5 ${className ?? ""}`.trim()}
      {...props}
    >
      <div className="flex h-4 items-end gap-0.5" aria-hidden="true">
        {bars.map((bar) => (
          <span
            key={bar.key}
            className={`block w-1 rounded-[2px] ${BAR_TONE_CLASS[bar.tone]}`}
            style={{ height: `${bar.height}px` }}
          />
        ))}
      </div>
      <p className={`max-w-[110px] text-center text-[10px] font-bold uppercase leading-none tracking-tight ${LABEL_TONE_CLASS[latestTone]}`}>
        Recently Alight // {resolvedStatusLabel}
      </p>
    </div>
  );
}