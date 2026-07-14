/** Conversation targets for the single Ops Hub PTT / Ask panel. */
export const OPS_CHAT_TARGETS = [
  "ironboard",
  "ironleads",
  "salesteam",
  "success-team",
  "support-team",
] as const;

export type OpsChatTarget = (typeof OPS_CHAT_TARGETS)[number];

/** Perimeter poll workers only (excludes IronBoard boardroom). */
export const OPS_WORKER_IDS = [
  "ironleads",
  "salesteam",
  "success-team",
  "support-team",
] as const;

export type OpsWorkerId = (typeof OPS_WORKER_IDS)[number];

export function isOpsChatTarget(value: string): value is OpsChatTarget {
  return (OPS_CHAT_TARGETS as readonly string[]).includes(value);
}

export function isOpsWorkerId(value: string): value is OpsWorkerId {
  return (OPS_WORKER_IDS as readonly string[]).includes(value);
}
