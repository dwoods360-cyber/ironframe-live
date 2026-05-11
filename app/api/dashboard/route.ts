import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { getDashboardPayloadForTenant } from '@/app/actions/dashboardActions';
import { assertIronguardApiTenantOr403 } from '@/app/lib/security/ironguardApiGuard';
import { isClientDisconnectError } from '@/app/utils/isClientDisconnectError';

/** Never statically cache this route — dashboard must reflect live DB (assignee, risks, logs). */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// TAS-COMPLIANT: Safely serializes BigInt to exact Strings to prevent floating-point drift
const serializeBigInt = (obj: unknown): unknown => {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
};

/**
 * GET /api/dashboard — tenant-scoped data for the dashboard. Requires x-tenant-id header (UUID).
 * Threat rows come from `getDashboardPayloadForTenant` (non-terminal `ThreatState`, incl. DMZ pipeline,
 * Irontech Chaos drills (`ingestionDetails` JSON: `isChaosTest`, `entityType: CHAOS_DRILL`), and bot ingress).
 * With `SHADOW_PLANE_ACTIVE`, ingress writes `ThreatEvent` so Chaos aligns with this strip (see `ingressUsesRiskEventTable`).
 * `ThreatEvent` has no top-level `incident_type` column — Chaos / Infrastructure drift use `ingestionDetails` JSON (`incident_type: CHAOS`, `category: INFRASTRUCTURE`, `isChaosTest`, `CHAOS_DRILL`); `getDashboardPayloadForTenant` merges legacy Chaos rows from `RiskEvent` when shadow + simulation cookie.
 * Ironguard: {@link assertIronguardApiTenantOr403} — shadow/simulation mismatch bypass per TAS §5.
 */
export async function GET(request: NextRequest) {
  noStore();
  try {
    void request.headers.get('sec-fetch-mode');

    if (request.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }

    const guard = await assertIronguardApiTenantOr403(request);
    if (!guard.ok) {
      return guard.response;
    }

    const activeTenantUuid = guard.tenantUuid;

    const data = await getDashboardPayloadForTenant(activeTenantUuid);
    return NextResponse.json(serializeBigInt(data), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    });
  } catch (e) {
    if (isClientDisconnectError(e) || request.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    console.error('[api/dashboard]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
