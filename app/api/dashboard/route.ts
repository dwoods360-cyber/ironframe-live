import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { getDashboardPayloadForTenant } from '@/app/actions/dashboardActions';

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

/** GET /api/dashboard — tenant-scoped data for the dashboard. Requires x-tenant-id header (UUID). */
export async function GET(request: NextRequest) {
  noStore();
  try {
    // Touch request headers so the handler stays fully dynamic (tenant + cache-bust behavior).
    void request.headers.get('x-tenant-id');
    void request.headers.get('sec-fetch-mode');

    const activeTenantUuid = request.headers.get('x-tenant-id')?.trim() || null;

    if (!activeTenantUuid) {
      return NextResponse.json(
        { error: 'Tenant context required. Send x-tenant-id header (tenant UUID).' },
        { status: 401 }
      );
    }

    const data = await getDashboardPayloadForTenant(activeTenantUuid);
    return NextResponse.json(serializeBigInt(data), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    });
  } catch (e) {
    console.error('[api/dashboard]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
