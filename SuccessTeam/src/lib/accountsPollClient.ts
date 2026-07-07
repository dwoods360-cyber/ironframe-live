import { loadSuccessTeamEnv, getIngressConfig } from '../loadSuccessTeamEnv.js';

loadSuccessTeamEnv();

export type AccountRecord = {
  dealId: string;
  contactId: string;
  tenantId: string;
  stage: string;
  dealTitle: string;
  valueCents: string;
  company: string;
  fullName: string;
  email: string;
  phone: string | null;
  industrySector: string | null;
  updatedAt: string;
  lastInteractionAt: string | null;
  daysSinceInteraction: number | null;
};

export type AccountsPollResult =
  | { ok: true; tenantId: string; accounts: AccountRecord[]; polledAt: string }
  | { ok: false; message: string };

export async function pollAccountsQueue(limit = 50): Promise<AccountsPollResult> {
  const { baseUrl, secret, targetTenantSlug } = getIngressConfig();
  if (!secret) {
    return { ok: false, message: 'SUCCESS_TEAM_INGRESS_SECRET not configured' };
  }

  const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/v1/ingress/success-team/accounts`);
  url.searchParams.set('tenantSlug', targetTenantSlug);
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { ok: false, message: `accounts poll ${response.status}: ${text.slice(0, 200)}` };
  }

  const data = (await response.json()) as {
    tenantId: string;
    accounts: AccountRecord[];
    polledAt: string;
  };

  return {
    ok: true,
    tenantId: data.tenantId,
    accounts: data.accounts ?? [],
    polledAt: data.polledAt,
  };
}
