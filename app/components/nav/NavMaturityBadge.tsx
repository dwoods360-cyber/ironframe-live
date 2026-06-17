import type { NavMaturityBadge as NavMaturityBadgeLabel } from "@/app/config/stagedNavSurfaces";

type NavMaturityBadgeProps = {
  label: NavMaturityBadgeLabel;
};

/** Subtle dark-mode monospace badge for stub / preview nav targets. */
export default function NavMaturityBadge({ label }: NavMaturityBadgeProps) {
  return (
    <span
      className="shrink-0 rounded border border-slate-700/70 bg-slate-950/80 px-1 py-px font-mono text-[7px] font-bold uppercase tracking-[0.14em] text-slate-500"
      aria-label={`${label} surface`}
    >
      {label}
    </span>
  );
}
