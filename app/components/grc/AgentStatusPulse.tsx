"use client";

import React from "react";

export interface AgentStatusPulseProps {
  /** Single left-click — toggle 19-agent overview overlay. */
  onSingleClick: () => void;
  /** Double left-click — flush system telemetry cache. */
  onDoubleClick: () => void;
  /** Right-click — open Agent Log Inspector (native context menu not blocked). */
  onRightClick: () => void;
}

export const AgentStatusPulse: React.FC<AgentStatusPulseProps> = ({
  onSingleClick,
  onDoubleClick,
  onRightClick,
}) => {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSingleClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={() => {
          onRightClick();
        }}
        className="relative flex h-4 w-4 items-center justify-center rounded-full bg-teal-500/20 focus:outline-none focus:ring-2 focus:ring-teal-400"
        title="Agent Status Pulse (Left-click: Status | Double-click: Flush | Right-click: Logs)"
        aria-label="Agent status pulse — left-click roster overlay, double-click flush telemetry, right-click agent logs"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
      </button>
      <span className="select-none font-mono text-xs text-teal-400">PULSE-002</span>
    </div>
  );
};

export default AgentStatusPulse;
