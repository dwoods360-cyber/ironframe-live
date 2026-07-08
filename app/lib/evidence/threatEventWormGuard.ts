/**
 * Client-safe WORM policy exports — no Node `async_hooks`.
 * Server mutation guards: `@/app/lib/evidence/threatEventWormGuard.server`.
 */
export {
  EPIC_12_THREAT_EVENT_WORM_VIOLATION_MESSAGE,
  buildWormAuditedBypassLabel,
  isBlockedThreatEventWormAction,
  threatEventWormGuardActive,
} from "@/app/lib/evidence/threatEventWormGuardPolicy";
