"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

import { ConstitutionalTooltipPanel, type ConstitutionalTooltipTheme } from "@/app/components/ConstitutionalTooltip";
import { LAYOUT_SUBNAV_HEADER_Z_CLASS } from "@/app/config/layoutConstants";
import { directiveLabelForId, segmentConstitutionalText } from "@/app/config/constitutionalDirectives";
import { getTasFingerprintThrottled } from "@/app/utils/tasFingerprintClient";

export type { ConstitutionalTooltipTheme };

export type ConstitutionalTextProps = {
  text: string;
  className?: string;
  tooltipTheme?: ConstitutionalTooltipTheme;
  /** Audit rows use `role="button"`; keep card/detail clicks predictable. */
  stopClickPropagation?: boolean;
};

type TipState = {
  x: number;
  y: number;
  id: string;
  summary: string;
  anchorId: string;
  tasLine: number;
};

const HOVER_LEAVE_MS = 220;

export function ConstitutionalText({
  text,
  className,
  tooltipTheme = "slate",
  stopClickPropagation = false,
}: ConstitutionalTextProps) {
  const segments = useMemo(() => segmentConstitutionalText(text), [text]);
  const [tip, setTip] = useState<TipState | null>(null);
  const [tasFingerprintShort, setTasFingerprintShort] = useState<string | null>(null);
  const leaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getTasFingerprintThrottled()
      .then((j) => {
        const s = typeof j?.sha256Short === "string" ? j.sha256Short.trim() : "";
        if (!cancelled && s.length > 0) setTasFingerprintShort(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const clearLeaveTimer = () => {
    if (leaveTimerRef.current != null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearLeaveTimer();
    leaveTimerRef.current = window.setTimeout(() => setTip(null), HOVER_LEAVE_MS) as unknown as number;
  };

  useEffect(() => {
    if (!tip) return;
    const clear = () => setTip(null);
    window.addEventListener("scroll", clear, true);
    return () => window.removeEventListener("scroll", clear, true);
  }, [tip]);

  useEffect(() => {
    if (!tip) return;
    const dismiss = () => setTip(null);
    window.addEventListener("click", dismiss, true);
    return () => window.removeEventListener("click", dismiss, true);
  }, [tip]);

  useEffect(() => () => clearLeaveTimer(), []);

  const portal =
    tip && typeof document !== "undefined"
      ? createPortal(
          <div
            className={`fixed ${LAYOUT_SUBNAV_HEADER_Z_CLASS}`}
            style={{
              left: Math.max(8, Math.min(tip.x + 12, typeof window !== "undefined" ? window.innerWidth - 300 : 8)),
              top: Math.max(8, tip.y + 14),
            }}
            onMouseEnter={() => clearLeaveTimer()}
            onMouseLeave={() => scheduleClose()}
          >
            <ConstitutionalTooltipPanel
              theme={tooltipTheme}
              directiveLabel={directiveLabelForId(tip.id)}
              summary={tip.summary}
              anchorId={tip.anchorId}
              tasLine={tip.tasLine}
              fingerprintSha256Short={tasFingerprintShort}
              onLinkClick={stopClickPropagation ? (e) => e.stopPropagation() : undefined}
            />
          </div>,
          document.body,
        )
      : null;

  const openTip = (
    e: MouseEvent<HTMLElement>,
    seg: {
      id: string;
      summary: string;
      anchorId: string;
      tasLine: number;
    },
  ) => {
    clearLeaveTimer();
    setTip({
      x: e.clientX,
      y: e.clientY,
      id: seg.id,
      summary: seg.summary,
      anchorId: seg.anchorId,
      tasLine: seg.tasLine,
    });
  };

  const moveTip = (e: MouseEvent<HTMLElement>) => {
    setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : null));
  };

  return (
    <span className={className}>
      {segments.map((seg, idx) =>
        seg.kind === "text" ? (
          <span key={idx}>{seg.text}</span>
        ) : (
          <span
            key={idx}
            className="cursor-help border-b border-dashed border-slate-400/55"
            onMouseEnter={(e) => openTip(e, seg)}
            onMouseMove={moveTip}
            onMouseLeave={() => scheduleClose()}
            onClick={stopClickPropagation ? (ev) => ev.stopPropagation() : undefined}
          >
            {seg.text}
          </span>
        ),
      )}
      {portal}
    </span>
  );
}
