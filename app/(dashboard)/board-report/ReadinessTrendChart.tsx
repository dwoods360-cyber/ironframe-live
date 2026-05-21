"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailySnapshotPoint } from "@/lib/reporting/boardReportQueries";

type Props = {
  data: DailySnapshotPoint[];
};

function trendImproving(points: DailySnapshotPoint[]): boolean | null {
  if (points.length < 2) return null;
  const a = points[0]?.score;
  const b = points[points.length - 1]?.score;
  if (a === undefined || b === undefined) return null;
  return b > a;
}

function formatLossCents(cents: string): string {
  try {
    const usd = Number(BigInt(cents)) / 100;
    return usd.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  } catch {
    return cents;
  }
}

type SnapshotTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: DailySnapshotPoint }>;
};

function SnapshotTooltip({ active, payload }: SnapshotTooltipProps) {
  if (!active || !payload?.[0]) return null;
  const row = payload[0].payload as DailySnapshotPoint;
  return (
    <div className="rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-[10px] text-zinc-100 shadow-lg">
      <div className="font-mono text-zinc-400">{row.date}</div>
      <div>
        Readiness: <span className="font-bold text-emerald-300">{row.score}</span>
      </div>
      <div className="text-zinc-300">Loss snapshot: {formatLossCents(row.totalLossCents)}</div>
    </div>
  );
}

/** 7-day readiness trend: stroke uses green→red (worsening) or red→green (improving). */
export default function ReadinessTrendChart({ data }: Props) {
  const improving = trendImproving(data);
  const gradId = "readinessTrendStroke";
  const strokeUrl = `url(#${gradId})`;

  const g0 = improving === true ? "#f97316" : "#22c55e";
  const g1 = improving === true ? "#22c55e" : "#ef4444";
  const gMid = improving === null ? "#a3a3a3" : improving ? "#84cc16" : "#eab308";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 print:border-zinc-300 print:bg-white">
      <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 print:text-zinc-700">
        7-day readiness trend
      </h3>
      <p className="mt-1 text-[9px] text-zinc-600 print:text-zinc-700">
        Daily snapshots (UTC). Line gradient:{" "}
        {improving === true
          ? "improving (warmer → green)."
          : improving === false
            ? "declining (green → red)."
            : "insufficient points — neutral."}
      </p>
      {data.length === 0 ? (
        <p className="mt-4 text-[9px] text-zinc-600">No snapshots yet. Use “Capture today” or dev simulation.</p>
      ) : (
        <div className="mt-3 h-56 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={g0} stopOpacity={1} />
                  <stop offset="50%" stopColor={gMid} stopOpacity={1} />
                  <stop offset="100%" stopColor={g1} stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.5)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#a1a1aa" }} stroke="#52525b" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#a1a1aa" }} stroke="#52525b" width={28} />
              <Tooltip content={<SnapshotTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke={strokeUrl}
                strokeWidth={2.5}
                dot={{ r: 3, fill: g1, stroke: "#27272a" }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
