/**
 * Iteration 2.1: $10M GRC Ingestion Gate — API lock.
 * Integration test: POST /api/threats/ingest with $10M threat and no justification returns 400.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/threats/ingest/route';

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

import prisma from '@/lib/prisma';
import { acknowledgeThreatAction } from '@/app/actions/threatActions';

describe('POST /api/threats/ingest — GRC gate', () => {
  beforeEach(() => {
    vi.mocked(prisma.threatEvent.findUnique).mockResolvedValue(null);
    vi.mocked(acknowledgeThreatAction).mockResolvedValue({ success: true });
  });

  it('returns 400 when threatId is missing', async () => {
    const req = new NextRequest('http://localhost/api/threats/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01', operatorId: 'test-user' }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Missing threatId/i);
  });

  it('returns 400 when tenantId is missing', async () => {
    const req = new NextRequest('http://localhost/api/threats/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threatId: 'threat-10m', operatorId: 'test-user' }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Missing tenantId|Zero-Trust/i);
  });

  it('returns 400 when threat is $10M and justification is missing', async () => {
    vi.mocked(prisma.threatEvent.findUnique).mockResolvedValue({
      financialRisk_cents: BigInt(1_000_000_000),
    } as any);

    const req = new NextRequest('http://localhost/api/threats/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threatId: 'threat-10m', tenantId: '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01', operatorId: 'test-user' }),
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
    } as any);

    const req = new NextRequest('http://localhost/api/threats/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threatId: 'threat-10m',
        tenantId: '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01',
        justification: 'Too short',
        operatorId: 'test-user',
      }),
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
    } as any);

    const req = new NextRequest('http://localhost/api/threats/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threatId: 'threat-10m',
        tenantId: '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01',
        justification: 'This is a sufficiently long note to satisfy the GRC 50-character minimum requirement.',
        operatorId: 'test-user',
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(acknowledgeThreatAction).toHaveBeenCalledWith(
      'threat-10m',
      '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01',
      'test-user',
      expect.stringContaining('sufficiently long')
    );
  });
});
