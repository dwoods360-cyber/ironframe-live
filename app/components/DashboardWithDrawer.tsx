'use client';

import { useRiskStore } from '@/app/store/riskStore';
import ThreatDetailDrawer from '@/components/ThreatDetailDrawer';

type DashboardWithDrawerProps = {
  children: React.ReactNode;
  /** When provided, the page owns drawer state instead of the store */
  selectedThreatId?: string | null;
  setSelectedThreatId?: (id: string | null) => void;
  /** Optional hash to scroll to when drawer opens (e.g. "ai-report", "analyst-notes") */
  drawerFocus?: string | null;
  clearDrawerFocus?: () => void;
};

export default function DashboardWithDrawer({
  children,
  selectedThreatId: selectedThreatIdProp,
  setSelectedThreatId: setSelectedThreatIdProp,
  drawerFocus,
  clearDrawerFocus,
}: DashboardWithDrawerProps) {
  const storeSelected = useRiskStore((s) => s.selectedThreatId);
  const storeSet = useRiskStore((s) => s.setSelectedThreatId);

  const selectedThreatId = setSelectedThreatIdProp != null ? selectedThreatIdProp ?? null : storeSelected;
  const setSelectedThreatId = setSelectedThreatIdProp ?? storeSet;

  return (
    <>
      {children}
      {selectedThreatId != null && (
        <ThreatDetailDrawer
          threatId={selectedThreatId}
          onClose={() => {
            setSelectedThreatId(null);
            clearDrawerFocus?.();
          }}
          initialFocusHash={drawerFocus ?? undefined}
          onFocusHandled={clearDrawerFocus}
        />
      )}
    </>
  );
}
