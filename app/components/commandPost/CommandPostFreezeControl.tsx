"use client";

import { Lock, Unlock } from "lucide-react";
import { useLayoutStore } from "@/app/store/useLayoutStore";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { logStructuredEvent } from "@/lib/structuredServerLog";

type Props = {
  className?: string;
  /** Compact styling for Op Support section header. */
  variant?: "topnav" | "section";
};

export default function CommandPostFreezeControl({ className = "", variant = "section" }: Props) {
  const isUiLocked = useLayoutStore((s) => s.isUiLocked);
  const setUiLocked = useLayoutStore((s) => s.setUiLocked);

  const onToggle = () => {
    const next = !isUiLocked;
    setUiLocked(next);
    appendAuditLog({
      action_type: "CONFIG_CHANGE",
      log_type: "TELEMETRY",
      metadata_tag: "IRONLOCK|UI_OVERRIDE|COMMAND_POST_LOCK",
      forensic: {
        sourceName: "Ironlock",
        eventLevel: "system",
        message: next
          ? "[UI_OVERRIDE] Human operator froze Command Post layout."
          : "[UI_OVERRIDE] Human operator unlocked Command Post layout.",
      },
    });
    logStructuredEvent(
      "Ironlock",
      "UI_OVERRIDE",
      { commandPostLocked: next, channel: "COMMAND_POST" },
      next ? "warn" : "info",
    );
  };

  const lockedStyles =
    "border-rose-500/90 bg-rose-950/70 text-rose-100 shadow-[0_0_14px_rgba(244,63,94,0.35)]";
  const unlockedStyles =
    "border-amber-600/50 bg-amber-950/30 text-amber-100 hover:border-amber-500/80 hover:bg-amber-900/40";

  const variantStyles =
    variant === "topnav"
      ? `ml-1 px-2 py-1 text-[8px] font-black tracking-wide ${isUiLocked ? lockedStyles : unlockedStyles}`
      : `px-2.5 py-1 text-[9px] font-bold tracking-wide ${isUiLocked ? lockedStyles : unlockedStyles}`;

  const label =
    variant === "topnav"
      ? isUiLocked
        ? "UNLOCK AGENT UI"
        : "FREEZE COMMAND POST"
      : isUiLocked
        ? "Unlock command post"
        : "Freeze command post UI";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded border uppercase transition ${variantStyles} ${className}`}
      title={isUiLocked ? "Unlock agent-led Command Post adjustments" : "Freeze Command Post layout for manual audit"}
      aria-pressed={isUiLocked}
    >
      {isUiLocked ? (
        <Lock size={11} className="shrink-0 text-rose-200" aria-hidden />
      ) : (
        <Unlock size={11} className="shrink-0 text-amber-200" aria-hidden />
      )}
      {label}
    </button>
  );
}
