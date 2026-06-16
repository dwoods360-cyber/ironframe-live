import Image from "next/image";

/** Static brand lockup — no data fetching; air-gapped presentation only. */
export const IRONFRAME_LOGO_PATH = "/assets/Ironframe_logo.svg";

type GovernanceFrameBrandLockupProps = {
  className?: string;
};

export default function GovernanceFrameBrandLockup({
  className = "",
}: GovernanceFrameBrandLockupProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div className="relative h-8 w-8 shrink-0" aria-hidden>
        <Image
          src={IRONFRAME_LOGO_PATH}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8"
          priority
        />
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 animate-pulse-amber shadow-[0_0_8px_rgba(251,191,36,0.85)]" />
      </div>
      <h1 className="font-mono text-sm font-bold uppercase tracking-[0.22em] text-slate-50 sm:text-base">
        The Governance Frame
      </h1>
    </div>
  );
}
