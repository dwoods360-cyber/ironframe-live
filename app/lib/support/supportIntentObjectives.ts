/** Golden Path–aligned support objectives (structured triage, not free-form guessing). */
import type { InTenantSupportObjective } from "@/app/types/inTenantSupportTelemetry";

export type { InTenantSupportObjective };

export const SUPPORT_INTENT_OPTIONS: Array<{
  value: InTenantSupportObjective;
  label: string;
}> = [
  { value: "WORKSPACE_ACTIVATION", label: "Activate workspace / invitation / sign-in" },
  { value: "ONBOARDING_PROFILE", label: "Complete Get Started (ALE + company profile)" },
  { value: "INTEGRITY_REVIEW", label: "Review Integrity Hub / control posture" },
  { value: "ANALYST_EXPORT", label: "Generate analyst export (Ironquery CSV/PDF)" },
  { value: "BILLING_ENTITLEMENT", label: "Resolve billing hold or entitlement gate" },
  { value: "TENANT_ACCESS", label: "Fix tenant subdomain / access / 403 errors" },
  { value: "COMPLIANCE_MAPPING", label: "Framework mapping or compliance crosswalk" },
  { value: "EVIDENCE_VAULT", label: "Evidence vault upload or retrieval" },
  { value: "TRAINING_DOCUMENTATION", label: "Training corpus or documentation path" },
  { value: "OTHER", label: "Other objective (describe below)" },
];

const FRAMEWORK_TO_OBJECTIVE: Record<string, InTenantSupportObjective> = {
  IRONQUERY_ANALYST_EXPORT: "ANALYST_EXPORT",
  INTEGRITY_HUB: "INTEGRITY_REVIEW",
  OPERATOR_ONBOARDING: "ONBOARDING_PROFILE",
  COMPLIANCE_FRAMEWORKS: "COMPLIANCE_MAPPING",
  EVIDENCE_VAULT: "EVIDENCE_VAULT",
  COMMAND_POST: "TENANT_ACCESS",
  GLOBAL_WORKSPACE: "TENANT_ACCESS",
  SUPPORT_CONSOLE: "OTHER",
};

export function resolveDefaultSupportObjective(frameworkContext: string): InTenantSupportObjective {
  return FRAMEWORK_TO_OBJECTIVE[frameworkContext.trim()] ?? "OTHER";
}

export function supportObjectiveLabel(objective: InTenantSupportObjective): string {
  return SUPPORT_INTENT_OPTIONS.find((option) => option.value === objective)?.label ?? objective;
}

export const SUPPORT_OBJECTIVE_VALUES = new Set<InTenantSupportObjective>(
  SUPPORT_INTENT_OPTIONS.map((option) => option.value),
);
