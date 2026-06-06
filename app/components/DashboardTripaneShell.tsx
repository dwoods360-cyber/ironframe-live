"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
  DASHBOARD_CENTER_PANE,
  DASHBOARD_LEFT_PANE,
  DASHBOARD_RIGHT_PANE,
  DASHBOARD_TRIPANE_SHELL,
} from "@/app/lib/dashboardTripaneLayout";

export type DashboardTripaneShellProps = {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  leftAsideProps?: ComponentPropsWithoutRef<"aside">;
  centerMainProps?: ComponentPropsWithoutRef<"main">;
  rightAsideProps?: ComponentPropsWithoutRef<"aside">;
  shellClassName?: string;
  leftPaneTestId?: string;
  centerPaneTestId?: string;
  rightPaneAuditIntelligence?: boolean;
};

/**
 * Canonical tripane shell — 22vw · 48vw · 30vw fixed rails.
 * All width / select-text invariants live in `dashboardTripaneLayout.ts`.
 */
export function DashboardTripaneShell({
  left,
  center,
  right,
  leftAsideProps,
  centerMainProps,
  rightAsideProps,
  shellClassName,
  leftPaneTestId,
  centerPaneTestId,
  rightPaneAuditIntelligence,
}: DashboardTripaneShellProps) {
  const shellClasses = shellClassName
    ? `${DASHBOARD_TRIPANE_SHELL} ${shellClassName}`
    : DASHBOARD_TRIPANE_SHELL;

  return (
    <div className={shellClasses}>
      <aside
        className={DASHBOARD_LEFT_PANE}
        data-testid={leftPaneTestId}
        {...leftAsideProps}
      >
        {left}
      </aside>
      <main
        className={DASHBOARD_CENTER_PANE}
        data-testid={centerPaneTestId}
        {...centerMainProps}
      >
        {center}
      </main>
      <aside
        className={DASHBOARD_RIGHT_PANE}
        data-ironframe-audit-intelligence={rightPaneAuditIntelligence ? "true" : undefined}
        {...rightAsideProps}
      >
        {right}
      </aside>
    </div>
  );
}

export default DashboardTripaneShell;
