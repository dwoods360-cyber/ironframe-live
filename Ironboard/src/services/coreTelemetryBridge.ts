import type { Request } from 'express';

import { resolveBoardOrgTenantId } from './crm/strategicIntelIngress.js';

export const CORE_TELEMETRY_DISCONNECTED = 'CORE_TELEMETRY_DISCONNECTED' as const;
export const LIVE_SYSTEM_TELEMETRY_DELIMITER = '[LIVE SYSTEM TELEMETRY - ARCHITECTURE ENFORCED]';
export const IRONFRAME_SHARED_CONTEXT_PATH = '/api/board/shared-context';

const TENANT_COOKIE_NAME = 'ironframe-tenant';
const DEFAULT_CORE_ORIGIN = 'http://127.0.0.1:3000';
const FETCH_TIMEOUT_MS = 12_000;

export type CoreTelemetryBridgeInput = {
  incomingRequest: Pick<Request, 'headers'>;
  tenantId?: string;
};

export type CoreTelemetryBridgeResult = {
  jsonBody: string;
  status: number;
};

export function resolveIronframeCoreOrigin(): string {
  const fromEnv =
    process.env.IRONFRAME_CORE_ORIGIN?.trim() ||
    process.env.IRONFRAME_MARKETING_ORIGIN?.trim() ||
    '';
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return DEFAULT_CORE_ORIGIN;
}

export function formatLiveSystemTelemetryBlock(jsonPayload: string): string {
  return `${LIVE_SYSTEM_TELEMETRY_DELIMITER}\n${jsonPayload.trim()}`;
}

function readCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader?.trim()) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rest] = part.split('=');
    if (rawKey?.trim() === name) {
      const value = rest.join('=').trim();
      return value || undefined;
    }
  }
  return undefined;
}

/** Resolve tenant slug or UUID for outbound ironframe-tenant cookie / host headers. */
export function resolveTelemetryTenantScope(input: CoreTelemetryBridgeInput): string {
  const fromCookie = readCookieValue(
    typeof input.incomingRequest.headers.cookie === 'string'
      ? input.incomingRequest.headers.cookie
      : undefined,
    TENANT_COOKIE_NAME,
  );
  if (fromCookie) return fromCookie;

  const fromBody = input.tenantId?.trim();
  if (fromBody) return fromBody;

  return resolveBoardOrgTenantId();
}

export function buildTelemetryFetchHeaders(input: CoreTelemetryBridgeInput): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'x-ironboard-telemetry-bridge': '1',
  };

  const incomingCookie =
    typeof input.incomingRequest.headers.cookie === 'string'
      ? input.incomingRequest.headers.cookie
      : '';
  const scopedTenant = resolveTelemetryTenantScope(input);

  if (incomingCookie.trim()) {
    headers.Cookie = incomingCookie;
  } else if (scopedTenant) {
    headers.Cookie = `${TENANT_COOKIE_NAME}=${scopedTenant}`;
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRe.test(scopedTenant)) {
    headers['x-ironframe-host-tenant-uuid'] = scopedTenant;
  } else {
    headers['x-ironframe-host-tenant-slug'] = scopedTenant.toLowerCase();
  }

  return headers;
}

export class CoreTelemetryBridgeError extends Error {
  readonly code = CORE_TELEMETRY_DISCONNECTED;

  constructor(message: string) {
    super(message);
    this.name = 'CoreTelemetryBridgeError';
  }
}

/**
 * Server-to-server fetch of Ironframe democratic shared context for boardroom synthesis.
 * Fails closed — callers must return HTTP 502 with CORE_TELEMETRY_DISCONNECTED.
 */
export async function fetchIronframeSharedContext(
  input: CoreTelemetryBridgeInput,
): Promise<CoreTelemetryBridgeResult> {
  const origin = resolveIronframeCoreOrigin();
  const url = `${origin}${IRONFRAME_SHARED_CONTEXT_PATH}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildTelemetryFetchHeaders(input),
      cache: 'no-store',
      signal: controller.signal,
    });

    const jsonBody = await response.text();
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(jsonBody) as { error?: string };
        if (parsed.error?.trim()) detail = parsed.error.trim();
      } catch {
        if (jsonBody.trim()) detail = jsonBody.trim().slice(0, 240);
      }
      throw new CoreTelemetryBridgeError(
        `${CORE_TELEMETRY_DISCONNECTED}: Ironframe shared-context rejected (${detail}).`,
      );
    }

    if (!jsonBody.trim()) {
      throw new CoreTelemetryBridgeError(
        `${CORE_TELEMETRY_DISCONNECTED}: Ironframe shared-context returned an empty body.`,
      );
    }

    return { jsonBody: jsonBody.trim(), status: response.status };
  } catch (err) {
    if (err instanceof CoreTelemetryBridgeError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new CoreTelemetryBridgeError(
        `${CORE_TELEMETRY_DISCONNECTED}: Ironframe core timed out after ${FETCH_TIMEOUT_MS}ms.`,
      );
    }
    const message = err instanceof Error ? err.message : 'unknown fetch fault';
    throw new CoreTelemetryBridgeError(
      `${CORE_TELEMETRY_DISCONNECTED}: Could not reach Ironframe core at ${url} (${message}).`,
    );
  } finally {
    clearTimeout(timer);
  }
}
