/**
 * Integration tests: GET /api/dashboard tenant isolation (Backlog Item 3).
 * Proves cross-tenant bleed is closed: no tenant context → 401; Vaultbank context → only Vaultbank data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/dashboard/route';
import { TENANT_UUIDS } from '@/app/utils/tenantIsolation';

vi.mock('@/lib/prisma', () => ({
  default: {
    company: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
    activeRisk: {
      findMany: vi.fn(),
    },
    threatEvent: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

const MEDSHIELD_UUID = TENANT_UUIDS.medshield;
const VAULTBANK_UUID = TENANT_UUIDS.vaultbank;

const medshieldCompany = {
  id: 1n,
  name: 'Medshield Health',
  sector: 'Healthcare',
  industry_avg_loss_cents: 1110000000n,
  infrastructure_val_cents: 1520000000n,
  tenantId: MEDSHIELD_UUID,
  policies: [],
  risks: [],
};

const vaultbankCompany = {
  id: 2n,
  name: 'Vaultbank Global',
  sector: 'Finance',
  industry_avg_loss_cents: 590000000n,
  infrastructure_val_cents: 4250000000n,
  tenantId: VAULTBANK_UUID,
  policies: [],
  risks: [],
};

const vaultbankRisk = {
  id: 10n,
  company_id: 2n,
  title: 'SWIFT Gap',
  status: 'ACTIVE',
  score_cents: 900000000n,
  source: 'IRONTRUST',
  company: { name: 'Vaultbank Global', sector: 'Finance' },
};

const medshieldRisk = {
  id: 11n,
  company_id: 1n,
  title: 'PHI Exposure',
  status: 'ACTIVE',
  score_cents: 800000000n,
  source: 'IRONTRUST',
  company: { name: 'Medshield Health', sector: 'Healthcare' },
};

function buildRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/dashboard', {
    method: 'GET',
    headers: new Headers(headers),
  });
}

describe('GET /api/dashboard — Tenant Isolation', () => {
  beforeEach(() => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.threatEvent.findMany).mockResolvedValue([]);
  });

  it('The Breach Attempt: request without tenant context returns 401', async () => {
    const req = buildRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toHaveProperty('error');
    expect(String(body.error)).toMatch(/tenant| x-tenant-id /i);

    expect(prisma.company.findMany).not.toHaveBeenCalled();
    expect(prisma.activeRisk.findMany).not.toHaveBeenCalled();
  });

  it('The Breach Attempt: request with empty x-tenant-id returns 401', async () => {
    const req = buildRequest({ 'x-tenant-id': '   ' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toHaveProperty('error');
    expect(prisma.company.findMany).not.toHaveBeenCalled();
  });

  it('The Isolated Access: Vaultbank context returns only Vaultbank records (no cross-tenant bleed)', async () => {
    vi.mocked(prisma.company.findMany).mockImplementation(async (args) => {
      const tenantId = (args as { where: { tenantId: string } }).where?.tenantId;
      if (tenantId === VAULTBANK_UUID) return [vaultbankCompany];
      if (tenantId === MEDSHIELD_UUID) return [medshieldCompany];
      return [];
    });
    vi.mocked(prisma.activeRisk.findMany).mockImplementation(async (args) => {
      const tenantId = (args as { where: { company: { tenantId: string } } }).where?.company?.tenantId;
      if (tenantId === VAULTBANK_UUID) return [vaultbankRisk];
      if (tenantId === MEDSHIELD_UUID) return [medshieldRisk];
      return [];
    });

    const req = buildRequest({ 'x-tenant-id': VAULTBANK_UUID });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('companies');
    expect(body).toHaveProperty('risks');

    expect(Array.isArray(body.companies)).toBe(true);
    expect(body.companies).toHaveLength(1);
    expect(body.companies[0].name).toBe('Vaultbank Global');
    expect(body.companies[0].sector).toBe('Finance');

    expect(Array.isArray(body.risks)).toBe(true);
    expect(body.risks.every((r: { company: { name: string } }) => r.company.name === 'Vaultbank Global')).toBe(true);
    expect(body.risks.some((r: { company: { name: string } }) => r.company.name === 'Medshield Health')).toBe(false);

    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: VAULTBANK_UUID } })
    );
    expect(prisma.activeRisk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { company: { tenantId: VAULTBANK_UUID } } })
    );
  });
});
