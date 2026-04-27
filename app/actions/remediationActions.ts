"use server";

/**
 * Lab restore entrypoint — logic in `@/lib/actions/remediate`; receipt shape in `@/app/types/remediationReceipt`.
 */
export { restoreSystemIntegrityAction } from "@/lib/actions/remediate";
export type { RemediationImpactReport } from "@/app/types/remediationReceipt";

/** Global automated stakeholder updates toggle (Control Room) — audited on each flip. */
export { toggleAutomatedUpdates, getAutomatedUpdatesEnabled } from "@/app/actions/simulationConfigActions";
