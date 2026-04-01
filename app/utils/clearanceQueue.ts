import { ThreatState } from "@prisma/client";

/** DMZ / Irongate clearance UI: pipeline work plus Ironlock-quarantined rows. */
export const CLEARANCE_QUEUE_STATUSES: ThreatState[] = [
  ThreatState.PIPELINE,
  ThreatState.QUARANTINED,
];
