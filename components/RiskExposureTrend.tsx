"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IndustryTrendPoint } from "@/app/actions/benchmarkActions";

export type RiskExposureTrendProps = {
  points: IndustryTrendPoint[];
  /** AUTO | K | M | B | T from risk store */
  currencyScale: string;
  /** Active sector label for header (must match Strategic Intel dropdown); typically `selectedIndustry`. */
  activeIndustry: string;
  weekOverWeekChangePct?: number | null;
};

function centsToUsd(centsStr: string): number {
  try {
    return Number(BigInt(centsStr)) / 100;
  } catch {
    return 0;
  }
}

/** Parse ISO calendar day as local date so ticks align with the viewer's month/week context. */
function formatWeekAxisLabel(isoYmd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim());
  if (!m) return isoYmd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatWeekTooltipTitle(isoYmd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim());
  if (!m) return isoYmd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function RiskExposureTrend({
  points,
  currencyScale,
  activeIndustry,
  weekOverWeekChangePct,
}: RiskExposureTrendProps) {
  const data = points.map((p) => ({
    weekIso: p.weekLabel,
    week: formatWeekAxisLabel(p.weekLabel),
    localAleUsd: centsToUsd(p.localAleCents),
    industryAleUsd: centsToUsd(p.industryAleCents),
  }));

  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-[10px] text-zinc-500">
        No benchmark trend data for this tenant&apos;s industry yet. Run migrations and seed, or wait for weekly Ironethic snapshots.
      </p>
    );
  }

  const formatUsd = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: v >= 1_000_000 ? "compact" : "standard",
      maximumFractionDigits: 1,
    }).format(v);

  const industryUpper = activeIndustry.trim() || "HEALTHCARE";

  return (
    <div className="w-full min-w-0">
      <p className="mb-1 text-[9px] font-mono uppercase tracking-wider text-zinc-500">
        IRONETHIC INDUSTRY MEAN ALE (WEEKLY) - {industryUpper.toUpperCase()}
        {weekOverWeekChangePct != null ? (
          <span className="text-zinc-600">
            {" "}
            · WoW {weekOverWeekChangePct > 0 ? "+" : ""}
            {weekOverWeekChangePct.toFixed(1)}%
          </span>
        ) : null}
      </p>
      <div className="h-[220px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="week" tick={{ fill: "#a1a1aa", fontSize: 9 }} />
          <YAxis
            tick={{ fill: "#a1a1aa", fontSize: 9 }}
            tickFormatter={(v) => (currencyScale === "AUTO" && v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${v}`)}
          />
          <Tooltip
            labelFormatter={(_, payload) => {
              const iso = payload?.[0]?.payload?.weekIso as string | undefined;
              return iso ? formatWeekTooltipTitle(iso) : "";
            }}
            formatter={(value, name) => [
              formatUsd(typeof value === "number" ? value : 0),
              name === "localAleUsd" ? "Your local ALE" : "Industry benchmark ALE",
            ]}
            contentStyle={{ background: "#09090b", border: "1px solid #3f3f46", fontSize: 10 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10 }}
            formatter={(value) =>
              value === "localAleUsd" ? "Your local ALE" : "Industry benchmark ALE"
            }
          />
          <Line type="monotone" dataKey="localAleUsd" name="localAleUsd" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          <Line
            type="monotone"
            dataKey="industryAleUsd"
            name="industryAleUsd"
            stroke="#a855f7"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
