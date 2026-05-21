import type { ReactNode } from "react";

export type ForensicChipTone =
  | "violet"
  | "emerald"
  | "teal"
  | "amber"
  | "cyan"
  | "rose"
  | "slate";

const TONE: Record<
  ForensicChipTone,
  { shell: string; label: string; value: string; sub: string; inset: string }
> = {
  violet: {
    shell: "border-violet-800/55 bg-violet-950/40 text-violet-100/95",
    label: "text-violet-300/90",
    value: "text-violet-50",
    sub: "text-violet-300/75",
    inset: "shadow-[inset_0_1px_0_0_rgba(167,139,250,0.12)]",
  },
  emerald: {
    shell: "border-emerald-800/55 bg-emerald-950/40 text-emerald-100/95",
    label: "text-emerald-300/90",
    value: "text-emerald-50",
    sub: "text-emerald-300/75",
    inset: "shadow-[inset_0_1px_0_0_rgba(52,211,153,0.1)]",
  },
  teal: {
    shell: "border-teal-800/55 bg-teal-950/40 text-teal-100/95",
    label: "text-teal-300/90",
    value: "text-teal-50",
    sub: "text-teal-300/75",
    inset: "shadow-[inset_0_1px_0_0_rgba(45,212,191,0.1)]",
  },
  amber: {
    shell: "border-amber-800/55 bg-amber-950/40 text-amber-100/95",
    label: "text-amber-300/90",
    value: "text-amber-50",
    sub: "text-amber-300/75",
    inset: "shadow-[inset_0_1px_0_0_rgba(251,191,36,0.1)]",
  },
  cyan: {
    shell: "border-cyan-800/55 bg-cyan-950/40 text-cyan-100/95",
    label: "text-cyan-300/90",
    value: "text-cyan-50",
    sub: "text-cyan-300/75",
    inset: "shadow-[inset_0_1px_0_0_rgba(34,211,238,0.1)]",
  },
  rose: {
    shell: "border-rose-800/55 bg-rose-950/40 text-rose-100/95",
    label: "text-rose-300/90",
    value: "text-rose-50",
    sub: "text-rose-300/75",
    inset: "shadow-[inset_0_1px_0_0_rgba(251,113,133,0.1)]",
  },
  slate: {
    shell: "border-slate-700/55 bg-slate-950/40 text-slate-100/95",
    label: "text-slate-300/90",
    value: "text-slate-50",
    sub: "text-slate-400/75",
    inset: "shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)]",
  },
};

export type ForensicMetricChipProps = {
  label: string;
  value: string;
  sublabel?: string | null;
  tone?: ForensicChipTone;
  title?: string;
  testId?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * High-contrast forensic metric chip — shared visual vertebrae for GRC maturity and ALE exposure strips.
 */
export default function ForensicMetricChip({
  label,
  value,
  sublabel,
  tone = "violet",
  title,
  testId,
  className = "",
  children,
}: ForensicMetricChipProps) {
  const t = TONE[tone];
  return (
    <div
      className={`rounded-lg border px-3.5 py-2.5 text-[10px] ${t.shell} ${t.inset} ${className}`.trim()}
      title={title}
      data-testid={testId}
    >
      <p className={`font-black uppercase tracking-[0.12em] ${t.label}`}>{label}</p>
      <p className={`mt-1 font-mono text-[12px] font-semibold tabular-nums ${t.value}`}>{value}</p>
      {sublabel ? <p className={`mt-0.5 text-[9px] ${t.sub}`}>{sublabel}</p> : null}
      {children}
    </div>
  );
}
