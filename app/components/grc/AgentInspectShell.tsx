"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { GovernanceMaturitySnapshot } from "@/app/types/governanceMaturity";
import AgentInspectSlideOutPanel from "@/app/components/grc/AgentInspectSlideOutPanel";
import AgentPillStickyPopover from "@/app/components/grc/AgentPillStickyPopover";
import { useAgentStore } from "@/app/store/agentStore";

type AgentInspectShellProps = {
  governanceMaturity?: GovernanceMaturitySnapshot | null;
};

/**
 * Right-side inspect rail portaled to `document.body` — escapes left-rail z-0 /
 * overflow-hidden stacking (same fix as historical `GrcAgentMetaDrawer`).
 */
export default function AgentInspectShell({
  governanceMaturity = null,
}: AgentInspectShellProps) {
  const activeAgentInspectId = useAgentStore((s) => s.activeAgentInspectId);
  const agentInspectRuntime = useAgentStore((s) => s.agentInspectRuntime);
  const agentInspectAudit = useAgentStore((s) => s.agentInspectAudit);
  const closeAgentInspectPanel = useAgentStore((s) => s.closeAgentInspectPanel);
  const agentPillPopover = useAgentStore((s) => s.agentPillPopover);
  const closeAgentPillPopover = useAgentStore((s) => s.closeAgentPillPopover);

  const [mounted, setMounted] = useState(false);
  const [lastPanelAgentId, setLastPanelAgentId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeAgentInspectId) {
      setLastPanelAgentId(activeAgentInspectId);
    }
  }, [activeAgentInspectId]);

  useEffect(() => {
    if (!activeAgentInspectId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [activeAgentInspectId]);

  const panelAgentId = activeAgentInspectId ?? lastPanelAgentId;
  const panelOpen = activeAgentInspectId != null;
  const showSlideOut = panelAgentId && agentInspectRuntime;

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      {agentPillPopover ? (
        <AgentPillStickyPopover popover={agentPillPopover} onClose={closeAgentPillPopover} />
      ) : null}
      {showSlideOut ? (
        <AgentInspectSlideOutPanel
          agentId={panelAgentId}
          runtime={agentInspectRuntime}
          audit={agentInspectAudit}
          open={panelOpen}
          governanceMaturity={governanceMaturity}
          onClose={closeAgentInspectPanel}
        />
      ) : null}
    </>,
    document.body,
  );
}
