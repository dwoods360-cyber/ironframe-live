"use server";

import {
  getNotificationAuditSummary,
  getRecentNotificationConfigEdits,
  type NotificationAuditSummary,
  type NotificationConfigAuditRow,
} from "@/app/utils/notificationAuditSummary";

/** Client-callable: summary for Control Room badge + Board prep. */
export async function fetchNotificationAuditSummary(): Promise<NotificationAuditSummary> {
  return getNotificationAuditSummary();
}

/** Client-callable: last N config rows for `ConfigChangeWidget` (Phase 2 Board Report). */
export async function fetchRecentNotificationConfigEdits(limit = 3): Promise<NotificationConfigAuditRow[]> {
  return getRecentNotificationConfigEdits(limit);
}
