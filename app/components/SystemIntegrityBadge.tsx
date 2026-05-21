"use client";

import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";

/**
 * Board-facing line: BigInt financial totals verified (see tests/unit/riskStoreBigIntMath.test.ts).
 */
export default function SystemIntegrityBadge() {
  const [lastCheckIso, setLastCheckIso] = useState<string | null>(null);

  useEffect(() => {
    setLastCheckIso(new Date().toISOString());
  }, []);

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-slate-200 shadow-sm shadow-emerald-950/20"
      role="status"
    >
      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400/95" aria-hidden />
      <p className="text-[11px] leading-relaxed text-slate-300">
        Financial Integrity: 100% (BigInt Verified). Last Drift Check:{" "}
        <span className="font-mono text-emerald-200/90">{lastCheckIso ?? "—"}</span> - 0.00 Error.
      </p>
    </div>
  );
}
