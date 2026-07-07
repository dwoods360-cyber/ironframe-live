import { loadSuccessTeamEnv, getIngressConfig } from '../loadSuccessTeamEnv.js';

loadSuccessTeamEnv();

export type HealthSnapshot = {
  dealId: string;
  tenantId: string;
  contactId: string;
  stage: string;
  valueCents: string;
  industrySector: string | null;
  healthScore: number;
  healthBand: 'healthy' | 'watch' | 'at_risk' | 'critical';
  signals: string[];
  pilotMetadata: Record<string, unknown> | null;
  lastInteractionAt: string | null;
  daysSinceInteraction: number | null;
  polledAt: string;
};

export type HealthSnapshotResult =
  | { ok: true; snapshot: HealthSnapshot }
  | { ok: false; message: string };

export async function fetchHealthSnapshot(dealId: string): Promise<HealthSnapshotResult> {
  const { baseUrl, secret, targetTenantSlug } = getIngressConfig();
  if (!secret) {
    return { ok: false, message: 'SUCCESS_TEAM_INGRESS_SECRET not configured' };
  }

  const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/v1/ingress/success-team/health-snapshot`);
  url.searchParams.set('tenantSlug', targetTenantSlug);
  url.searchParams.set('dealId', dealId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { ok: false, message: `health snapshot ${response.status}: ${text.slice(0, 200)}` };
  }

  const data = (await response.json()) as { snapshot: HealthSnapshot };
  return { ok: true, snapshot: data.snapshot };
}
