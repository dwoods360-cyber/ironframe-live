import "server-only";

import {
  EPIC_12_THREAT_EVENT_WORM_VIOLATION_MESSAGE,
  isBlockedThreatEventWormAction,
  threatEventWormGuardActive,
} from "@/app/lib/evidence/threatEventWormGuardPolicy";
import { threatEventWormBypassInScope } from "@/app/lib/evidence/threatEventWormGuardScope.server";

export {
  EPIC_12_THREAT_EVENT_WORM_VIOLATION_MESSAGE,
  buildWormAuditedBypassLabel,
  isBlockedThreatEventWormAction,
  threatEventWormGuardActive,
} from "@/app/lib/evidence/threatEventWormGuardPolicy";

export {
  runWithThreatEventWormBypassScope,
  threatEventWormBypassInScope,
} from "@/app/lib/evidence/threatEventWormGuardScope.server";

export function assertThreatEventWormMutationPermitted(action: string): void {
  if (threatEventWormBypassInScope()) return;
  if (!threatEventWormGuardActive()) return;
  if (!isBlockedThreatEventWormAction(action)) return;
  throw new Error(EPIC_12_THREAT_EVENT_WORM_VIOLATION_MESSAGE);
}
