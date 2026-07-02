/**
 * Client-side guard for demo / seed-data exports (Feature 8 ledger, vendor registry CSV).
 * Active workspace sessions and unpaid billing must not trigger silent stub downloads.
 */

export type PilotStubExportGateInput = {
  activeTenantUuid: string | null;
  billingBlocked?: boolean;
  platformAdminBypass?: boolean;
};

export function shouldSuppressPilotStubExport(input: PilotStubExportGateInput): boolean {
  if (input.platformAdminBypass) return false;
  if (process.env.NODE_ENV === "production") return true;
  if (input.billingBlocked) return true;
  if (input.activeTenantUuid) return true;
  return false;
}

export const PILOT_STUB_EXPORT_BLOCKED_MESSAGE =
  "Seed-data exports are disabled for active workspaces until billing is ACTIVE. Use Analyst exports at /dashboard/exports after subscription confirmation.";

export const PILOT_STUB_WORKFLOW_BLOCKED_MESSAGE =
  "Vendor workflow menu actions are disabled on seed demonstration rows for active workspaces. Provision your tenant registry and confirm billing is ACTIVE before dispatching RFIs, map navigation, or risk overrides. Quarantine shields remain available for demonstrations.";
