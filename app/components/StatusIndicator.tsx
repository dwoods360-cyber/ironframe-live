type StatusIndicatorProps = {
  status: "healthy" | "critical";
  label?: string;
  pulse?: boolean;
};

export default function StatusIndicator({ status, label, pulse = true }: StatusIndicatorProps) {
  const isHealthy = status === "healthy";

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase ${isHealthy ? "text-emerald-400" : "text-red-400"}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-red-500"} ${pulse ? "animate-pulse" : ""}`}
      />
      {label ?? (isHealthy ? "Healthy" : "Critical")}
    </span>
  );
}
