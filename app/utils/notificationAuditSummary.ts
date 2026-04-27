import prisma from "@/lib/prisma";

/** AuditLog.action values that count as notification / webhook configuration changes (Board Report prep). */
export const NOTIFICATION_CONFIG_AUDIT_ACTIONS = [
  "GLOBAL_NOTIFICATIONS",
  "WEBHOOK_MODIFIED",
  "NOTIFICATION_ENDPOINT_CREATED",
  "NOTIFICATION_ENDPOINT_DELETED",
  "NOTIFICATION_ENDPOINT_TOGGLED",
] as const;

export type NotificationAuditSummary = {
  totalChanges: number;
  lastModified: string | null;
  authorizedOperators: string[];
};

/**
 * Board Report prep: aggregate configuration churn for global notifications and webhook registry.
 */
export async function getNotificationAuditSummary(): Promise<NotificationAuditSummary> {
  const actions = [...NOTIFICATION_CONFIG_AUDIT_ACTIONS];
  const where = { action: { in: actions } };

  const [totalChanges, latest, operatorGroups] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.auditLog.groupBy({
      by: ["operatorId"],
      where,
    }),
  ]);

  return {
    totalChanges,
    lastModified: latest?.createdAt.toISOString() ?? null,
    authorizedOperators: operatorGroups.map((g) => g.operatorId).sort(),
  };
}

export type NotificationConfigAuditRow = {
  id: string;
  action: string;
  justification: string | null;
  operatorId: string;
  createdAt: string;
};

export async function getRecentNotificationConfigEdits(limit = 3): Promise<NotificationConfigAuditRow[]> {
  const actions = [...NOTIFICATION_CONFIG_AUDIT_ACTIONS];
  const rows = await prisma.auditLog.findMany({
    where: { action: { in: actions } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      justification: true,
      operatorId: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    justification: r.justification,
    operatorId: r.operatorId,
    createdAt: r.createdAt.toISOString(),
  }));
}
