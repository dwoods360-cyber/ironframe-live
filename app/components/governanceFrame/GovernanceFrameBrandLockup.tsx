import Image from "next/image";

/** Static brand lockup — no data fetching; air-gapped presentation only. */
export const IRONFRAME_LOGO_PATH = "/assets/Ironframe_logo.svg";

type GovernanceFrameBrandLockupProps = {
  className?: string;
  /** `research` = institute public site; `dark` = legacy / product-adjacent chrome. */
  variant?: "research" | "dark";
  /** Hero-scale lockup for the publication home first viewport. */
  size?: "default" | "hero";
};

export default function GovernanceFrameBrandLockup({
  className = "",
  variant = "dark",
  size = "default",
}: GovernanceFrameBrandLockupProps) {
  const isResearch = variant === "research";
  const isHero = size === "hero";

  return (
    <div
      className={`flex items-center gap-3 ${isHero ? "gap-4 sm:gap-5" : ""} ${className}`.trim()}
    >
      <div
        className={`relative shrink-0 ${isHero ? "h-12 w-12 sm:h-14 sm:w-14" : "h-8 w-8"}`}
        aria-hidden
      >
        <Image
          src={IRONFRAME_LOGO_PATH}
          alt=""
          width={isHero ? 56 : 32}
          height={isHero ? 56 : 32}
          className={isHero ? "h-12 w-12 sm:h-14 sm:w-14" : "h-8 w-8"}
          priority
        />
        <span
          className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            isHero ? "h-2 w-2" : "h-1.5 w-1.5"
          } ${
            isResearch
              ? "animate-[gf-pulse_2.8s_ease-in-out_infinite] bg-[var(--gf-accent)] shadow-[0_0_12px_var(--gf-accent-glow)]"
              : "animate-pulse-amber bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.85)]"
          }`}
        />
      </div>
      <div>
        <h1
          className={
            isResearch
              ? isHero
                ? "font-[family-name:var(--font-gf-serif)] text-3xl font-semibold tracking-tight text-[var(--gf-ink)] sm:text-4xl md:text-5xl"
                : "font-[family-name:var(--font-gf-serif)] text-xl font-semibold tracking-tight text-[var(--gf-ink)] sm:text-2xl"
              : "font-mono text-sm font-bold uppercase tracking-[0.22em] text-slate-50 sm:text-base"
          }
        >
          Governance Frame
        </h1>
        {isResearch ? (
          <p
            className={`mt-0.5 font-[family-name:var(--font-gf-sans)] font-semibold uppercase tracking-[0.18em] text-[var(--gf-accent-deep)] ${
              isHero ? "text-[11px] sm:text-xs" : "text-[10px]"
            }`}
          >
            Research
          </p>
        ) : null}
      </div>
    </div>
  );
}
