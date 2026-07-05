"use client";

import type { InTenantSupportUrgency } from "@/app/types/inTenantSupportTelemetry";
import { useInTenantSupportDrawerStore } from "@/app/store/inTenantSupportDrawerStore";

export const REQUEST_ENGINEERING_HELP_LABEL = "Request engineering help";

type RequestEngineeringHelpTriggerProps = {
  urgency?: InTenantSupportUrgency;
  surface?: string;
  className?: string;
  children?: string;
};

/** Contextual CTA — opens the in-tenant support drawer with forensic telemetry attached. */
export default function RequestEngineeringHelpTrigger({
  urgency,
  surface,
  className = "inline-flex h-11 items-center text-cyan-300 underline-offset-2 hover:underline",
  children = REQUEST_ENGINEERING_HELP_LABEL,
}: RequestEngineeringHelpTriggerProps) {
  const open = useInTenantSupportDrawerStore((s) => s.open);

  return (
    <button
      type="button"
      onClick={() => open({ urgency, surface })}
      className={className}
    >
      {children}
    </button>
  );
}
