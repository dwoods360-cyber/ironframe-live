import "server-only";

import type { OperationsHubSnapshot, WorkforceServiceStatus } from "@/app/lib/server/operationsHubCore";
import type { SuccessTeamPortalSnapshot } from "@/app/lib/server/operationsTeamPortalsCore";
import type { IronboardEngineHealthSnapshot } from "@/app/lib/server/ironboardEngineHealth";
import type { IronleadsPortalSnapshot } from "@/app/lib/server/operationsTeamPortalsCore";
import type {
  SalesTeamPortalSnapshot,
  SupportIntakePortalSnapshot,
} from "@/app/lib/server/operationsTeamPortalsCore";

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

/**
 * Server-resolved CRM scope for perimeter ops portals — never accept tenant slug/id from clients.
 * Production (VERCEL_ENV=production) requires IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG — no silent medshield fallback.
 * Used by Success / Support portals (pilot CRM). Not used by SalesTeam (see resolveSalesTeamCrmScopeSlug).
 */
export function resolveOperationsCrmScopeSlug(): string {
  const configured = process.env.IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG?.trim().toLowerCase();
  if (configured && /^[a-z0-9-]+$/.test(configured)) {
    return configured;
  }
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.IRONFRAME_REQUIRE_OPERATIONS_CRM_SCOPE === "1"
  ) {
    throw new Error(
      "IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG is not set. Set it to an existing tenant slug (e.g. pilot1) in Vercel Production.",
    );
  }
  return "medshield";
}

/**
 * SalesTeam / design-partner outreach CRM — always prospect-pool unless overridden.
 * Must not reuse IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG (pilot/medshield); that empties the PROSPECT queue
 * while Cloud Run SALESTEAM_TARGET_TENANT_SLUG correctly targets prospect-pool.
 */
export function resolveSalesTeamCrmScopeSlug(): string {
  const configured = process.env.SALESTEAM_TARGET_TENANT_SLUG?.trim().toLowerCase();
  if (configured && /^[a-z0-9-]+$/.test(configured)) {
    return configured;
  }
  return "prospect-pool";
}

export type RedactedWorkforceServiceStatus = Omit<
  WorkforceServiceStatus,
  "healthUrl" | "consoleUrl"
>;

export type RedactedOperationsHubSnapshot = Omit<
  OperationsHubSnapshot,
  "briefings" | "workforce"
> & {
  briefings: Omit<OperationsHubSnapshot["briefings"], "published"> & {
    published: Array<
      Omit<OperationsHubSnapshot["briefings"]["published"][number], "tenantId">
    >;
  };
  workforce: RedactedWorkforceServiceStatus[];
};

function stripTenantUuidTokens(value: string): string {
  return value.replace(UUID_RE, "[workspace]");
}

export function redactWorkforceServiceStatus(
  service: WorkforceServiceStatus,
): RedactedWorkforceServiceStatus {
  const { healthUrl: _healthUrl, consoleUrl: _consoleUrl, ...rest } = service;
  return rest;
}

export function redactOperationsHubSnapshot(
  snapshot: OperationsHubSnapshot,
): RedactedOperationsHubSnapshot {
  return {
    ...snapshot,
    briefings: {
      ...snapshot.briefings,
      published: snapshot.briefings.published.map(({ tenantId: _tenantId, ...row }) => row),
    },
    newsletters: {
      ...snapshot.newsletters,
      editions: snapshot.newsletters.editions.map(({ htmlPath, ...row }) => ({
        ...row,
        htmlPath: htmlPath ? "[server-artifact]" : null,
      })),
    },
    workforce: snapshot.workforce.map((service) => redactWorkforceServiceStatus(service)),
    quickLinks: snapshot.quickLinks.filter(
      (link) =>
        !link.href.startsWith("/dashboard/support") &&
        !link.href.includes("/api/v1/ingress/support-team"),
    ),
  };
}

export function redactIronleadsPortalSnapshot(
  snapshot: IronleadsPortalSnapshot,
): Omit<IronleadsPortalSnapshot, "worker"> & {
  worker: Omit<IronleadsPortalSnapshot["worker"], "healthUrl">;
} {
  const { healthUrl: _healthUrl, ...worker } = snapshot.worker;
  return {
    ...snapshot,
    worker,
  };
}

export function redactSuccessTeamPortalSnapshot(
  snapshot: SuccessTeamPortalSnapshot,
): Omit<SuccessTeamPortalSnapshot, "tenantSlug" | "accounts" | "healthByDealId"> & {
  crmScope: string;
  accounts: Array<Omit<SuccessTeamPortalSnapshot["accounts"][number], "tenantId">>;
  healthByDealId: Record<
    string,
    Omit<SuccessTeamPortalSnapshot["healthByDealId"][string], "tenantId">
  >;
} {
  const { tenantSlug: _tenantSlug, accounts, healthByDealId, ...rest } = snapshot;
  const redactedHealth: Record<string, Omit<SuccessTeamPortalSnapshot["healthByDealId"][string], "tenantId">> =
    {};

  for (const [dealId, health] of Object.entries(healthByDealId)) {
    const { tenantId: _tenantId, ...healthRest } = health;
    redactedHealth[dealId] = healthRest;
  }

  return {
    ...rest,
    crmScope: "platform-default",
    accounts: accounts.map(({ tenantId: _tenantId, ...account }) => account),
    healthByDealId: redactedHealth,
  };
}

export function redactSalesTeamPortalSnapshot(
  snapshot: SalesTeamPortalSnapshot,
): Omit<SalesTeamPortalSnapshot, "worker" | "prospects"> & {
  crmScope: string;
  worker: Omit<SalesTeamPortalSnapshot["worker"], "healthUrl">;
  prospects: Array<Omit<SalesTeamPortalSnapshot["prospects"][number], "tenantId">>;
} {
  const { healthUrl: _healthUrl, ...worker } = snapshot.worker;
  return {
    generatedAt: snapshot.generatedAt,
    crmScope: "platform-default",
    worker,
    prospects: snapshot.prospects.map(({ tenantId: _tenantId, ...prospect }) => prospect),
    polledAt: snapshot.polledAt,
  };
}

export function redactSupportIntakePortalSnapshot(
  snapshot: SupportIntakePortalSnapshot,
): Omit<SupportIntakePortalSnapshot, "worker" | "intakes"> & {
  crmScope: string;
  worker: Omit<SupportIntakePortalSnapshot["worker"], "healthUrl">;
  intakes: Array<
    Omit<SupportIntakePortalSnapshot["intakes"][number], "tenantId" | "contactId">
  >;
} {
  const { healthUrl: _healthUrl, ...worker } = snapshot.worker;
  return {
    generatedAt: snapshot.generatedAt,
    crmScope: "platform-default",
    worker,
    approvalQueueDepth: snapshot.approvalQueueDepth,
    intakes: snapshot.intakes.map(({ tenantId: _t, contactId: _c, ...intake }) => intake),
    polledAt: snapshot.polledAt,
  };
}

export function redactIronboardEngineHealthSnapshot(
  snapshot: IronboardEngineHealthSnapshot,
): Omit<IronboardEngineHealthSnapshot, "healthUrl" | "upstreamBase"> & {
  healthUrl: null;
  upstreamBase: null;
} {
  return {
    ...snapshot,
    healthUrl: null,
    upstreamBase: null,
    error: snapshot.error ? stripTenantUuidTokens(snapshot.error) : null,
  };
}
