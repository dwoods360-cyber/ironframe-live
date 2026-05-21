"use client";

import type { MouseEvent } from "react";

export type VerifyArtifactButtonProps = {
  onClick: () => void;
  className?: string;
  "data-testid"?: string;
};

/** Deep-inspection trigger — opens portal ForensicAuditModal (parent-owned). */
export function VerifyArtifactButton({
  onClick,
  className = "",
  "data-testid": testId = "risk-card-verify-artifact",
}: VerifyArtifactButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded border border-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-500 transition-all hover:border-cyan-800/60 hover:text-cyan-400 ${className}`.trim()}
    >
      [ VERIFY ARTIFACT ]
    </button>
  );
}
