/**
 * String mirrors of selected Prisma enums for `"use client"` modules.
 * Do not import `@prisma/client` in client components — it pulls the server engine into the browser bundle.
 */

export const ControlState = {
  IDENTIFIED: "IDENTIFIED",
  CONFIRMED: "CONFIRMED",
  MITIGATED: "MITIGATED",
  RESOLVED: "RESOLVED",
  CLOSED_ARCHIVED: "CLOSED_ARCHIVED",
} as const;

export type ControlStateValue = (typeof ControlState)[keyof typeof ControlState];
/** Back-compat alias while server Prisma enum remains `ThreatState`. */
export const ThreatState = ControlState;
export type ThreatStateValue = ControlStateValue;

export const NotificationChannelType = {
  SLACK: "SLACK",
  TEAMS: "TEAMS",
  WEBHOOK: "WEBHOOK",
} as const;

export type NotificationChannelTypeValue =
  (typeof NotificationChannelType)[keyof typeof NotificationChannelType];

export const AgentOperationStatus = {
  PENDING: "PENDING",
  RETRYING: "RETRYING",
  CHAOS_INTERRUPTED: "CHAOS_INTERRUPTED",
  FAILED: "FAILED",
  COMPLETED: "COMPLETED",
  ESCALATED: "ESCALATED",
  EXTERNALLY_RESOLVED: "EXTERNALLY_RESOLVED",
} as const;

export type AgentOperationStatusValue =
  (typeof AgentOperationStatus)[keyof typeof AgentOperationStatus];
