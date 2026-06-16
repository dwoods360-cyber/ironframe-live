import { describe, expect, it, vi, afterEach } from 'vitest';

import {
  CORE_TELEMETRY_DISCONNECTED,
  buildTelemetryFetchHeaders,
  fetchIronframeSharedContext,
  formatLiveSystemTelemetryBlock,
  resolveTelemetryTenantScope,
} from './coreTelemetryBridge.js';

describe('coreTelemetryBridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.IRONFRAME_CORE_ORIGIN;
  });

  it('formats the live telemetry delimiter block', () => {
    const block = formatLiveSystemTelemetryBlock('{"tenantId":"abc"}');
    expect(block).toContain('[LIVE SYSTEM TELEMETRY - ARCHITECTURE ENFORCED]');
    expect(block).toContain('{"tenantId":"abc"}');
  });

  it('forwards incoming cookies and host tenant headers', () => {
    const headers = buildTelemetryFetchHeaders({
      incomingRequest: {
        headers: {
          cookie: 'ironframe-tenant=vaultbank; sb-access-token=opaque',
        },
      },
    });
    expect(headers.Cookie).toContain('ironframe-tenant=vaultbank');
    expect(headers['x-ironframe-host-tenant-slug']).toBe('vaultbank');
  });

  it('injects tenantId from body when cookie is absent', () => {
    const tenantId = '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01';
    expect(
      resolveTelemetryTenantScope({
        incomingRequest: { headers: {} },
        tenantId,
      }),
    ).toBe(tenantId);

    const headers = buildTelemetryFetchHeaders({
      incomingRequest: { headers: {} },
      tenantId,
    });
    expect(headers.Cookie).toBe(`ironframe-tenant=${tenantId}`);
    expect(headers['x-ironframe-host-tenant-uuid']).toBe(tenantId);
  });

  it('throws CORE_TELEMETRY_DISCONNECTED when core fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({ ok: false, error: 'UNAUTHORIZED_ACCESS: Tenant isolation boundary breached or context missing.' }),
      })),
    );

    await expect(
      fetchIronframeSharedContext({
        incomingRequest: { headers: {} },
        tenantId: '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01',
      }),
    ).rejects.toMatchObject({
      code: CORE_TELEMETRY_DISCONNECTED,
    });
  });

  it('returns JSON body on successful core fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => '{"tenantId":"5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01","systemStatus":"ARCHITECTURE ENFORCED"}',
      })),
    );

    const result = await fetchIronframeSharedContext({
      incomingRequest: { headers: {} },
      tenantId: '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01',
    });
    expect(result.jsonBody).toContain('ARCHITECTURE ENFORCED');
  });
});
