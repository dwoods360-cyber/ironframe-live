import { listCatalogTenantIds } from "@/app/lib/server/cronTenantScope";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";

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
  const tenantIds = await listCatalogTenantIds();
  let totalChanges = 0;
  let latestAt: Date | null = null;
  const operators = new Set<string>();

  for (const tenantId of tenantIds) {
    const where = { tenantId, action: { in: actions } };
    const [count, latest, operatorGroups] = await withIronguardTenant(tenantId, (tx) =>
      Promise.all([
        tx.auditLog.count({ where }),
        tx.auditLog.findFirst({
          where,
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        tx.auditLog.groupBy({
          by: ["operatorId"],
          where,
        }),
      ]),
    );
    totalChanges += count;
    if (latest && (!latestAt || latest.createdAt > latestAt)) {
      latestAt = latest.createdAt;
    }
    for (const group of operatorGroups) {
      operators.add(group.operatorId);
    }
  }

  return {
    totalChanges,
    lastModified: latestAt?.toISOString() ?? null,
    authorizedOperators: [...operators].sort(),
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
  const tenantIds = await listCatalogTenantIds();
  const rows: NotificationConfigAuditRow[] = [];

  for (const tenantId of tenantIds) {
    const slice = await withIronguardTenant(tenantId, (tx) =>
      tx.auditLog.findMany({
        where: { tenantId, action: { in: actions } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          action: true,
          justification: true,
          operatorId: true,
          createdAt: true,
        },
      }),
    );
    rows.push(
      ...slice.map((r) => ({
        id: r.id,
        action: r.action,
        justification: r.justification,
        operatorId: r.operatorId,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  }

  return rows
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}
