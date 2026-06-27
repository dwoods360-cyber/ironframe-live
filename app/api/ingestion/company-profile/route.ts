import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { canUsePlatformAdminTools } from '@/app/lib/auth/platformAdminAccess';
import {
  assertTenantBillingActive,
  TenantBillingHoldError,
  tenantBillingHoldJsonResponse,
} from '@/app/lib/billing/tenantBillingEntitlement';
import {
  ingressSanitizerFailureResponse,
  sanitizeIngressPayload,
} from '@/app/lib/ironethic/ingressSanitizer';
import {
  companyProfileIngressSchema,
  type CompanyProfileIngressPayload,
} from '@/app/lib/ingress/companyProfileIngressSchema';
import { syncCompanyProfileFromIngress } from '@/app/lib/ingress/syncCompanyProfileFromIngress';
import { getActiveTenantUuidFromCookies, isValidTenantUuid } from '@/app/utils/serverTenantContext';
import { isShadowPlaneActiveFromEnv } from '@/app/utils/shadowPlaneActive';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function shadowPlaneActive(request: NextRequest): boolean {
  if (isShadowPlaneActiveFromEnv()) return true;
  return request.cookies.get('ironframe-simulation-mode')?.value === '1';
}

function tenantUuidFromHeader(request: NextRequest): string | null {
  const raw = request.headers.get('x-tenant-id')?.trim();
  return raw && isValidTenantUuid(raw) ? raw : null;
}

function formatZodError(err: ZodError): { path: string; message: string }[] {
  return err.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * POST /api/ingestion/company-profile
 * Upserts primary Company (+ optional Department seeds) for a tenant workspace.
 */
export async function POST(request: NextRequest) {
  try {
    const headerTenant = tenantUuidFromHeader(request);
    let tenantId = headerTenant;
    if (shadowPlaneActive(request)) {
      tenantId = headerTenant ?? (await getActiveTenantUuidFromCookies());
    } else if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required. Send x-tenant-id header (tenant UUID).' },
        { status: 401 },
      );
    }

    const platformAdmin = await canUsePlatformAdminTools();
    try {
      await assertTenantBillingActive(tenantId!, { platformAdminBypass: platformAdmin });
    } catch (err) {
      if (err instanceof TenantBillingHoldError) {
        return tenantBillingHoldJsonResponse(err);
      }
      throw err;
    }

    let rawBody: unknown;
    try {
      rawBody = sanitizeIngressPayload(await request.json().catch(() => ({})));
    } catch (err) {
      const pepperFailure = ingressSanitizerFailureResponse(err);
      if (pepperFailure) {
        return NextResponse.json(pepperFailure.body, { status: pepperFailure.status });
      }
      throw err;
    }

    let validated: CompanyProfileIngressPayload;
    try {
      validated = companyProfileIngressSchema.parse(rawBody);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'VALIDATION_FAILED', issues: formatZodError(err) },
          { status: 422 },
        );
      }
      throw err;
    }

    if (validated.tenantId.toLowerCase() !== tenantId!.toLowerCase()) {
      return NextResponse.json(
        { error: 'Tenant mismatch: body.tenantId must match x-tenant-id header.' },
        { status: 403 },
      );
    }

    const result = await syncCompanyProfileFromIngress(tenantId!, validated);

    return NextResponse.json(
      {
        ok: true,
        schemaVersion: validated.schemaVersion,
        companyId: result.companyId.toString(),
        upserted: !result.created,
        created: result.created,
        departmentsSynced: result.departmentsSynced,
        companyName: validated.companyName,
        sector: validated.sector,
        ...(validated.industryAvgLossCents != null
          ? { industryAvgLossCents: validated.industryAvgLossCents }
          : {}),
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === 'TENANT_NOT_FOUND') {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
    }
    console.error('[api/ingestion/company-profile POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
