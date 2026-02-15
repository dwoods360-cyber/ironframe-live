import { Activity, AlertTriangle, ShieldCheck } from "lucide-react";

export type MetricHeroItem = {
  label: string;
  value: string;
};

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-100">{value}</p>
      </div>
      <div>{icon}</div>
    </div>
  );
}

export default function MetricHero({
  metrics,
}: {
  metrics?: [MetricHeroItem, MetricHeroItem, MetricHeroItem];
}) {
  const activeMetrics =
    metrics ??
    ([
      { label: "Compliance Score", value: "94.2%" },
      { label: "Open Findings", value: "12" },
      { label: "Active Audits", value: "04" },
    ] as [MetricHeroItem, MetricHeroItem, MetricHeroItem]);

  return (
    <section className="border-b border-slate-800 bg-slate-950/50 px-4 py-3">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label={activeMetrics[0].label}
          value={activeMetrics[0].value}
          icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
        />
        <MetricCard
          label={activeMetrics[1].label}
          value={activeMetrics[1].value}
          icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
        />
        <MetricCard
          label={activeMetrics[2].label}
          value={activeMetrics[2].value}
          icon={<Activity className="h-5 w-5 text-blue-400" />}
        />
      </div>
    </section>
  );
}