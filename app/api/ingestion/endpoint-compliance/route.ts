import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { canUsePlatformAdminTools } from '@/app/lib/auth/platformAdminAccess';
import {
  assertTenantBillingActive,
  TenantBillingHoldError,
  tenantBillingHoldJsonResponse,
} from '@/app/lib/billing/tenantBillingEntitlement';
import { grcGatePass } from '@/app/utils/grcGate';
import { getActiveTenantUuidFromCookies, isValidTenantUuid } from '@/app/utils/serverTenantContext';
import { isShadowPlaneActiveFromEnv } from '@/app/utils/shadowPlaneActive';
import {
  ingressSanitizerFailureResponse,
  sanitizeIngressPayload,
} from '@/app/lib/ironethic/ingressSanitizer';
import { sanitizeThreatIngressPayload } from '@/app/lib/ironethic/sanitizeThreatIngressPayload';
import type { EndpointComplianceIngressPayload } from '@/app/lib/ingress/endpointComplianceIngressSchema';
import { parseEndpointComplianceIngress } from '@/app/lib/ingress/normalizeFlatEndpointCompliancePayload';
import { mapEndpointComplianceToThreatEvent } from '@/app/lib/ingress/mapEndpointComplianceToThreatEvent';
import { assertSimulationInjectAllowedForTenant } from '@/app/lib/simulationStandDown';
import {
  ingestOrchestrationBusDisabled,
  invokeIngestOrchestrationBus,
} from '@/src/services/orchestration/ingestBusBridge';

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
 * POST /api/ingestion/endpoint-compliance
 * Canonical typed ingress for MDM/EDR/SIEM endpoint compliance signals → ThreatEvent (pipeline).
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

    let validated: EndpointComplianceIngressPayload;
    const parsed = parseEndpointComplianceIngress(rawBody, tenantId!);
    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          issues: formatZodError(parsed.error),
        },
        { status: 422 },
      );
    }
    validated = parsed.data;

    if (validated.tenantId.toLowerCase() !== tenantId!.toLowerCase()) {
      return NextResponse.json(
        {
          error: 'Tenant mismatch: body.tenantId must match x-tenant-id header.',
        },
        { status: 403 },
      );
    }

    const financialRiskCents = BigInt(validated.financialRiskCents ?? '0');
    if (!grcGatePass(financialRiskCents, validated.justification ?? '')) {
      return NextResponse.json(
        {
          error:
            'GRC gate: financialRiskCents at or above $10M requires justification of at least 50 characters.',
        },
        { status: 422 },
      );
    }

    try {
      await assertSimulationInjectAllowedForTenant(tenantId!);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('SIMULATION_STAND_DOWN')) {
        return NextResponse.json({ error: err.message }, { status: 423 });
      }
      throw err;
    }

    const mapped = mapEndpointComplianceToThreatEvent(validated);
    const existing = await prisma.threatEvent.findUnique({
      where: { ingestion_fingerprint: mapped.ingestion_fingerprint },
      select: {
        id: true,
        title: true,
        sourceAgent: true,
        targetEntity: true,
        financialRisk_cents: true,
        status: true,
        ingestionDetails: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          id: existing.id,
          idempotentReplay: true,
          title: existing.title,
          source: existing.sourceAgent,
          target: existing.targetEntity,
          financialRiskCents: existing.financialRisk_cents.toString(),
          lifecycleState: 'pipeline',
          status: existing.status,
          ingestionDetails: existing.ingestionDetails ?? undefined,
        },
        { status: 200 },
      );
    }

    const company = await prisma.company.findFirst({
      where: { tenantId: tenantId! },
      select: { id: true },
    });

    const created = await prisma.threatEvent.create({
      data: sanitizeThreatIngressPayload({
        ...mapped,
        tenantCompanyId: company?.id,
      }),
      select: {
        id: true,
        title: true,
        sourceAgent: true,
        targetEntity: true,
        financialRisk_cents: true,
        score: true,
        status: true,
        ingestionDetails: true,
      },
    });

    const busBody = rawBody as Record<string, unknown>;
    let orchestrationBus: Awaited<ReturnType<typeof invokeIngestOrchestrationBus>> | undefined;
    if (tenantId && !ingestOrchestrationBusDisabled(busBody)) {
      orchestrationBus = await invokeIngestOrchestrationBus(
        {
          tenantId: tenantId!,
          threatId: created.id,
          rawPayload: {
            type: 'ENDPOINT_COMPLIANCE',
            text: mapped.aiReport,
            source: created.sourceAgent,
            title: created.title,
            target: created.targetEntity,
            telemetryType: validated.sourceType,
            healthBarPercent: 100,
          },
          threadId: created.id,
        },
        { body: busBody },
      );
    }

    revalidatePath('/');
    revalidatePath('/integrity');

    const headers = new Headers();
    headers.set('X-Ironframe-Client-Refresh', '1');

    return NextResponse.json(
      {
        id: created.id,
        idempotentReplay: false,
        title: created.title,
        source: created.sourceAgent,
        target: created.targetEntity,
        score: created.score,
        financialRiskCents: created.financialRisk_cents.toString(),
        lifecycleState: 'pipeline',
        status: created.status,
        schemaVersion: validated.schemaVersion,
        ingestionDetails: created.ingestionDetails ?? undefined,
        ...(orchestrationBus?.ok
          ? {
              orchestrationBus: {
                lane: orchestrationBus.lane,
                status: orchestrationBus.status,
                routingTarget: orchestrationBus.routingTarget,
              },
            }
          : orchestrationBus && !orchestrationBus.ok
            ? { orchestrationBusError: orchestrationBus.error }
            : {}),
      },
      { status: 201, headers },
    );
  } catch (e) {
    console.error('[api/ingestion/endpoint-compliance POST]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
