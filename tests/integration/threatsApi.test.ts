/**
 * Integration tests: POST /api/threats — Constitutional Architecture.
 * Proves: (1) Breach Attempt — no x-tenant-id → 401; (2) BigInt integrity — loss string saves and returns minted record; (3) Isolation — returned record strictly belongs to tenant in headers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/threats/route';
import { TENANT_UUIDS } from '@/app/utils/tenantIsolation';

vi.mock('@/lib/prisma', () => ({
  default: {
    threatEvent: {
      create: vi.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

const MEDSHIELD_UUID = TENANT_UUIDS.medshield;
const VAULTBANK_UUID = TENANT_UUIDS.vaultbank;

function buildRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest('http://localhost:3000/api/threats', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
    body: JSON.stringify(body),
  });
}

describe('POST /api/threats — Threat Ingress API', () => {
  beforeEach(() => {
    vi.mocked(prisma.threatEvent.create).mockReset();
  });

  it('The Breach Attempt: POST without valid x-tenant-id header returns 401 Unauthorized', async () => {
    const req = buildRequest(
      { title: 'Test Threat', loss: '500000000' }
      // no x-tenant-id
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toHaveProperty('error');
    expect(String(data.error)).toMatch(/tenant|x-tenant-id|required|Unauthorized/i);
    expect(prisma.threatEvent.create).not.toHaveBeenCalled();
  });

  it('The Breach Attempt: POST with empty x-tenant-id returns 401', async () => {
    const req = buildRequest(
      { title: 'Test Threat', loss: '500000000' },
      { 'x-tenant-id': '   ' }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toHaveProperty('error');
    expect(prisma.threatEvent.create).not.toHaveBeenCalled();
  });

  it('The BigInt Integrity Check: POST with loss as string "500000000" saves and returns minted record', async () => {
    const mintedId = 'clxyz123minted';
    vi.mocked(prisma.threatEvent.create).mockResolvedValue({
      id: mintedId,
      title: 'Ransomware Indicator',
      sourceAgent: 'Manual Analyst Entry',
      score: 8,
      targetEntity: 'Healthcare',
      financialRisk_cents: BigInt(500_000_000),
      status: 'PIPELINE',
    } as any);

    const req = buildRequest(
      {
        title: 'Ransomware Indicator',
        loss: '500000000',
        source: 'Manual Analyst Entry',
        target: 'Healthcare',
      },
      { 'x-tenant-id': MEDSHIELD_UUID }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('id', mintedId);
    expect(data).toHaveProperty('name', 'Ransomware Indicator');
    expect(data).toHaveProperty('loss'); // 5.0 ($5M in millions)
    expect(data.loss).toBe(5);
    expect(data).toHaveProperty('score', 8);
    expect(data).toHaveProperty('industry', 'Healthcare');
    expect(data).toHaveProperty('source', 'Manual Analyst Entry');

    expect(prisma.threatEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Ransomware Indicator',
          financialRisk_cents: BigInt(500_000_000),
          sourceAgent: 'Manual Analyst Entry',
          targetEntity: 'Healthcare',
        }),
      })
    );
  });

  it('The Isolation Check: returned record strictly belongs to the tenant ID passed in headers', async () => {
    const mintedId = 'cliso999isolated';
    vi.mocked(prisma.threatEvent.create).mockResolvedValue({
      id: mintedId,
      title: 'Isolation Test Threat',
      sourceAgent: 'Manual',
      score: 8,
      targetEntity: 'Finance',
      financialRisk_cents: BigInt(100_000_000),
      status: 'PIPELINE',
    } as any);

    const req = buildRequest(
      { title: 'Isolation Test Threat', source: 'Manual', target: 'Finance', loss: '100000000' },
      { 'x-tenant-id': VAULTBANK_UUID }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('id', mintedId);
    expect(data).toHaveProperty('tenantId', VAULTBANK_UUID);
    expect(data.tenantId).toBe(VAULTBANK_UUID);
  });
});
