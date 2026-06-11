import type { ElementType, ReactNode } from "react";
import { isValidLeftPanelFeatureIndex } from "@/app/config/leftPanelFeatureIndex";

type IndexProps = {
  /** Canonical 0-based left-rail feature id (alias: `indexId`). */
  index: number;
  indexId?: number;
  className?: string;
};

/** Small mono index badge shown to the left of left-panel feature titles. */
export function LeftPanelFeatureIndex({ index, indexId, className = "" }: IndexProps) {
  const resolvedIndex = indexId ?? index;
  if (process.env.NODE_ENV !== "production" && !isValidLeftPanelFeatureIndex(resolvedIndex)) {
    console.warn(`[left-panel] invalid feature index badge: ${resolvedIndex}`);
  }

  const twoDigit = resolvedIndex >= 10;

  return (
    <span
      className={`inline-flex h-4 shrink-0 items-center justify-center rounded border border-amber-600/60 bg-zinc-900/95 px-1 font-mono text-[9px] font-black leading-none tabular-nums text-amber-400 shadow-[0_0_0_1px_rgba(9,9,11,0.9)] ${
        twoDigit ? "min-w-[1.35rem]" : "min-w-[1.1rem]"
      } ${className}`}
      data-left-panel-feature-index={resolvedIndex}
      aria-hidden
    >
      {resolvedIndex}
    </span>
  );
}

type TitleProps = {
  index: number;
  indexId?: number;
  children: ReactNode;
  className?: string;
  as?: ElementType;
  id?: string;
};

function splitTruncateClass(className: string): { shellClass: string; labelClass: string } {
  if (!/\btruncate\b/.test(className)) {
    return { shellClass: className, labelClass: "" };
  }
  return {
    shellClass: className.replace(/\btruncate\b/g, "").replace(/\s+/g, " ").trim(),
    labelClass: "min-w-0 truncate",
  };
}

export function LeftPanelFeatureTitle({
  index,
  indexId,
  children,
  className = "",
  as: Tag = "span",
  id,
}: TitleProps) {
  const resolvedIndex = indexId ?? index;
  const { shellClass, labelClass } = splitTruncateClass(className);

  return (
    <Tag
      id={id}
      className={`inline-flex max-w-full min-w-0 items-center gap-1.5 ${shellClass}`}
      data-left-panel-feature-title={resolvedIndex}
    >
      <LeftPanelFeatureIndex index={resolvedIndex} />
      {labelClass ? <span className={labelClass}>{children}</span> : children}
    </Tag>
  );
}
