/**
 * Iteration 2.1: $10M GRC Ingestion Gate — API lock.
 * Integration test: POST /api/threats/ingest with $10M threat and no justification returns 400.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockCookiesGet = vi.fn();
const mockCookiesSet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: mockCookiesGet,
    set: mockCookiesSet,
  })),
  headers: vi.fn(async () => ({
    get: vi.fn(),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  unstable_noStore: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    threatEvent: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/app/actions/threatActions', () => ({
  acknowledgeThreatAction: vi.fn(),
}));

vi.mock('@/src/services/orchestration/ingestBusBridge', () => ({
  ingestOrchestrationBusDisabled: vi.fn(() => true),
  invokeIngestOrchestrationBus: vi.fn(),
}));

vi.mock('@/app/lib/security/ingressGateway', () => ({
  ingressUsesRiskEventTable: vi.fn(async () => false),
}));

vi.mock('@/app/utils/serverTenantContext', () => ({
  getActiveTenantUuidFromCookies: vi.fn(),
  isValidTenantUuid: (v: string | null | undefined): v is string =>
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim()),
}));

import prisma from '@/lib/prisma';
import { POST } from '@/app/api/threats/ingest/route';
import { acknowledgeThreatAction } from '@/app/actions/threatActions';
import { getActiveTenantUuidFromCookies } from '@/app/utils/serverTenantContext';
import { TENANT_UUIDS } from '@/app/utils/tenantIsolation';

const SAMPLE_TENANT = TENANT_UUIDS.medshield;

function buildIngestRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest('http://localhost/api/threats/ingest', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      'x-tenant-id': SAMPLE_TENANT,
      ...headers,
    }),
    body: JSON.stringify(body),
  });
}

describe('POST /api/threats/ingest — GRC gate', () => {
  beforeEach(() => {
    mockCookiesGet.mockReturnValue(undefined);
    vi.mocked(prisma.threatEvent.findUnique).mockResolvedValue(null);
    vi.mocked(acknowledgeThreatAction).mockResolvedValue({ success: true });
    vi.mocked(getActiveTenantUuidFromCookies).mockResolvedValue(SAMPLE_TENANT);
  });

  it('returns 400 when threatId is missing', async () => {
    const req = buildIngestRequest({ tenantId: SAMPLE_TENANT, operatorId: 'test-user' });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Missing threatId/i);
  });

  it('returns 401 when ironguard tenant scope is missing from the request', async () => {
    const req = new NextRequest('http://localhost/api/threats/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threatId: 'threat-10m', operatorId: 'test-user' }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(String(body.error)).toMatch(/tenant|Unauthorized|required/i);
  });

  it('returns 400 when threat is $10M and justification is missing', async () => {
    vi.mocked(prisma.threatEvent.findUnique).mockResolvedValue({
      financialRisk_cents: BigInt(1_000_000_000),
      status: 'IDENTIFIED',
      createdAt: new Date(),
      ingestionDetails: null,
      targetEntity: 'Healthcare',
    } as any);

    const req = buildIngestRequest({
      threatId: 'threat-10m',
      tenantId: SAMPLE_TENANT,
      operatorId: 'test-user',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/GRC Violation|50\+ character justification/i);
    expect(acknowledgeThreatAction).not.toHaveBeenCalled();
  });

  it('returns 400 when threat is $10M and justification is under 50 characters', async () => {
    vi.mocked(prisma.threatEvent.findUnique).mockResolvedValue({
      financialRisk_cents: BigInt(1_000_000_000),
      status: 'IDENTIFIED',
      createdAt: new Date(),
      ingestionDetails: null,
      targetEntity: 'Healthcare',
    } as any);

    const req = buildIngestRequest({
      threatId: 'threat-10m',
      tenantId: SAMPLE_TENANT,
      justification: 'Too short',
      operatorId: 'test-user',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/GRC Violation|50\+ character justification/i);
    expect(acknowledgeThreatAction).not.toHaveBeenCalled();
  });

  it('succeeds when threat is $10M and justification has 50+ characters', async () => {
    vi.mocked(prisma.threatEvent.findUnique).mockResolvedValue({
      financialRisk_cents: BigInt(1_000_000_000),
      status: 'IDENTIFIED',
      createdAt: new Date(),
      ingestionDetails: null,
      targetEntity: 'Healthcare',
    } as any);

    const req = buildIngestRequest({
      threatId: 'threat-10m',
      tenantId: SAMPLE_TENANT,
      justification:
        'This is a sufficiently long note to satisfy the GRC 50-character minimum requirement.',
      operatorId: 'test-user',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(acknowledgeThreatAction).toHaveBeenCalledWith(
      'threat-10m',
      SAMPLE_TENANT,
      'test-user',
      expect.stringContaining('sufficiently long'),
      { shadowPlaneIngestBot: false },
    );
  });
});
