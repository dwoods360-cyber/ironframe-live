import { loadSupportTeamEnv, getIngressConfig } from '../loadSupportTeamEnv.js';

loadSupportTeamEnv();

export type SupportContextSnapshot = {
  tenantId: string;
  tenantSlug: string;
  billingStatus: string | null;
  openThreatCount: number;
  ironguardViolationCount7d: number;
  frameworkContext: string | null;
  capturedAt: string;
};

export type ContextSnapshotResult =
  | { ok: true; snapshot: SupportContextSnapshot }
  | { ok: false; message: string };

export async function fetchSupportContextSnapshot(
  tenantSlug: string,
): Promise<ContextSnapshotResult> {
  const { baseUrl, secret } = getIngressConfig();
  if (!secret) {
    return { ok: false, message: 'SUPPORT_TEAM_INGRESS_SECRET not configured' };
  }

  const url = new URL(
    `${baseUrl.replace(/\/$/, '')}/api/v1/ingress/support-team/context-snapshot`,
  );
  url.searchParams.set('tenantSlug', tenantSlug);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { ok: false, message: `context ingress ${response.status}: ${text.slice(0, 200)}` };
  }

  const snapshot = (await response.json()) as SupportContextSnapshot;
  return { ok: true, snapshot };
}
